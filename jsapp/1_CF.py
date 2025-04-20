import sqlite3
import pandas as pd
import numpy as np
from itertools import combinations
from collections import defaultdict


def load_user_track_data(db_connection):
    user_ids = pd.read_sql_query("SELECT id, spotify_id FROM Users", db_connection) # Get User's id and Spotify id
    saved_tracks = pd.read_sql_query("SELECT spotify_id, track_id FROM Saved_Tracks", db_connection)
    saved_tracks_by_userid = pd.merge(saved_tracks, user_ids, on='spotify_id', how = 'inner')
    user_saved_tracks_dict = saved_tracks_by_userid.groupby("id")["track_id"].apply(set).to_dict()
    saved_tracks_by_userid['user_id'] = saved_tracks_by_userid['id']
    saved_tracks_by_userid = saved_tracks_by_userid.drop(columns=['spotify_id', 'id'])
    saved_tracks_by_userid = saved_tracks_by_userid.astype({'user_id': 'int32'})  # Ensure user_id is of correct type
    return saved_tracks_by_userid, user_saved_tracks_dict

def compute_pairwise_user_similarity(user_saved_tracks_dict):
    similarities = []
    user_ids = list(user_saved_tracks_dict.keys())
    for user_1, user_2 in combinations(user_ids, 2):
        tracks_user_1 = user_saved_tracks_dict[user_1]
        tracks_user_2 = user_saved_tracks_dict[user_2]
        common_tracks = len(tracks_user_1.intersection(tracks_user_2))
        total_tracks = len(tracks_user_1.union(tracks_user_2))
        sim = common_tracks / total_tracks if total_tracks != 0 else 0.0
        similarities.append((user_1, user_2, sim))
    return similarities

def store_user_similarities(db_connection, similarities):
    user_similarity = pd.DataFrame(similarities, columns = ["user1_id", "user2_id", "similarity"])
    user_similarity.to_sql('User_Similarity', db_connection, if_exists='replace', index = False)

def build_user_track_matrix(saved_tracks):
    all_users = saved_tracks['user_id'].unique()
    all_tracks = saved_tracks['track_id'].unique()
    user_to_index = {user_id: index for index, user_id in enumerate(all_users)}
    track_to_index = {track_id: index for index, track_id in enumerate(all_tracks)}
    index_to_track = {index: track_id for track_id, index in track_to_index.items()}
    matrix = np.zeros((len(all_users), len(all_tracks)))
    for i, row in saved_tracks.iterrows():
        user_index = user_to_index[row['user_id']]
        track_index = track_to_index[row['track_id']]
        matrix[user_index][track_index] = 1.0
    return matrix, all_users, user_to_index, index_to_track

def load_user_similarity_map(db_connection):
    user_similarity = pd.read_sql_query("SELECT * FROM User_Similarity", db_connection)
    similarity_map = defaultdict(list)
    for i, row in user_similarity.iterrows():
        similarity_map[row['user1_id']].append((row['user2_id'], row['similarity']))
        similarity_map[row['user2_id']].append((row['user1_id'], row['similarity']))
    return similarity_map

def compute_collaborative_recommendations(matrix, all_users, user_to_index, index_to_track, similarity_map, top_k_user_to_compare):
    recommendations = {}
    for user_id in all_users:
        neighbors = sorted(similarity_map.get(user_id, []), key=lambda x: x[1], reverse=True)[:top_k_user_to_compare]  # kNN
        if not neighbors:
            continue
        weighted = np.zeros(matrix.shape[1])
        sum_of_similarity_scores = 0
        for neighbor_id, similarity_score in neighbors:
            neighbor_index = user_to_index.get(neighbor_id)
            if neighbor_index is None:
                continue
            weighted += similarity_score * matrix[neighbor_index]
            sum_of_similarity_scores += similarity_score
        if sum_of_similarity_scores == 0:
            continue
        weighted /= sum_of_similarity_scores
        if np.all(weighted == 0):
            continue
        top_indices = np.argsort(weighted)[-recs_per_user:][::-1]
        top_tracks = [index_to_track[i] for i in top_indices]
        top_scores = weighted[top_indices]
        recommendations[user_id] = list(zip(top_tracks, top_scores))
        print(f"{len(top_tracks)} recommendations generated for User {user_id}")
    print(f"Recommendations for {len(recommendations)} users generated.")
    return recommendations

def store_collaborative_recommendations(db_connection, recommendations):
    CF_recommendations = []
    for user_id, items in recommendations.items():
        for track_id, score in items:
            CF_recommendations.append((user_id, track_id, score))
    recs_df = pd.DataFrame(CF_recommendations, columns=["user_id", "track_id", "score"])
    recs_df.to_sql('Collaborative_Recommendations', db_connection, if_exists = 'replace', index = False)


top_k_user_to_compare = 10
recs_per_user = 10000

db_path = "jsapp/sqlite3.db"
db_connection = sqlite3.connect(db_path)
saved_tracks, user_saved_tracks_dict = load_user_track_data(db_connection)
similarities = compute_pairwise_user_similarity(user_saved_tracks_dict)
store_user_similarities(db_connection, similarities)
matrix, all_users, user_to_index, index_to_track = build_user_track_matrix(saved_tracks)
similarity_map = load_user_similarity_map(db_connection)
recommendations = compute_collaborative_recommendations(matrix, all_users, user_to_index, index_to_track, similarity_map, top_k_user_to_compare)
store_collaborative_recommendations(db_connection, recommendations)
db_connection.close()