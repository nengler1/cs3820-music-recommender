import sqlite3


def delete_recommendations_tables(db_connection):
    cursor = db_connection.cursor()
    cursor.execute("DROP TABLE IF EXISTS Collaborative_Recommendations")
    cursor.execute("DROP TABLE IF EXISTS Content_Recommendations")
    cursor.execute("DROP TABLE IF EXISTS Merged_Recommendations")
    # cursor.execute("DROP TABLE IF EXISTS SimilarTrack")
    # cursor.execute("DROP TABLE IF EXISTS Pairwise_User_Similarity")
    cursor.execute("DROP TABLE IF EXISTS User_Similarity")
    db_connection.commit()

def recreate_recommendation_tables(db_connection):
    cursor = db_connection.cursor()
    cursor.execute("CREATE TABLE User_Similarity (user1_id INTEGER, user2_id INTEGER, similarity REAL, PRIMARY KEY (user1_id, user2_id))")
    cursor.execute("CREATE TABLE Collaborative_Recommendations (user_id INTEGER, track_id INTEGER, score REAL, PRIMARY KEY (user_id, track_id))")
    cursor.execute("CREATE TABLE Content_Recommendations (user_id INTEGER, track_id INTEGER, score REAL, PRIMARY KEY (user_id, track_id))")
    cursor.execute("CREATE TABLE Merged_Recommendations (user_id INTEGER, track_id INTEGER, score REAL, saved INTEGER, PRIMARY KEY (user_id, track_id))")
    db_connection.commit()


db_path = "jsapp/sqlite3.db"
db_connection = sqlite3.connect(db_path)
delete_recommendations_tables(db_connection)
recreate_recommendation_tables(db_connection)
db_connection.close()