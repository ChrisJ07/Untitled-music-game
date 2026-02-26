const express = require("express");
const fetch = require("node-fetch");
const querystring = require("querystring");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.static("public"));
app.use(express.json());

/* =======================
   SPOTIFY CONFIG
======================= */

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

/* =======================
   DATABASE
======================= */

const db = new sqlite3.Database("./songs.db");

/* =======================
   LOGIN
======================= */

app.get("/login", (req, res) => {

  const scope =
    "streaming user-read-email user-read-private user-modify-playback-state";

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: CLIENT_ID,
        scope,
        redirect_uri: REDIRECT_URI,
state: req.query.redirect || "/"
      })
  );
});

/* =======================
   CALLBACK
======================= */

app.get("/callback", async (req, res) => {

  const code = req.query.code;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: querystring.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI
    })
  });

  const data = await response.json();

  if (!data.access_token)
    return res.send("Spotify login failed");

  const redirect = req.query.state || "/";
res.redirect(`${redirect}?access_token=${data.access_token}`);
});

/* =======================
   CATEGORIES LIST
======================= */

app.get("/categories", (req, res) => {
  const sql = `
    SELECT c.id, c.name, COUNT(sc.song_id) AS count
    FROM categories c
    LEFT JOIN song_categories sc ON c.id = sc.category_id
    GROUP BY c.id
    ORDER BY c.name
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }
    res.json(rows);
  });
});

/* =======================
   RANDOM SONG
======================= */

app.get("/random-song", (req,res) => {
  const cats = req.query.cats?.split(",") || [];

  let sql;
  if(cats.length > 0){
    sql = `
      SELECT DISTINCT s.*
      FROM songs s
      JOIN song_categories sc ON s.id = sc.song_id
      WHERE sc.category_id IN (${cats.join(",")})
      ORDER BY RANDOM()
      LIMIT 1
    `;
  } else {
    sql = `
      SELECT *
      FROM songs
      ORDER BY RANDOM()
      LIMIT 1
    `;
  }

  db.get(sql, [], (err, row) => {
    if(err){
      console.error(err);
      res.json(null);
      return;
    }
    res.json(row || null);
  });
});

/* =======================
   ADD SONG
======================= */

app.post("/add-song",(req,res)=>{

  const { title, artist, year, spotify_uri } = req.body;

  if(!title || !artist || !year || !spotify_uri)
    return res.status(400).json({error:"Missing fields"});

  db.run(
    "INSERT INTO songs(title,artist,year,spotify_uri) VALUES(?,?,?,?)",
    [title,artist,year,spotify_uri],
    function(err){
      if(err) return res.status(500).json(err);
      res.json({success:true,id:this.lastID});
    }
  );

});

app.get("/year",(req,res)=>{
  res.sendFile(__dirname+"/public/year.html");
});

app.get("/random-song-year", (req,res)=>{
  const year = req.query.year;

  if(!year){
    return res.status(400).json({error:"Missing year"});
  }

  db.get(
    "SELECT * FROM songs WHERE year=? ORDER BY RANDOM() LIMIT 1",
    [year],
    (err,row)=>{
      if(err){
        console.error(err);
        return res.status(500).json(err);
      }
      res.json(row || null);
    }
  );
});

/* =======================
   START
======================= */


app.get("/", (req, res) => {
  res.send("App is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});




