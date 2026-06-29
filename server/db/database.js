const Database = require("better-sqlite3");
const path = require("path");
const fs   = require("fs");

const DATA_DIR = path.join(__dirname, "../data");
const DB_PATH  = path.join(DATA_DIR, "rhythmbattle.db");

// Crear directorio data si no existe (Railway)
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Rendimiento: WAL mode
db.pragma("journal_mode = WAL");

/*
=================================
TABLAS
=================================
*/

db.exec(`

  CREATE TABLE IF NOT EXISTS players (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    elo         INTEGER NOT NULL DEFAULT 1000,
    wins        INTEGER NOT NULL DEFAULT 0,
    losses      INTEGER NOT NULL DEFAULT 0,
    streak      INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    active_title TEXT   DEFAULT NULL,
    active_skin  TEXT   DEFAULT 'default',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS matches (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id   INTEGER NOT NULL,
    player2_id   INTEGER NOT NULL,
    winner_id    INTEGER,
    difficulty   TEXT    NOT NULL,
    played_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (player1_id) REFERENCES players(id),
    FOREIGN KEY (player2_id) REFERENCES players(id),
    FOREIGN KEY (winner_id)  REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS match_stats (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id   INTEGER NOT NULL,
    player_id  INTEGER NOT NULL,
    score      INTEGER NOT NULL DEFAULT 0,
    accuracy   INTEGER NOT NULL DEFAULT 0,
    perfects   INTEGER NOT NULL DEFAULT 0,
    goods      INTEGER NOT NULL DEFAULT 0,
    oks        INTEGER NOT NULL DEFAULT 0,
    misses     INTEGER NOT NULL DEFAULT 0,
    max_combo  INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (match_id)  REFERENCES matches(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS unlockables (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL,
    type        TEXT    NOT NULL,
    key         TEXT    NOT NULL,
    unlocked_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(player_id, type, key),
    FOREIGN KEY (player_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS community_songs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id      TEXT    NOT NULL UNIQUE,
    name         TEXT    NOT NULL,
    artist       TEXT    NOT NULL,
    stars        INTEGER NOT NULL DEFAULT 3,
    duration     INTEGER NOT NULL,
    beatmap      TEXT    NOT NULL,
    audio_url    TEXT    DEFAULT NULL,
    creator_id   INTEGER NOT NULL,
    creator_name TEXT    NOT NULL,
    plays        INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (creator_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS song_ratings (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id   TEXT    NOT NULL,
    player_id INTEGER NOT NULL,
    rating    INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    rated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(song_id, player_id),
    FOREIGN KEY (player_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS replays (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id   INTEGER NOT NULL,
    player_id  INTEGER NOT NULL,
    song_id    TEXT    NOT NULL,
    difficulty TEXT    NOT NULL,
    score      INTEGER NOT NULL DEFAULT 0,
    accuracy   REAL    NOT NULL DEFAULT 0,
    data       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES players(id)
  );

`);

console.log("✅ Base de datos lista");

module.exports = db;