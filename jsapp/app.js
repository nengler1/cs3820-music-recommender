#!/usr/bin/env node

require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const SpotifyWebAPI = require('spotify-web-api-node')

const app = express()
const port = 3000

// session
const session = require('express-session')

app.use(session({
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: true
}))

const db = require('./database')

// parsing "application/x-www-form-urlencoded"
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.use(express.json())

// AI Features
const fs = require('fs')
const csv = require('csv-parser')

const track_features = new Map();
const artist_features = new Map();

function normalizeName(name) {
  return name?.toLowerCase().replace(/[\s\W]+/g, '');
}

function csvToMap(filePath, keyField, map, normalize) {
  return new Promise((resolve) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', row => {
        const key = normalize ? normalizeName(row[keyField]) : row[keyField]
        map.set(key, row)
      })
      .on('end', () => {
        console.log(`Loaded ${map.size} from ${filePath}`)
        resolve()
      })
  })
}

// Admin Features
const { authenticate, hashPassword } = require('./users') // hashing passwords in users.js

async function requireAuth(req, res, next){
	const user = await authenticate(req.headers.authorization)
    if(!user){
        res.setHeader("WWW-Authenticate", "Basic realm='Melofy Admin Access'")
        return res.status(401).json({error: "Unauthorized access"})
    }
    req.user = user
    next()
}

async function requireAdmin(req, res, next){
    await requireAuth(req, res, async () => {
        if(!req.user || req.user.role !== "admin"){
            return res.status(403).json({error: "Forbidden: Admins only"})
        }
        next()
    })
}

// API testing (for CS3110 class)
const dancers = []

app.get('/api', (req, res) => {
    const {who, x, y} = req.query
    if(who || x || y){
        const filteredDancers = dancers.filter(item =>
            item.who === who || item.x === x || item.y === y
        )
        if(filteredDancers.length > 0){
            return res.status(200).json(filteredDancers)
        } else {
            return res.status(404).json({error: "Dancer not found"})
        }
    }

    return res.status(200).json(dancers) // No query params, return all dancers
})

app.post('/api', requireAuth, (req, res) => {
    console.log("- WOAH IN POST")
    const {who, x, y} = req.body

    if(!who || !x || !y){
        return res.status(400).json({error: "Missing parameters"})
    }

    dancers.push({who, x, y})
    return res.status(201).json(dancers)
})

app.put('/api', requireAuth, (req, res) => {
    console.log("- IN PUT!!")
    const {who, x, y} = req.body

    if(!who || !x || !y){
        return res.status(400).json({error: "Missing parameters"})
    }

    const index = dancers.findIndex(dancer => dancer.who === who)
    if(index !== -1){
        dancers[index] = {who, x, y}
        return res.status(201).json(dancers)
    } else {
        return res.status(404).json({error: "Dancer not found"})
    }
})

app.delete('/api', requireAuth, (req, res) => {
    console.log("- IN DELETE!!")
    const {who} = req.body

    if(!who){
        return res.status(400).json({error: "Missing 'who' parameter"})
    }

    const index = dancers.findIndex(dancer => dancer.who === who)
    if(index !== -1){
        dancers.splice(index, 1)
        return res.status(200).json(dancers)
    } else {
        return res.status(404).json({error: "Dancer not found."})
    }
})

// admin API

// post a new user
app.post('/api/admin/users', requireAdmin, (req, res) => {
    const {username, password, role} = req.body
    if(!username || !password || !["admin", "author"].includes(role)){
        return res.status(400).json({error: "Invalid input"})
    }

    const hashed_password = hashPassword(password, username)
	const role_query = db.prepare(`INSERT INTO admins (username, hashed_password, role) VALUES (?, ?, ?)`)
    role_query.run(username, hashed_password, role, (err) => {
            if(err){
				return res.status(400).json({ error: "User already exists or database error" })
			}
            res.status(201).json({message: "User created", username, role})
        }
    )
})

// Get all users
app.get('/api/admin/users', requireAdmin, (req, res) => {
    db.all("SELECT id, username, role FROM admins", [], (err, rows) => {
        if(err) return res.status(500).json({ error: "Database error" })
        res.json(rows)
    })
})

// Update user role 
app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
    const { role } = req.body
    const { id } = req.params

    if(!["admin", "author"].includes(role)){
        return res.status(400).json({ error: "Invalid role" })
    }

    db.run(`UPDATE admins SET role = ? WHERE id = ?`, [role, id], function (err){
        if(err) return res.status(500).json({ error: "Database error" })
        res.json({ message: "User updated successfully" })
    });
});

// Delete user 
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params

    db.run(`DELETE FROM admins WHERE id = ?`, [id], function (err){
        if(err) return res.status(500).json({ error: "Database error" })
        res.json({ message: "User deleted successfully" })
    })
})

// Check if logged-in user is admin
app.get('/api/me', requireAuth, (req, res) => {
    res.json({ username: req.user.username, role: req.user.role })
})

// -- SPOTIFY INTEGRATION --

const spotifyAPI = new SpotifyWebAPI({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI
})

app.get('/api/login', (req, res) => {
	const scopes = [
		'user-read-private',
		'user-top-read',
		'user-library-read',
		'user-read-recently-played',
		'user-read-playback-position',
		'ugc-image-upload',
		'playlist-modify-public',
		'playlist-modify-private',
	]
	res.redirect(spotifyAPI.createAuthorizeURL(scopes, null, true))
})

/*
app.post('/api/login', async (req, res) => {
    const { spotifyId, name } = req.body;

    db.run(`INSERT INTO users (spotify_id, name) VALUES (?, ?) 
            ON CONFLICT(spotify_id) DO UPDATE SET name = excluded.name`, 
        [spotifyId, name], 
        function(err){
            if(err){
                return res.status(500).json({ error: "Database error" })
            }

            req.session.spotifyId = spotifyId;
            res.json({ message: "User logged in", spotifyId })
        }
    )
})
*/

app.get('/api/callback', async (req, res) => {
	console.log("REDIRECTED")
	const error = req.query.error
	const code = req.query.code

	if(error){
		console.error('Error:', error)
		res.send(`Error: ${error}`)
		return
	}
	
	try {
		const data = await spotifyAPI.authorizationCodeGrant(code)
		const accessToken = data.body.access_token
		const refreshToken = data.body.refresh_token

		spotifyAPI.setAccessToken(accessToken)
		spotifyAPI.setRefreshToken(refreshToken)

		req.session.accessToken = accessToken
		req.session.refreshToken = refreshToken

		const profile = await fetchWebApi('v1/me', accessToken)
		const spotifyID = profile.id
		const name = profile.display_name

		// storing user in database
		db.run(`INSERT INTO users (spotify_id, name) VALUES (?, ?) 
				ON CONFLICT(spotify_id) DO UPDATE SET name = excluded.name`, 
			[spotifyID, name], 
			function(err){
				if(err){
					return res.status(500).json({ error: "Database error" })
				}
			}
		)

		req.session.spotifyID = spotifyID
		res.redirect('/')
	} catch(error){
		console.error('Error:', error)
		res.send("Error getting token")
	}
})

const isAuthenticated = (req, res, next) => {
    if(req.session.spotifyID){
        return next()
    }
    return res.status(401).json({error: "You must be logged in to access this."})
}


app.get('/api/me/status', (req, res) => {
	if(req.session.accessToken){
		res.json({loggedIn: true})
	} else {
		res.json({loggedIn: false})
	}
})

async function fetchWebApi(endpoint, accessToken){
	try {
		const response = await fetch(`https://api.spotify.com/${endpoint}`, {
			headers: { Authorization: `Bearer ${accessToken}` }
		})
		return await response.json()
	} catch (error){
		console.error("Error:", error)
		res.status(500).json({ error: 'Internal server error' })
	}
}


app.get('/api/me/profile', isAuthenticated, async (req, res) => {
	const accessToken = req.session.accessToken
	if(!accessToken){
		return res.status(401).json({ message: 'Not logged in'})
	}

	const profile = await fetchWebApi('v1/me', accessToken)

	if(!profile.display_name){
        return res.status(500).json({ error: "Unable to fetch Spotify display name" })
    }

	const details = {
		name: profile.display_name,
		profileImage: profile.images[0]?.url || '',
		spotifyProfileLink: profile.href,
		followers: profile.followers?.total,
	}
	res.json(details)
})

app.get('/api/search-tracks/:track', isAuthenticated, async (req, res) => {
	const accessToken = req.session.accessToken
	if(!accessToken){
		return res.status(401).json({message: 'Not logged in'})
	}

	const track = req.params.track.replaceAll(" ", "+")
	if(!track){
		return res.status(404).json({message: 'No track found'})
	}

	const track_search = await fetchWebApi(`v1/search?q=${track}&type=track&limit=10`, accessToken)
	if(!track_search.tracks.items.length){
		return res.status(404).json({message: 'No tracks found'})
	}

	const tracks = track_search.tracks.items.map(track => ({
		name: track.name,
		artist: track.artists.map(artist => artist.name).join(", "),
		albumImage: track.album.images[0]?.url || '',
		popularity: track.popularity,
		uri: track.uri,
	}))

	res.json(tracks)
})


app.get('/api/me/top-tracks', async (req, res) => {
	const {time_range} = req.query

	const accessToken = req.session.accessToken
	if(!accessToken){
		return res.status(401).json({ message: 'Not logged in'})
	}

	try {
		const response = await fetch('https://api.spotify.com/v1/me/top/tracks', {
			headers: { Authorization: `Bearer ${accessToken}` }
		})

		if(!response.ok){
			const error = await response.json()
			return res.status(response.status).json({error})
		}

		const data = await response.json()
		const tracks = data.items.map(track => ({
			artist: track.artists.map(artist => artist.name).join(', '),
			name: track.name,
			album: track.album.name,
			albumImage: track.album.images[0]?.url,
			popularity: track.popularity
		}))
		console.log("Sent Tracks!")
		res.json(tracks)
	} catch (error){
		console.error("Error fetching top tracks:", error)
		res.status(500).json({ error: 'Internal server error' })
	}
})

// ENDPOINT FOR AI AND DATABASE
app.get('/api/me/saved-tracks', isAuthenticated, async (req, res) => {
	const accessToken = req.session.accessToken
	const userID = req.session.spotifyID
	if(!accessToken || !userID){
		return res.status(401).json({message: 'Not logged in'})
	}

	const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

	const all_tracks = []
	let offset = 0
	let finished = false

	try {
		while(!finished){
			// Spotify
			const sp_res = await fetch(`https://api.spotify.com/v1/me/tracks?limit=50&offset=${offset}`, {
				headers: { Authorization: `Bearer ${accessToken}` }
			  })
			
			if(sp_res.status === 429){
				const retry = parseInt(sp_res.headers.get('Retry-After') || '1') * 1000
				console.log(`Rate limited. Retrying in ${retry / 1000} seconds...`)
				await delay(retry)
				continue
			}

			const data = await sp_res.json()

			console.log(data)

			if (!data.items || data.items.length === 0){
				break
			}

			data.items.forEach(async item => {
				const track = item.track

				const audio = track_features.get(track.id)
				let fallback = null

				if(!audio){
					const norm_artist_name = normalizeName(track.artists[0].name)
					fallback = artist_features.get(norm_artist_name)
				}

				all_tracks.push({
					spotify_id: track.id,
					album_id: track.album.id,
					track_name: track.name,
					acousticness: parseFloat(audio?.acousticness || fallback?.acousticness) || null,
					danceability: parseFloat(audio?.danceability || fallback?.danceability) || null,
					duration: track.duration_ms,
					energy: parseFloat(audio?.energy || fallback?.energy) || null,
					explicit: track.explicit,
					instrumentalness: parseFloat(audio?.instrumentalness || fallback?.instrumentalness) || null,
					key: parseFloat(audio?.key || fallback?.key) || null,
					liveness: parseFloat(audio?.liveness || fallback?.liveness) || null,
					loudness: parseFloat(audio?.loudness || fallback?.loudness) || null,
					mode: parseFloat(audio?.mode || fallback?.mode) || null,
					popularity: track.popularity,
					speechiness: parseFloat(audio?.speechiness || fallback?.speechiness) || null,
					tempo: parseFloat(audio?.tempo || fallback?.tempo) || null,
					valence: parseFloat(audio?.valence || fallback?.valence) || null,
					artist: track.artists[0].name,
					artist_id: track.artists[0].id,
					album_name: track.album.name,
					album_image: track.album.images[0]?.url || '',
				})
			})

			offset += 50
			finished = data.items.length < 50

			await delay(5000) // 5 seconds
		}

		const saved_tracks_db = db.prepare(`
			INSERT OR IGNORE INTO Track (
			spotify_id, album_id, track_name, 
			acousticness, danceability, duration_ms, 
			energy, explicit, instrumentalness, 
			key, liveness, loudness, mode, popularity, 
			speechiness, tempo, valence, 
			artist_name, album_name, album_cover, artist_id
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`)

		const user_track_link = db.prepare(`
			INSERT OR IGNORE INTO Saved_Tracks (track_id, spotify_id)
			VALUES (?, ?)
		`)

		// NEED ARTIST NAME AND ALBUM COVER URL !!!
		all_tracks.forEach(track => {
			saved_tracks_db.run([
				track.spotify_id,
				track.album_id,
				track.track_name,
				track.acousticness,
				track.danceability,
				track.duration,
				track.energy,
				track.explicit,
				track.instrumentalness,
				track.key,
				track.liveness,
				track.loudness,
				track.mode,
				track.popularity,
				track.speechiness,
				track.tempo,
				track.valence,
				track.artist,
				track.artist_id,
				track.album_name,
				track.album_image,
			])

			user_track_link.run([
				track.spotify_id,
				userID,
			])
		})

		res.json({message: `Stored ${all_tracks.length} liked tracks`})

	} catch(err){
		console.error('Failed to fetch saved tracks:', err)
		res.status(500).json({error: 'Failed to fetch saved tracks'})
	}
})

/*
async function backfillTrackMetadata(access_token) {
	db.serialize(() => {
	  db.all(`
		SELECT spotify_id FROM Track
		WHERE artist_id IS NULL
	  `, async (err, rows) => {
		if (err) {
		  console.error("DB read error:", err)
		  return
		}
  
		for (const row of rows) {
		  const spotifyID = row.spotify_id
  
		  try {
			const response = await fetch(`https://api.spotify.com/v1/tracks/${spotifyID}`, {
			  headers: {
				Authorization: `Bearer ${access_token}`
			  }
			})
  
			if (response.status === 429) {
			  const retry = parseInt(response.headers.get('Retry-After') || '1') * 1000
			  console.log(`Rate limited. Waiting ${retry / 1000}s...`)
			  await new Promise(resolve => setTimeout(resolve, retry))
			  continue
			}
  
			if (!response.ok) {
			  console.warn(`Failed to fetch track ${spotifyID}:`, await response.text())
			  continue
			}
  
			const track = await response.json()
  
			const artistID = track.artists?.[0]?.id || null
  
			db.run(`
			  UPDATE Track
			  SET artist_id = ?
			  WHERE spotify_id = ?
			`, [artistID, spotifyID], (err) => {
			  if (err) {
				console.error(`Error updating ${spotifyID}:`, err.message)
			  } else {
				console.log(`Updated ${spotifyID}: ${artistID}`)
			  }
			})
  
			await new Promise(resolve => setTimeout(resolve, 700)) // delay to avoid hitting rate limits
		  } catch (err) {
			console.error(`Error processing ${spotifyID}:`, err)
		  }
		}
	  })
	})
  }
*/

// -- Playlist creation --

// create playlist
app.post('/api/playlists', isAuthenticated, (req, res) => {
	const {title, imageBase64} = req.body
	if(!title){
		return res.status(400).json({ message: 'No playlist title'})
	}

	const userID = req.session.spotifyID;

    db.run(`INSERT INTO Playlists (title, user_id, cover_image) VALUES (?, ?, ?)`, 
        [title, userID, imageBase64], 
        function(err){
            if(err){
				console.error(err)
				return res.status(500).json({ error: "Database error" })
			}
            res.status(201).json({ id: this.lastID, title })
        }
    )
})

// get all playlists for specific user
app.get('/api/playlists', isAuthenticated, (req, res) => {
    const userID = req.session.spotifyID;

    db.all(`SELECT * FROM Playlists WHERE user_id = ?`, 
        [userID], 
        (err, row) => {
            if(err || !row){
				console.error(err)
				return res.status(500).json({ error: "Database error" })
			}
            res.json(row)
        }
    )
})

// delete playlist (only if owner)
app.delete('/api/playlists/:id', isAuthenticated, (req, res) => {
    const playlistID = req.params.id;
    const userID = req.session.spotifyID;

    db.run(`DELETE FROM Playlists WHERE id = ? AND user_id = ?`, 
        [playlistID, userID], 
        function(err){
            if(err){
				console.error(err)
				return res.status(500).json({ error: "Database error" })
			}
            if(this.changes === 0){
				return res.status(403).json({error: "Unauthorized"})
			}

            res.json({message: "Playlist deleted"})
        }
    )
})
// -- Tracks w/ in playlists --

// add a track to playlist
app.post('/api/playlists/:id/tracks', isAuthenticated, (req, res) => {
    const { name, artist, uri } = req.body
    const playlistID = req.params.id
    const userID = req.session.spotifyID

    db.get(`SELECT * FROM Playlists WHERE id = ? AND user_id = ?`, 
        [playlistID, userID], 
        (err, playlist) => {
            if(err){
				console.error(err)
				return res.status(500).json({error: "Database error"})
			}
            if(!playlist) return res.status(403).json({error: "Unauthorized"})

            db.run(`INSERT INTO Tracks_for_Playlists (name, artist, uri, playlist_id) VALUES (?, ?, ?, ?)`, 
                [name, artist, uri, playlistID], 
                function(err){
                    if(err){
						console.error(err)
						return res.status(500).json({error: "Database error"})
					}
                    res.status(201).json({id: this.lastID, name, artist})
                }
            )
        }
    )
})

// get all tracks in a playlist
app.get('/api/playlists/:id/tracks', isAuthenticated, (req, res) => {
    const playlistID = req.params.id
    const userID = req.session.spotifyID

    db.get(`SELECT * FROM playlists WHERE id = ? AND user_id = ?`, 
        [playlistID, userID], 
        (err, playlist) => {
            if(err){
				console.error(err)
				return res.status(500).json({ error: "Database error" })
			}
            if(!playlist) return res.status(403).json({ error: "Unauthorized" })

            db.all(`SELECT * FROM Tracks_for_Playlists WHERE playlist_id = ?`, 
                [playlistID], 
                (err, tracks) => {
                    if(err) return res.status(500).json({ error: "Database error" })
                    res.json(tracks)
                }
            )
        }
    )
})

// delete track from playlist
app.delete('/api/playlists/:playlistID/tracks/:trackID', isAuthenticated, (req, res) => {
    const { playlistID, trackID } = req.params
    const userID = req.session.spotifyID

    db.get(`SELECT * FROM playlists WHERE id = ? AND user_id = ?`, 
        [playlistID, userID], 
        (err, playlist) => {
            if(err){
				console.error(err)
				return res.status(500).json({ error: "Database error" })
			}
            if(!playlist) return res.status(403).json({ error: "Unauthorized" })

            db.run(`DELETE FROM Tracks_for_Playlists WHERE id = ? AND playlist_id = ?`, 
                [trackID, playlistID], 
                function(err){
                    if(err) return res.status(500).json({ error: "Database error" })
                    if(this.changes === 0) return res.status(404).json({ error: "Track not found" })
                    res.json({ message: "Track deleted" })
                }
            )
        }
    )
})

app.post('/api/me/recommendations', (req, res) => {
	const userID = req.session.spotifyID
	let { title } = req.body
	const numResults = 50
	const image_base64 = process.env.SAMPLE_B64_IMAGE

	if(!title){
		title = "Melofy Recommended Playlist"
	}

	const query = `
		SELECT
            mr.user_id,
            u.name AS user_name,
			u.spotify_id,
            mr.track_id,
            t.track_name,
            t.artist_name,
            mr.score
        FROM Merged_Recommendations mr
        JOIN Users u ON mr.user_id = u.id
        JOIN Track t ON mr.track_id = t.spotify_id
		WHERE u.spotify_id = ?
		AND mr.saved = 0
        ORDER BY mr.score DESC
		LIMIT ?
	`

	db.all(query, [userID, numResults], (err, tracks) => {
		if(err){
			console.error('Query error:', err.message)
			return res.status(500).json({error: 'Failed to retrieve recommendations.'})
		}

		if(tracks.length === 0){
			return res.status(404).json({message: `No recommendations found for user.`})
		}

		const user_name = tracks[0].user_name
		const reccomendations = tracks.map(track => ({
			track_id: track.track_id,
			track_name: track.track_name,
			artist_name: track.artist_name,
			score: track.score
		}))

		db.run(`INSERT INTO Playlists (title, user_id, cover_image) VALUES (?, ?, ?)`,
			[title, userID, image_base64],
			function(err2){
				if(err2){
					console.error("Failed to create playlist:", err2.message)
					return res.status(500).json({error: "Failed to create playlist."})
				}

				const new_playlist_ID = this.lastID

				const insert_track = db.prepare(`
					INSERT INTO Tracks_for_Playlists (name, artist, uri, playlist_id)
					VALUES (?, ?, ?, ?)
				`)

				reccomendations.forEach(track => {
					const uri = `spotify:track:${track.track_id}`
					insert_track.run([track.track_name, track.artist_name, uri, new_playlist_ID])
				})

				insert_track.finalize()

				res.status(201).json({id: new_playlist_ID, title})
			}
		)
	})
})

// get the users playlist when given their id and the playlist id from database
const getUserPlaylist = (userID, playlistID, callback) => {
	db.get(`SELECT * FROM playlists WHERE id = ? AND user_id = ?`, 
        [playlistID, userID], 
        (err, playlist) => {
            if(err || !playlist){
				console.error(err)
				callback(null)
			}
            if(this.changes === 0){
				callback(null)
			}

			db.all(`SELECT * FROM Tracks_for_Playlists WHERE playlist_id = ?`,
				[playlistID], 
				(err2, tracks) => {
					if(err2){
						return res.status(500).json({error: "Database error: No tracks"})
					}

					playlist.tracks = tracks
					callback(playlist)
				}
			)
        }
    )
}



// export playlist to Spotify
app.post('/api/playlists/:id/export', isAuthenticated, async (req, res) => {
	const accessToken = req.session.accessToken
	if(!accessToken){
		return res.status(401).json({ message: 'Not logged in'})
	}

	const playlistID = req.params.id
    const userID = req.session.spotifyID

	// querying playlists
	getUserPlaylist(userID, playlistID, async (playlist) => {
		if(!playlist){
			return res.status(404).json({error: 'Playlist not found'})
		}
		// getting tracks
		const track_URIs = playlist.tracks.map(track => track.uri)
		if(track_URIs.length === 0){
			return res.status(400).json({error: 'No valid track URIs'});
		}

		// create playlist in Spotify
		const create_playlist_fetch = await fetch('https://api.spotify.com/v1/me/playlists', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				name: playlist.title,
				description: 'Created using Melofy',
				public: false
			})
		})
		const created_playlist = await create_playlist_fetch.json()
		if(!created_playlist.id){
			return res.status(500).json({error: 'Could not create Spotify playlist'})
		}

		// uploading user cover image
		if(playlist.cover_image){
			const image_upload_fetch = await fetch(`https://api.spotify.com/v1/playlists/${created_playlist.id}/images`, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Content-Type': 'image/jpeg',
				},
				body: playlist.cover_image
			})

			if(!image_upload_fetch.ok){
				const err = await image_upload_fetch.text()
				console.warn("Failed to upload playlist image:", err)
			}
		}

		// adding tracks to Spotfiy playlist
		const add_tracks_fetch = await fetch(`https://api.spotify.com/v1/playlists/${created_playlist.id}/tracks`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({uris: track_URIs})
		})

		const added_tracks = await add_tracks_fetch.json()

		if(added_tracks.error){
			return res.status(500).json({error: 'Failed to add tracks to Spotify playlist'})
		}
		return res.status(200).json({message: 'Playlist exported!', spotifyUrl: created_playlist.external_urls.spotify})
	})
})

Promise.all([
	csvToMap('data/mr_tracks_dataset.csv', 'id', track_features, false),
	csvToMap('data/data_by_artist.csv', 'artists', artist_features, true)
])
.then(() => {
	app.listen(port, () => {
		console.log(`Listening at port ${port}`)
	})
})