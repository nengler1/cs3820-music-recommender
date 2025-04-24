import pandas as pd
import sqlite3


def print_recommendations(db_connection, num_results):
    # Query each user's Merged_Recommendations and print each user's top (num_results) results
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
    df = pd.read_sql_query(query, db_connection)
    if df.empty:
        print("No recommendations found.")
    else:
        for user_id in df['user_id'].unique():
            user_recs = df[df['user_id'] == user_id]
            user_recs = user_recs.head(num_results)
            print(f"\nRecommendations for User {user_id} ({user_recs['user_name'].iloc[0]}):")
            print(user_recs[['score', 'artist_name', 'track_name']].to_string(index = False))
    db_connection.close()


db_path = "jsapp/sqlite3.db"
db_connection = sqlite3.connect(db_path)
num_results = 50
print_recommendations(db_connection, num_results)
