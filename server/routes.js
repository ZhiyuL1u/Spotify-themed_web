const mysql = require('mysql')
const config = require('./config.json')

// Creates MySQL connection using database credential provided in config.json
// Do not edit. If the connection fails, make sure to check that config.json is filled out correctly
const connection = mysql.createConnection({
  host: config.rds_host,
  user: config.rds_user,
  password: config.rds_password,
  port: config.rds_port,
  database: config.rds_db
});
connection.connect((err) => err && console.log(err));

/******************
 * WARM UP ROUTES *
 ******************/

// Route 1: GET /author/:type
const author = async function(req, res) {
  // TODO (TASK 1): replace the values of name and pennkey with your own
  const name = 'Zhiyu Liu';
  const pennkey = 'liuzhiyu';
  console.log(req.params.type)
  // checks the value of type in the request parameters
  // note that parameters are required and are specified in server.js in the endpoint by a colon (e.g. /author/:type)
  if (req.params.type === 'name') {
    // res.send returns data back to the requester via an HTTP response
    res.json({ name: name });
  } else if (req.params.type === 'pennkey') {
    // TODO (TASK 2): edit the else if condition to check if the request parameter is 'pennkey' and if so, send back a JSON response with the pennkey
    res.json({ pennkey: pennkey });
  } else {
    res.status(400).json({});
  }
}

// Route 2: GET /random
const random = async function(req, res) {
  // you can use a ternary operator to check the value of request query values
  // which can be particularly useful for setting the default value of queries
  // note if users do not provide a value for the query it will be undefined, which is falsey
  const explicit = req.query.explicit === 'true' ? 1 : 0;
  console.log(explicit)

  // Here is a complete example of how to query the database in JavaScript.
  // Only a small change (unrelated to querying) is required for TASK 3 in this route.
  connection.query(`
    SELECT *
    FROM Songs
    WHERE explicit <= ${explicit}
    ORDER BY RAND()
    LIMIT 1
  `, (err, data) => {
    if (err || data.length === 0) {
      // If there is an error for some reason, or if the query is empty (this should not be possible)
      // print the error message and return an empty object instead
      console.log(err);
      // Be cognizant of the fact we return an empty object {}. For future routes, depending on the
      // return type you may need to return an empty array [] instead.
      res.json({});
    } else {
      // Here, we return results of the query as an object, keeping only relevant data
      // being song_id and title which you will add. In this case, there is only one song
      // so we just directly access the first element of the query results array (data)
      // TODO (TASK 3): also return the song title in the response

      res.json({
        song_id: data[0].song_id,
        title: data[0].title
      });
    }
  });
}

/********************************
 * BASIC SONG/ALBUM INFO ROUTES *
 ********************************/

// Route 3: GET /song/:song_id
const song = async function(req, res) {
  // TODO (TASK 4): implement a route that given a song_id, returns all information about the song
  // Hint: unlike route 2, you can directly SELECT * and just return data[0]
  // Most of the code is already written for you, you just need to fill in the query
  const songId = req.params.song_id;
  // console.log(songId)
  connection.query(`
    SELECT *
    FROM Songs
    WHERE song_id = ?`, [songId], (err, data) => {
    if (err || data.length === 0) {
      console.log(err);
      res.json({});
    } else {
      res.json(data[0]);
    }
  });
}

// Route 4: GET /album/:album_id
const album = async function(req, res) {
  // TODO (TASK 5): implement a route that given a album_id, returns all information about the album
  const albumId = req.params.album_id;
  connection.query(`
    SELECT *
    FROM Albums
    WHERE album_id = ?`, [albumId], (err, data) => {
    if (err || data.length === 0) {
      // log the error and return an empty object as a fallback
      console.log(err);
      res.json({});
    } else {
      // If the query is successful and an album is found, return its details
      // Since there should only be one album with the given album_id, return the first item of the data array
      res.json(data[0]);
    }
  });
}

// Route 5: GET /albums
const albums = async function(req, res) {
  // TODO (TASK 6): implement a route that returns all albums ordered by release date (descending)
  // Note that in this case you will need to return multiple albums, so you will need to return an array of objects
  connection.query(`
    SELECT album_id, title, release_date, thumbnail_url
    FROM Albums
    ORDER BY release_date DESC`, (err, data) => {
    if (err) {
      // If there's an error executing the query, log the error and return an empty array
      console.log(err);
      res.json([]);
    } else {
      // If the query is successful, return the data as an array of album objects
      res.json(data);
    }
  });
}

// Route 6: GET /album_songs/:album_id
const album_songs = async function(req, res) {
  // TODO (TASK 7): implement a route that given an album_id, returns all songs on that album ordered by track number (ascending)
  const albumId = req.params.album_id;

  connection.query(`
    SELECT song_id, title, number, duration, plays
    FROM Songs
    WHERE album_id = ?
    ORDER BY number ASC`, [albumId], (err, data) => {
    if (err) {
      // If there's an error executing the query, log the error and return an empty array
      console.log(err);
      res.json([]);
    } else {
      // If the query is successful, return the data as an array of song objects
      res.json(data);
    }
  });
}

/************************
 * ADVANCED INFO ROUTES *
 ************************/

// Route 7: GET /top_songs
const top_songs = async function(req, res) {
  const page = req.query.page;
  // TODO (TASK 8): use the ternary (or nullish) operator to set the pageSize based on the query or default to 10
  const pageSize = req.query.page_size ? parseInt(req.query.page_size) : 10;

  if (!page) {
    // Task 9: Query the database and return all songs ordered by number of plays (descending)
    connection.query(`
      SELECT s.song_id, s.title, s.album_id, a.title AS album, s.plays
      FROM Songs s
      JOIN Albums a ON s.album_id = a.album_id
      ORDER BY s.plays DESC`, (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        res.json(data);
      }
    });
  } else {
    // Task 10: Implement pagination
    const offset = (page - 1) * pageSize;
    connection.query(`
      SELECT s.song_id, s.title, s.album_id, a.title AS album, s.plays
      FROM Songs s
      JOIN Albums a ON s.album_id = a.album_id
      ORDER BY s.plays DESC
      LIMIT ? OFFSET ?`, [pageSize, offset], (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        res.json(data);
      }
    });
  }
}

// Route 8: GET /top_albums
const top_albums = async function(req, res) {
  const page = req.query.page;
  // console.log(page)
  const pageSize = req.query.page_size ? parseInt(req.query.page_size) : 10;

  const baseQuery = `
    SELECT a.album_id, a.title, SUM(s.plays) as plays
    FROM Albums a
    JOIN Songs s ON a.album_id = s.album_id
    GROUP BY a.album_id
    ORDER BY plays DESC
  `;

  if (!page) {
    // Return all albums ordered by aggregate number of plays (descending)
    connection.query(baseQuery, (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        res.json(data);
      }
    });
  } else {
    // Implement pagination
    const offset = (page - 1) * pageSize;
    const paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
    connection.query(paginatedQuery, [pageSize, offset], (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        res.json(data);
      }
    });
  }
}

// Route 9: GET /search_albums
const search_songs = async function(req, res) {
  // TODO (TASK 12): return all songs that match the given search query with parameters defaulted to those specified in API spec ordered by title (ascending)
  // Some default parameters have been provided for you, but you will need to fill in the rest
  const title = req.query.title ?? '%'; // Use '%' as the default to match any title
  const durationLow = parseInt(req.query.duration_low ?? 60);
  const durationHigh = parseInt(req.query.duration_high ?? 660);
  const playsLow = parseInt(req.query.plays_low ?? 0);
  const playsHigh = parseInt(req.query.plays_high ?? 1100000000);
  const danceabilityLow = parseFloat(req.query.danceability_low ?? 0);
  const danceabilityHigh = parseFloat(req.query.danceability_high ?? 1);
  const energyLow = parseFloat(req.query.energy_low ?? 0);
  const energyHigh = parseFloat(req.query.energy_high ?? 1);
  const valenceLow = parseFloat(req.query.valence_low ?? 0);
  const valenceHigh = parseFloat(req.query.valence_high ?? 1);
  const explicit = req.query.explicit === 'true' ? 1 : 0;

  const query = `
    SELECT *
    FROM Songs
    WHERE title LIKE ?
    AND duration BETWEEN ? AND ?
    AND plays BETWEEN ? AND ?
    AND danceability BETWEEN ? AND ?
    AND energy BETWEEN ? AND ?
    AND valence BETWEEN ? AND ?
    AND explicit <= ?
    ORDER BY title ASC
  `;

  const params = [
    `%${title}%`, // Wrap the title in % for partial match
    durationLow, durationHigh,
    playsLow, playsHigh,
    danceabilityLow, danceabilityHigh,
    energyLow, energyHigh,
    valenceLow, valenceHigh,
    explicit
  ];

  // Execute the query
  connection.query(query, params, (err, data) => {
    if (err) {
      console.log(err);
      res.json([]);
    } else {
      res.json(data);
    }
  });


}

module.exports = {
  author,
  random,
  song,
  album,
  albums,
  album_songs,
  top_songs,
  top_albums,
  search_songs,
}
