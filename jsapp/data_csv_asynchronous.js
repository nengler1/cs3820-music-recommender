const fs = require('fs')
const sqlite3 = require('sqlite3').verbose()
const csv = require('csv-parser')

const db = require('./database')

// load both csv's into Maps for fast lookup
const track_features = new Map()
const artist_features = new Map()

function normalizeName(name) {
    return name?.toLowerCase().replace(/[\s\W]+/g, '')
  }

// loading the csvs to a Map 
function csvToMap(file_path, key_field, map, normalize = false, callback){
    fs.createReadStream(file_path)
        .pipe(csv())
        .on("data", row => {
            const rawKey = row[key_field]

            // if the artist dataset is being used, get the normalized artist name (no artist ID)
            const key = normalize ? normalizeName(rawKey) : rawKey
            map.set(key, row)
        })
        .on("end", () => {
            console.log(`Loaded ${map.size} entries from ${file_path}`)
            callback()
        })
}

// filling the missing features in the database for each song
function fillAudioFeatures(){
    db.serialize(() => {
        db.all(`
            SELECT spotify_id, artist_id, artist_name FROM Track
            WHERE acousticness IS NULL OR danceability IS NULL OR energy IS NULL OR instrumentalness IS NULL OR key IS NULL OR mode IS NULL
          `, (err, rows) => {
            if (err) {
              console.error("DB READ ERROR:", err)
              return
            }
          
            const update_tracks = db.prepare(`
              UPDATE Track SET
                acousticness = ?,
                danceability = ?,
                energy = ?,
                instrumentalness = ?,
                key = ?,
                liveness = ?,
                loudness = ?,
                mode = ?,
                speechiness = ?,
                tempo = ?,
                valence = ?
              WHERE spotify_id = ?
            `)
          
            let update_count = 0
            for (const track of rows) {
              // if there is track data, use track features
              const track_data = track_features.get(track.spotify_id)
              let values = track_data
              let source = 'track'

              // if no track data for that song, query for the artist instead
              if (!track_data) {
                const norm_artist_name = normalizeName(track.artist_name)
                const artist_data = artist_features.get(norm_artist_name)
          
                if (!artist_data) {
                  console.warn(`No audio features found for track ${track.spotify_id} (${track.artist_name})`)
                  continue;
                }
          
                values = artist_data
                source = 'artist'
              }

              
              const key_name = (values.key || '').trim()
              const mode_name = (values.mode || '').trim()

              const key_number = KEY_NAME_TO_PITCH_CLASS[key_name] ?? -1
              const mode_binary = MODE_NAME_TO_BINARY[mode_name] ?? null

              // if there isn't any features, set to the respective null value
              update_tracks.run([
                parseFloat(values.acousticness) || parseFloat(values.Acousticness) || null,
                parseFloat(values.danceability) || null,
                parseFloat(values.energy) || null,
                parseFloat(values.instrumentalness) || null,
                key_number,
                parseFloat(values.liveness) || null,
                parseFloat(values.loudness) || null,
                mode_binary,
                parseFloat(values.speechiness) || null,
                parseFloat(values.tempo) || null,
                parseFloat(values.valence) || null,
                track.spotify_id
              ], err => {
                if (err) {
                  console.error(`Error updating ${track.spotify_id}:`, err.message)
                } else {
                  update_count++
                  console.log(`Updated ${track.spotify_id} using ${source} features`)
                }
              })
            }
          
            update_tracks.finalize(() => {
              console.log(`\nFinished updating ${update_count} tracks`)
            })
        })       
    })
}

// loading the datasets
csvToMap('data\\mr_tracks_dataset.csv', 'id', track_features, false, () => {
    csvToMap('data\\data_by_artist.csv', 'artists', artist_features, true, () => {
        fillAudioFeatures()
    })
})
