import sqlite3
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


def get_track_features(conn):
    query = f"""
        SELECT * FROM Track
        WHERE {" AND ".join(f"{col} IS NOT NULL" for col in features)}
    """
    tracks = pd.read_sql_query(query, conn)
    track_features_df = tracks[["spotify_id"] + features].set_index("spotify_id")
    track_features_df = track_features_df.fillna(0)  # Replace NaN with 0
    return track_features_df

def z_score_normalize(features):
    normalized_features = (features - features.mean()) / features.std()
    return normalized_features

def get_user_profiles(conn, normalized_features):
    query = "SELECT st.track_id, u.id AS user_id, st.spotify_id FROM Saved_Tracks st JOIN Users u ON st.spotify_id = u.spotify_id"
    saved_tracks = pd.read_sql_query(query, conn)
    saved_tracks['user_id'] = pd.to_numeric(saved_tracks['user_id'], errors='coerce')
    saved_tracks = saved_tracks.dropna(subset=['user_id'])
    user_profiles = {}
    for user_id in saved_tracks["user_id"].unique():
        user_tracks = saved_tracks[saved_tracks["user_id"] == user_id]["track_id"]
        user_track_features = normalized_features.loc[normalized_features.index.intersection(user_tracks)]
        if not user_track_features.empty:
            user_profiles[user_id] = user_track_features.mean()
    return user_profiles

def get_content_based_recommendations(user_profiles, normalized_features):
    for user_id, profile_vector in user_profiles.items():
        sims = cosine_similarity([profile_vector], normalized_features)[0]
        min_score = np.min(sims)
        max_score = np.max(sims)
        for i, sim in enumerate(sims):
            track_id = normalized_features.index[i]
            if pd.isna(user_id) or pd.isna(track_id):
                score = 0.0
            else:
                score = (sim - min_score) / (max_score - min_score) if max_score - min_score > 0 else 0.0
            user_id = int(user_id)  # Convert user_id to a standard Python int
            track_id = str(track_id)  # Ensure track_id is a string
            score = float(score)  # Ensure score is a float
            cursor = conn.cursor()
            cursor.execute("INSERT INTO Content_Recommendations (user_id, track_id, score) VALUES (?, ?, ?)", (user_id, track_id, score))
            conn.commit()


db_path = "jsapp/sqlite3.db"
features = ["acousticness", "danceability", "duration_ms", "energy", "instrumentalness", "key", "liveness", "loudness", "popularity", "speechiness", "tempo", "valence"]
recs_per_user = 50000

conn = sqlite3.connect(db_path)
track_features_df = get_track_features(conn)

normalized_features = z_score_normalize(track_features_df)
user_profiles = get_user_profiles(conn, normalized_features)

get_content_based_recommendations(user_profiles, normalized_features)
print("Finished.")
conn.close()