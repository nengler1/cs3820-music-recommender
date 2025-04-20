import sqlite3
import pandas as pd

def merge_recommendations(conn):
    CF_recs = pd.read_sql_query("SELECT user_id, track_id, score FROM Collaborative_Recommendations", conn)
    CBF_recs = pd.read_sql_query("SELECT user_id, track_id, score FROM Content_Recommendations", conn)
    merged_recs = pd.merge(CBF_recs, CF_recs, on=["user_id", "track_id"], how="outer", suffixes=("_content_based", "_collaborative"))
    merged_recs["score"] = merged_recs[["score_content_based", "score_collaborative"]].mean(axis=1)
    merged_recs = merged_recs.drop_duplicates(subset=["user_id", "track_id"])
    return merged_recs

def store_recommendations(merged_recs, conn):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM Merged_Recommendations")  # Clear old entries
    conn.commit()
    for index, row in merged_recs.iterrows():
        cursor.execute("INSERT INTO Merged_Recommendations (user_id, track_id, score) VALUES (?, ?, ?)", (row['user_id'], row['track_id'], row['score']))
    conn.commit()

def update_saved_column_for_recommendations(conn):
    saved_tracks = pd.read_sql_query("SELECT u.id AS user_id, st.track_id, st.spotify_id FROM Saved_Tracks st JOIN Users u ON st.spotify_id = u.spotify_id", conn)
    saved_combinations = set(zip(saved_tracks["user_id"], saved_tracks["track_id"]))
    cursor = conn.cursor()
    merged_recs = pd.read_sql_query("SELECT user_id, track_id FROM Merged_Recommendations", conn)
    for _, row in merged_recs.iterrows():
        user_id = row["user_id"]
        track_id = row["track_id"]
        if (user_id, track_id) in saved_combinations:
            saved_value = 1
        else:
            saved_value = 0
        cursor.execute("UPDATE Merged_Recommendations SET saved = ? WHERE user_id = ? AND track_id = ?", (saved_value, user_id, track_id))
    conn.commit()
    cursor.close()


db_path = "jsapp/sqlite3.db"
recs_per_user = 50
conn = sqlite3.connect(db_path)
merged_recs = merge_recommendations(conn)
store_recommendations(merged_recs, conn)
update_saved_column_for_recommendations(conn)
conn.close()