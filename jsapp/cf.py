import sqlite3
import pandas as pd
import numpy as np
from collections import defaultdict
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix

# database
db_path = "jsapp\sqlite3.db"
db = sqlite3.connect(db_path)
cursor = db.cursor()

saved_tracks = pd.read_sql_query("SELECT * FROM Saved_Tracks;", db)
#print(saved_tracks.head())

# dictionary for users associated tracks
user_tracks = defaultdict(set)
for _, row in saved_tracks.iterrows():
    user_tracks[row["user_id"]].add(row["track_id"])

users = list(user_tracks.keys())

# all unique tracks
all_tracks = sorted(set(saved_tracks["track_id"]))

# building one-hot vectors for each user across all tracks
user_vecs = {}
for user in users:
    vec = np.array([1 if track in user_tracks[user] else 0 for track in all_tracks])
    user_vecs[user] = vec


# finding similarites
similarities = []
for i, user1 in enumerate(users):
    for j, user2 in enumerate(users):
        if i >= j:
            continue
        vec1 = user_vecs[user1]
        vec2 = user_vecs[user2]
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        similarity = float(np.dot(vec1, vec2) / (norm1 * norm2)) if norm1 and norm2 else 0.0
        similarities.append((user1, user2, similarity))

similarity_scores_df = pd.DataFrame(similarities, columns=["user_1", "user_2", "similarity"])
print(similarity_scores_df)