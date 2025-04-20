import pandas as pd
import sqlite3


def display_top_recommendations(conn):
    df = pd.read_sql_query(f"SELECT f.user_id, u.name AS user_name, f.track_id, t.track_name, t.artist_name, f.score FROM Merged_Recommendations f JOIN Users u ON f.user_id = u.spotify_id JOIN Track t ON f.track_id = t.spotify_id ORDER BY f.score DESC LIMIT {recs_per_user}", conn)
    if df.empty:
        print("No combined recommendations found.")
    else:
        for user_id in df['user_id'].unique():
            user_recs = df[df['user_id'] == user_id]
            user_recs = user_recs.head(recs_per_user)
            print(f"\nRecommendations for User {user_id} ({user_recs['user_name'].iloc[0]}):")
            print(user_recs[['track_name', 'artist_name', 'score']].to_string(index=False))

def list_recommendations(conn, num_results):
    query = """
        SELECT
            mr.user_id,
            u.name AS user_name,
            mr.track_id,
            t.track_name,
            t.artist_name,
            mr.score
        FROM Merged_Recommendations mr
        JOIN Users u ON mr.user_id = u.id
        JOIN Track t ON mr.track_id = t.spotify_id
        ORDER BY mr.user_id, mr.score DESC
    """
    df = pd.read_sql_query(query, conn)
    if df.empty:
        print("No recommendations found.")
    else:
        for user_id in df['user_id'].unique():
            user_recs = df[df['user_id'] == user_id]
            user_recs = user_recs.head(num_results)
            print(f"\nRecommendations for User {user_id} ({user_recs['user_name'].iloc[0]}):")
            print(user_recs[['score', 'artist_name', 'track_name']].to_string(index=False))
    conn.close()


db_path = "jsapp/sqlite3.db"
recs_per_user = 50
conn = sqlite3.connect(db_path)
num_results = 20

display_top_recommendations(conn)
list_recommendations(conn, num_results)