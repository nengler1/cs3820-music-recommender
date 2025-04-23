# Spotify Music Recommender

The Music Recommender was developed by Nathan Engler and Robert Kroleski as a semester project for CS3820: Introduction to Artificial Intelligence at the University of Colrado at Colorado Springs.
This Github represents the culmination of their work and is provided as an Open Source project for anyone seeking to experiment with recommender systems or expand its current capabilities.
It offers users an interactive platform to retrieve user and music data and generate personalized music recommendations from an ensemble of collaborative filtering and content-based filtering approaches.
From the recommendations, users can produce and manage Spotify playlists.

Find our website: [melofy.apps.dj](https://melofy.apps.dj/spotify.html)
---

## Project Structure

### .VSCODE
- `settings.json`: Stores our settings for this app.
  
### HTML
- `admin.html`: Administrative interface for managing backend functionalities.
- `basicapi.js`: Handles basic API interactions related to Admin and Users, and data fetching.
- `create_playlist.html`: Interface for users to create and manage playlists.
- `favicon.ico`: Website icon for browser tabs.
- `fetchapi.js`: Manages more advanced or specific API requests.
- `hw.html`: (CS3110)
- `index.html`: Main landing page for the application.
- `index_one.html`: An alternate or prototype version of the main page.
- `melofy-logo.png`: Logo used on the live melofy site.
- `playlist_icon.png`, `recommend_icon.png`, `recommended_icon.png`: Icons for feature representation.
- `profile.html`: User profile page displaying personal information and preferences.
- `spotify_icon.png`: Spotify icon if you choose to use the Spotify API.
- `styles.css`: Main stylesheet for the application.
- `willow.jpg`: Nathan's cat.

### JSAPP
- `0_prep.py`: Deletes the relevant recommendation tables from the database and then recreates them.
- `1_CF.py`: Performs the Collaborative Filtering calculations of the recommendation system and stores them in the Collaborative_Recommendations table.
- `2_CBF.py`: Performs the Content-based Filtering calculations of the recommendation system and stores them in the Content_Recommendations table.
- `3_Merge.py`: Averages the Collaborative Filtering and Content-based Filtering calculations and stores them in the Merged_Recommendations table.
- `4_Results.py`: Prints a user-selected length list of the top recommendations for eah user in terms of database.
- `5_Metrics.py`: Takes the results from the Merged_Recommendations table and performs a top-K / bottom-K analysis of the accuracy, precision, recall, and F1.
- `app.js`: Complete API Backend querying the Spotify API for user's songs. `/api/me/saved-tracks`, `/api/me/recommendations`, and `/api/playlists/:id/export` are the main endpoints for this project.
- `data_csv_asynchronous.js`: Incorporating the audio features database from a python script instead of in synchronous with a user's login
- `database.js`: Builds the initial database and all the tables.
- `db_diagram.py`: A script to create an Entity Relational Diagram (ERD) of the database.
- `package-lock.json`, `package.json`: NPM libraries
- `requirements.txt`: A list for installing Python dependencies (see "Dependencies" below)
- `users.js`: (CS3110)
#### DATA
- `data.zip`: data used to impute missing track features.
- `data_by_artist.csv`: data used to impute missing track features by artist, when the track is not available.
#### NODE_MODULES
- (Various): Various JavaScript node modules used by the app.






---

## Getting Started

To run the frontend locally:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/nengler1/cs3820-music-recommender.git
   cd cs3820-music-recommender/html
   ```

2. **Install Node.js and Libraries**

   Our `app.js` runs off of Node.js for our backend JavaScript API calls for Spotify.
   To correctly run the app, first make sure you have `npm` package manager for Node.js installed (visit https://nodejs.org/en/download for more information).
   Install the packages `http-server` and `nodemon` globally with this command.
   ```bash
   npm install -g nodemon http-server
   ```
   Navigate to the `jsapp/` folder and install the dependency packages needed to run `app.js`.
   ```bash
   cd jsapp
   npm install
   ```
3. **Run Environment**
   While in the `jsapp/` folder, run our `app.js` with `nodemon` (you can use `node` as well)
   ```bash
   nodemon app.js
   ```
   
   In another terminal window, navigate to the `html/` folder and start a local `http-server`.
   ```bash
   cd html
   http-server -P http://localhost:3000
   ```
   All our API endpoints run through port 3000.
   
5. **Open the Application**

   Simply direct to `http://127.0.0.1:8080/` or `http://localhost:8080/` in your preferred web browser.
   If you see "Log in", that means it is running correctly!

---

## Features

- **Personalized Recommendations**: Receive music suggestions tailored to your preferences.
- **Playlist Management**: Create, edit, and manage playlists easily.
- **User Profiles**: View and update your profile and preferences.
- **Administrative Interface**: Access tools for managing data and users.

---

## Technologies Used

- **HTML5 & CSS3**: For webpage structure and styling.
- **JavaScript (ES6)**: For interactivity and API integration.
- **RESTful APIs**: Backend communication for data retrieval and actions.

---

## Dependencies

- **eralchemy==1.5.0**
- **greenlet==3.2.0**
- **joblib==1.4.2**
- **numpy==2.2.4**
- **pandas==2.2.3**
- **pygraphviz==1.14**
- **python-dateutil==2.9.0.post0**
- **pytz==2025.2**
- **scikit-learn==1.6.1**
- **scipy==1.15.2**
- **six==1.17.0**
- **SQLAlchemy==2.0.40**
- **threadpoolctl==3.6.0**
- **typing_extensions==4.13.2**
- **tzdata==2025.2**

---

## Contributing

We welcome contributions from the community! To contribute:

1. Fork the repository.
2. Create a new branch:

   ```bash
   git checkout -b branch/your-new-branch
   ```

3. Make your changes and commit them:

   ```bash
   git commit -m "Add Your Branch"
   ```

4. Push to your fork:

   ```bash
   git push origin branch/your-new-branch
   ```

5. Open a Pull Request for review.

---

## License

This project is licensed under the MIT License.  
See the [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/nengler1/cs3820-music-recommender/blob/main/LICENSE) file for full details.

---

For more information or to report issues, visit the [main repository](https://github.com/nengler1/cs3820-music-recommender).
