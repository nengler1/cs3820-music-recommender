import os
import spotipy

from django.core.management.base import BaseCommand
from dotenv import load_dotenv
from recommender.models import Song
from spotipy.oauth2 import SpotifyClientCredentials


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--name', type=str, required=True, help="Name of the track")
        parser.add_argument('--year', type=int, required=True, help="Year of the track")

    def handle(self, *args, **options):
        load_dotenv()
        client_id = os.getenv("SPOTIFY_CLIENT_ID")
        client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        if not client_id or not client_secret:
            self.stderr.write("Missing Spotify credentials in environment.")
            return
        
        sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(client_id=client_id, client_secret=client_secret))
        
        track_name = options['name']
        year = options['year']
        self.stdout.write(f"Searching for track: {track_name} ({year})")
        results = sp.search(q=f"track:{track_name} year:{year}", limit=1)
        if not results['tracks']['items']:
            self.stderr.write("No track found.")
            return
        track = results['tracks']['items'][0]
        track_id = track['id']

        try:
            audio_features = sp.audio_features(track_id)[0]
        except Exception as e:
            self.stderr.write(f"Error retrieving audio features for track {track_id}: {e}")
            audio_features = {
                "danceability": None,
                "energy": None,
                "acousticness": None,
                "instrumentalness": None,
                "liveness": None,
                "speechiness": None,
                "valence": None,
                "tempo": None,
                "loudness": None,
                "key": None,
                "mode": None,
            }
        # Create or update the Song record
        song, created = Song.objects.update_or_create(
            name=track_name,
            year=year,
            defaults={
                "explicit": track.get("explicit", False),
                "duration_ms": track.get("duration_ms", 0),
                "popularity": track.get("popularity", 0),
                "spotify_track_id": track_id,
                "danceability": audio_features.get("danceability"),
                "energy": audio_features.get("energy"),
                "acousticness": audio_features.get("acousticness"),
                "instrumentalness": audio_features.get("instrumentalness"),
                "liveness": audio_features.get("liveness"),
                "speechiness": audio_features.get("speechiness"),
                "valence": audio_features.get("valence"),
                "tempo": audio_features.get("tempo"),
                "loudness": audio_features.get("loudness"),
                "key": audio_features.get("key"),
                "mode": audio_features.get("mode"),
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created song: {song}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated song: {song}"))
