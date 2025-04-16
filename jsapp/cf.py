import sqlite3
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
import os
import sys
import json

class CollaborativeFiltering:
    def __init__(self, db_path='sqlite3.db'):
        """
        Initialize the collaborative filtering model
        
        Args:
            db_path (str): Path to the SQLite database
        """
        self.db_path = db_path
        self.user_item_matrix = None
        self.user_similarity = None
        self.user_ids = None
        self.track_uris = None
        
    def load_data(self):
        """
        Load data from the SQLite database and create a user-item matrix
        """
        # Connect to the database
        conn = sqlite3.connect(self.db_path)
        
        # Query to get user_id and uri from saved_tracks
        query = "SELECT user_id, uri FROM saved_tracks"
        df = pd.read_sql_query(query, conn)
        
        # Close the connection
        conn.close()
        
        if df.empty:
            raise ValueError("No data found in the saved_tracks table")
        
        # Create a user-item matrix
        # Each row represents a user, each column represents a track
        # The value is 1 if the user has saved the track, 0 otherwise
        self.user_item_matrix = pd.pivot_table(
            df, 
            index='user_id', 
            columns='uri', 
            aggfunc='size', 
            fill_value=0
        )
        
        # Convert to binary (1 if user has saved the track, 0 otherwise)
        self.user_item_matrix = (self.user_item_matrix > 0).astype(int)
        
        # Store user_ids and track_uris for later use
        self.user_ids = self.user_item_matrix.index.tolist()
        self.track_uris = self.user_item_matrix.columns.tolist()
        
        # Convert to sparse matrix for efficiency
        self.user_item_matrix = csr_matrix(self.user_item_matrix.values)
        
        # Calculate user similarity matrix
        self.user_similarity = cosine_similarity(self.user_item_matrix)
        
        return self
    
    def get_recommendations(self, user_id, n_recommendations=10):
        """
        Get recommendations for a specific user
        
        Args:
            user_id (str): The ID of the user to get recommendations for
            n_recommendations (int): Number of recommendations to return
            
        Returns:
            list: List of track URIs recommended for the user
        """
        if self.user_item_matrix is None:
            self.load_data()
            
        # Check if user exists in the matrix
        if user_id not in self.user_ids:
            raise ValueError(f"User {user_id} not found in the database")
            
        # Get the index of the user
        user_idx = self.user_ids.index(user_id)
        
        # Get the user's saved tracks
        user_saved_tracks = self.user_item_matrix[user_idx].toarray().flatten()
        
        # Get similar users
        similar_users = self.user_similarity[user_idx]
        
        # Calculate recommendation scores
        # For each track, sum the similarity scores of users who have saved it
        # and haven't saved it by the target user
        recommendation_scores = np.zeros(len(self.track_uris))
        
        for i in range(len(self.track_uris)):
            # Skip tracks already saved by the user
            if user_saved_tracks[i] == 1:
                continue
                
            # Get users who have saved this track
            track_saved_by = self.user_item_matrix[:, i].toarray().flatten()
            
            # Calculate score based on similarity to users who saved this track
            recommendation_scores[i] = np.sum(similar_users * track_saved_by)
        
        # Get top N recommendations
        top_indices = np.argsort(recommendation_scores)[-n_recommendations:][::-1]
        recommended_tracks = [self.track_uris[i] for i in top_indices]
        
        return recommended_tracks
    
    def get_track_details(self, track_uris):
        """
        Get details for a list of track URIs from the database
        
        Args:
            track_uris (list): List of track URIs
            
        Returns:
            list: List of dictionaries containing track details
        """
        # Connect to the database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create a parameterized query
        placeholders = ','.join(['?' for _ in track_uris])
        query = f"SELECT name, artist, uri, popularity, album_image FROM saved_tracks WHERE uri IN ({placeholders})"
        
        # Execute the query
        cursor.execute(query, track_uris)
        tracks = cursor.fetchall()
        
        # Close the connection
        conn.close()
        
        # Format the results
        track_details = []
        for track in tracks:
            track_details.append({
                'name': track[0],
                'artist': track[1],
                'uri': track[2],
                'popularity': track[3],
                'album_image': track[4]
            })
            
        return track_details

# Example usage
if __name__ == "__main__":
    # Initialize the model
    cf = CollaborativeFiltering()
    
    try:
        # Load data
        cf.load_data()
        
        # Get user_id and number of recommendations from command line arguments
        if len(sys.argv) > 1:
            user_id = sys.argv[1]
            n_recommendations = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        else:
            # Default to the first user in the database if no arguments provided
            user_id = cf.user_ids[0]
            n_recommendations = 5
        
        # Get recommendations
        recommendations = cf.get_recommendations(user_id, n_recommendations=n_recommendations)
        
        # Get track details for the recommendations
        track_details = cf.get_track_details(recommendations)
        
        # Output as JSON
        print(json.dumps(track_details))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
