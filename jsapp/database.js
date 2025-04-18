const sqlite3 = require('sqlite3').verbose()

// Create database connection
const db = new sqlite3.Database('./sqlite3.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err){
        console.error("Database Connection Error:", err)
    } else { 
        console.log("Connected to the SQLite database.")
    }
        
})

// Create Tables
db.serialize(() => {
    // user
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        spotify_id TEXT UNIQUE,
        name TEXT
    );
    `)

    // admins
    db.run(`CREATE TABLE IF NOT EXISTS Admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'author'))
    );
    `)
    
    // playlists
    db.run(`CREATE TABLE IF NOT EXISTS Playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        user_id INTEGER,
        cover_image TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `)

    // tracks
    db.run(`CREATE TABLE IF NOT EXISTS Track (
        spotify_id VARCHAR(50) PRIMARY KEY,
        album_id INTEGER REFERENCES Album(spotify_id) ON DELETE SET NULL,
        track_name VARCHAR(255),
        acousticness FLOAT,
        danceability FLOAT,
        duration_ms INTEGER,
        energy FLOAT,
        explicit BOOLEAN NOT NULL DEFAULT FALSE,
        instrumentalness FLOAT,
        key INTEGER,
        liveness FLOAT,
        loudness FLOAT,
        mode INTEGER,
        popularity INTEGER,
        speechiness FLOAT,
        tempo FLOAT,
        valence FLOAT
    );
    `)

    // track artist linking table
    db.run(`CREATE TABLE IF NOT EXISTS Track_artist (
        track_id VARCHAR(50) REFERENCES Track(spotify_id) ON DELETE CASCADE,
        artist_id INTEGER REFERENCES Artist(spotify_id) ON DELETE CASCADE,
        PRIMARY KEY (track_id, artist_id)
    );
    `)


    db.run(`CREATE TABLE IF NOT EXISTS Artist (
        spotify_id VARCHAR(50) PRIMARY KEY,
        artist_name VARCHAR(255) NOT NULL
    );
    `)

    db.run(`CREATE TABLE IF NOT EXISTS Album (
        spotify_id VARCHAR(50) PRIMARY KEY,
        ablum_name VARCHAR(255),
        album_cover VARCHAR(255)
    );
    `)

    // saved tracks
    db.run(`CREATE TABLE IF NOT EXISTS Saved_Tracks (
        user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
        track_id VARCHAR(50) REFERENCES Track(spotify_id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, track_id)
    );
    `)

    // collaborative reccomendations
    db.run(`CREATE TABLE IF NOT EXISTS Collaborative_Recommendations (
        user_id INTEGER REFERENCES Users(id),
        track_id TEXT REFERENCES Track(spotify_id),
        score REAL,
        PRIMARY KEY (user_id, track_id)
    );
    `)

    // content reccomendations
    db.run(`CREATE TABLE IF NOT EXISTS Content_Recommendations (
        user_id INTEGER REFERENCES Users(id),
        track_id TEXT REFERENCES Track(spotify_id),
        score REAL,
        PRIMARY KEY (user_id, track_id)
    );`)

    // alter table
    /*
    db.run(`ALTER TABLE Track 
        ADD COLUMN artist_name VARCHAR(255)
    ;`)
    db.run(`ALTER TABLE Track 
        ADD COLUMN album_name VARCHAR(255)
    ;`)
    db.run(`ALTER TABLE Track 
        ADD COLUMN album_cover VARCHAR(255)
    ;`)
    db.run(`ALTER TABLE Track
        ADD COLUMN artist_id VARCHAR(255)
    ;`)
    */
})

module.exports = db