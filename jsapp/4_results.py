import pandas as pd
import sqlite3


def list_recommendations(conn, num_results):
    query = """
        SELECT
            cr.user_id,
            u.name AS user_name,
            cr.track_id,
            t.track_name,
            t.artist_name,
            cr.score
        FROM Collaborative_Recommendations cr
        JOIN Users u ON cr.user_id = u.id
        JOIN Track t ON cr.track_id = t.spotify_id
        ORDER BY cr.user_id, cr.score DESC
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
conn = sqlite3.connect(db_path)
num_results = 20

list_recommendations(conn, num_results)