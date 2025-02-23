import os
from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

# Load your credentials from the .env file
load_dotenv()
client_id = os.getenv("SPOTIFY_CLIENT_ID")
client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")

# Initialize the Spotify client credentials manager
auth_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)

# Get a valid access token
access_token = auth_manager.get_access_token(as_dict=False)
print("Access Token:", access_token)
