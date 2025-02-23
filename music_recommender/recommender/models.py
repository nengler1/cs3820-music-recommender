from django.db import models

class Song(models.Model):
    name = models.CharField(max_length=255)
    year = models.IntegerField()
    explicit = models.BooleanField(default=False)
    duration_ms = models.IntegerField()
    popularity = models.IntegerField()
    audio_features = models.JSONField(null=True, blank=True)
    spotify_track_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Audio feature fields
    danceability = models.FloatField(null=True, blank=True)
    energy = models.FloatField(null=True, blank=True)
    acousticness = models.FloatField(null=True, blank=True)
    instrumentalness = models.FloatField(null=True, blank=True)
    liveness = models.FloatField(null=True, blank=True)
    speechiness = models.FloatField(null=True, blank=True)
    valence = models.FloatField(null=True, blank=True)
    tempo = models.FloatField(null=True, blank=True)
    loudness = models.FloatField(null=True, blank=True)
    key = models.IntegerField(null=True, blank=True)
    mode = models.IntegerField(null=True, blank=True)
                              
    def __str__(self):
        return f"{self.name} ({self.year})"