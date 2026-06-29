const path = require("path");
const fs   = require("fs");

const USE_PG = !!process.env.DATABASE_URL;

let db;

if (USE_PG) {

  // ══════════════════════════════════
  // POSTGRESQL (Railway producción)
  // ══════════════════════════════════
  const { Pool } = require("pg");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Crear tablas si no existen
  pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id           SERIAL PRIMARY KEY,
      username     TEXT   NOT NULL UNIQUE,
      password     TEXT   NOT NULL,
      elo          INTEGER NOT NULL DEFAULT 1000,
      wins         INTEGER NOT NULL DEFAULT 0,
      losses       INTEGER NOT NULL DEFAULT 0,
      streak       INTEGER NOT NULL DEFAULT 0,
      best_streak  INTEGER NOT NULL DEFAULT 0,
      active_title TEXT    DEFAULT NULL,
      active_skin  TEXT    DEFAULT 'default',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS matches (
      id           SERIAL PRIMARY KEY,
      player1_id   INTEGER NOT NULL,
      player2_id   INTEGER NOT NULL,
      winner_id    INTEGER,
      difficulty   TEXT    NOT NULL,
      played_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS match_stats (
      id         SERIAL PRIMARY KEY,
      match_id   INTEGER NOT NULL,
      player_id  INTEGER NOT NULL,
      score      INTEGER NOT NULL DEFAULT 0,
      accuracy   INTEGER NOT NULL DEFAULT 0,
      perfects   INTEGER NOT NULL DEFAULT 0,
      goods      INTEGER NOT NULL DEFAULT 0,
      oks        INTEGER NOT NULL DEFAULT 0,
      misses     INTEGER NOT NULL DEFAULT 0,
      max_combo  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS unlockables (
      id          SERIAL PRIMARY KEY,
      player_id   INTEGER NOT NULL,
      type        TEXT    NOT NULL,
      key         TEXT    NOT NULL,
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(player_id, type, key)
    );

    CREATE TABLE IF NOT EXISTS community_songs (
      id           SERIAL PRIMARY KEY,
      song_id      TEXT    NOT NULL UNIQUE,
      name         TEXT    NOT NULL,
      artist       TEXT    NOT NULL,
      stars        INTEGER NOT NULL DEFAULT 3,
      duration     INTEGER NOT NULL,
      beatmap      TEXT    NOT NULL,
      audio_url    TEXT    DEFAULT NULL,
      difficulty   TEXT    NOT NULL DEFAULT 'normal',
      creator_id   INTEGER NOT NULL,
      creator_name TEXT    NOT NULL,
      plays        INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS song_ratings (
      id        SERIAL PRIMARY KEY,
      song_id   TEXT    NOT NULL,
      player_id INTEGER NOT NULL,
      rating    INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      rated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(song_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS replays (
      id         SERIAL PRIMARY KEY,
      match_id   INTEGER,
      player_id  INTEGER NOT NULL,
      song_id    TEXT    NOT NULL,
      difficulty TEXT    NOT NULL,
      score      INTEGER NOT NULL DEFAULT 0,
      accuracy   REAL    NOT NULL DEFAULT 0,
      data       TEXT    NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `).then(() => {
    console.log("✅ Base de datos PostgreSQL lista");
  }).catch(err => {
    console.error("❌ Error iniciando PostgreSQL:", err.message);
  });

  // Adaptar interfaz a SQLite-like para compatibilidad
  db = {
    isPg: true,
    pool,

    // Ejecutar query y devolver todas las filas
    all: async (sql, params = []) => {
      const pgSql = toPostgres(sql);
      const res = await pool.query(pgSql, params);
      return res.rows;
    },

    // Ejecutar query y devolver primera fila
    get: async (sql, params = []) => {
      const pgSql = toPostgres(sql);
      const res = await pool.query(pgSql, params);
      return res.rows[0] || null;
    },

    // Ejecutar query sin retorno (INSERT/UPDATE/DELETE)
    run: async (sql, params = []) => {
      const pgSql = toPostgres(sql + " RETURNING id");
      try {
        const res = await pool.query(pgSql, params);
        return { lastID: res.rows[0]?.id, changes: res.rowCount };
      } catch {
        const pgSql2 = toPostgres(sql);
        const res2 = await pool.query(pgSql2, params);
        return { changes: res2.rowCount };
      }
    },

    // Ejecutar múltiples statements
    exec: async (sql) => {
      await pool.query(sql);
    },

    // Para compatibilidad con código sync de SQLite
    prepare: () => null
  };

} else {

  // ══════════════════════════════════
  // SQLITE (desarrollo local)
  // ══════════════════════════════════
  const Database = require("better-sqlite3");

  const DATA_DIR = path.join(__dirname, "../data");
  const DB_PATH  = path.join(DATA_DIR, "rhythmbattle.db");

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT    NOT NULL UNIQUE,
      password     TEXT    NOT NULL,
      elo          INTEGER NOT NULL DEFAULT 1000,
      wins         INTEGER NOT NULL DEFAULT 0,
      losses       INTEGER NOT NULL DEFAULT 0,
      streak       INTEGER NOT NULL DEFAULT 0,
      best_streak  INTEGER NOT NULL DEFAULT 0,
      active_title TEXT    DEFAULT NULL,
      active_skin  TEXT    DEFAULT 'default',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS matches (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id   INTEGER NOT NULL,
      player2_id   INTEGER NOT NULL,
      winner_id    INTEGER,
      difficulty   TEXT    NOT NULL,
      played_at    TEXT    NOT NULL DEFAULT (datetime('now'))
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
      max_combo  INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS unlockables (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL,
      type        TEXT    NOT NULL,
      key         TEXT    NOT NULL,
      unlocked_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(player_id, type, key)
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
      difficulty   TEXT    NOT NULL DEFAULT 'normal',
      creator_id   INTEGER NOT NULL,
      creator_name TEXT    NOT NULL,
      plays        INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS song_ratings (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id   TEXT    NOT NULL,
      player_id INTEGER NOT NULL,
      rating    INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      rated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(song_id, player_id)
    );
    CREATE TABLE IF NOT EXISTS replays (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id   INTEGER,
      player_id  INTEGER NOT NULL,
      song_id    TEXT    NOT NULL,
      difficulty TEXT    NOT NULL,
      score      INTEGER NOT NULL DEFAULT 0,
      accuracy   REAL    NOT NULL DEFAULT 0,
      data       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log("✅ Base de datos SQLite lista");

  // Wrap SQLite en interfaz async-compatible
  db = {
    isPg: false,
    all:  (sql, params = []) => Promise.resolve(sqlite.prepare(sql).all(...params)),
    get:  (sql, params = []) => Promise.resolve(sqlite.prepare(sql).get(...params)),
    run:  (sql, params = []) => {
      const r = sqlite.prepare(sql).run(...params);
      return Promise.resolve({ lastID: r.lastInsertRowid, changes: r.changes });
    },
    exec: (sql) => { sqlite.exec(sql); return Promise.resolve(); },
    prepare: (sql) => sqlite.prepare(sql)
  };

}

// Convertir ? a $1, $2... para PostgreSQL
function toPostgres(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

module.exports = db;