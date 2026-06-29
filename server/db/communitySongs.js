const db = require("./database");

const MIN_NOTES    = 20;
const MIN_DURATION = 30000;

function validate(beatmap, duration) {
  if (!Array.isArray(beatmap) || beatmap.length < MIN_NOTES)
    return `Mínimo ${MIN_NOTES} notas requeridas (tienes ${beatmap?.length ?? 0})`;
  if (duration < MIN_DURATION)
    return `La canción debe durar al menos 30 segundos`;
  const density = beatmap.length / (duration / 1000);
  if (density > 20)
    return `Demasiadas notas (${density.toFixed(1)}/seg, máximo 20/seg)`;
  return null;
}

async function uploadSong({ name, artist, stars, duration, beatmap, audioUrl, difficulty, creatorId, creatorName }) {
  const error = validate(beatmap, duration);
  if (error) return { ok: false, error };

  const songId = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + Date.now();

  try {
    await db.run(`
      INSERT INTO community_songs
        (song_id, name, artist, stars, duration, beatmap, audio_url, difficulty, creator_id, creator_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [songId, name, artist, stars, duration, JSON.stringify(beatmap), audioUrl || null,
        difficulty || "normal", creatorId, creatorName]);

    return { ok: true, songId };
  } catch (err) {
    if (err.message?.includes("UNIQUE") || err.message?.includes("unique"))
      return { ok: false, error: "Ya existe una canción con ese nombre" };
    return { ok: false, error: "Error al guardar la canción" };
  }
}

async function listSongs({ minRatings = 0 } = {}) {
  if (db.isPg) {
    return db.all(`
      SELECT cs.song_id, cs.name, cs.artist, cs.stars, cs.duration,
             cs.creator_name, cs.plays, cs.created_at, cs.difficulty,
             COUNT(sr.id) AS rating_count,
             ROUND(AVG(sr.rating)::numeric, 1) AS avg_rating
      FROM community_songs cs
      LEFT JOIN song_ratings sr ON sr.song_id = cs.song_id
      GROUP BY cs.song_id, cs.name, cs.artist, cs.stars, cs.duration,
               cs.creator_name, cs.plays, cs.created_at, cs.difficulty
      HAVING COUNT(sr.id) >= ?
      ORDER BY avg_rating DESC NULLS LAST, cs.plays DESC
    `, [minRatings]);
  } else {
    return db.all(`
      SELECT cs.song_id, cs.name, cs.artist, cs.stars, cs.duration,
             cs.creator_name, cs.plays, cs.created_at, cs.difficulty,
             COUNT(sr.id) AS rating_count,
             ROUND(AVG(sr.rating), 1) AS avg_rating
      FROM community_songs cs
      LEFT JOIN song_ratings sr ON sr.song_id = cs.song_id
      GROUP BY cs.song_id
      HAVING rating_count >= ?
      ORDER BY avg_rating DESC, cs.plays DESC
    `, [minRatings]);
  }
}

async function getSong(songId) {
  const row = await db.get(`SELECT * FROM community_songs WHERE song_id = ?`, [songId]);
  if (!row) return null;
  return { ...row, beatmap: JSON.parse(row.beatmap) };
}

async function rateSong(songId, playerId, rating) {
  const song = await db.get(`SELECT creator_id FROM community_songs WHERE song_id = ?`, [songId]);
  if (!song) return { ok: false, error: "Canción no encontrada" };
  if (song.creator_id === playerId) return { ok: false, error: "No puedes valorar tu propia canción" };

  try {
    if (db.isPg) {
      await db.run(`
        INSERT INTO song_ratings (song_id, player_id, rating)
        VALUES (?, ?, ?)
        ON CONFLICT(song_id, player_id) DO UPDATE SET rating = ?, rated_at = NOW()
      `, [songId, playerId, rating, rating]);
    } else {
      await db.run(`
        INSERT INTO song_ratings (song_id, player_id, rating) VALUES (?, ?, ?)
        ON CONFLICT(song_id, player_id) DO UPDATE SET rating = ?, rated_at = datetime('now')
      `, [songId, playerId, rating, rating]);
    }

    const stats = await db.get(
      db.isPg
        ? `SELECT COUNT(*) AS count, ROUND(AVG(rating)::numeric, 1) AS avg FROM song_ratings WHERE song_id = ?`
        : `SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS avg FROM song_ratings WHERE song_id = ?`,
      [songId]
    );

    return { ok: true, avg: stats.avg, count: stats.count };
  } catch (err) {
    return { ok: false, error: "Error al guardar valoración" };
  }
}

async function incrementPlays(songId) {
  await db.run(`UPDATE community_songs SET plays = plays + 1 WHERE song_id = ?`, [songId]);
}

async function getPlayerRating(songId, playerId) {
  const row = await db.get(
    `SELECT rating FROM song_ratings WHERE song_id = ? AND player_id = ?`,
    [songId, playerId]
  );
  return row?.rating ?? null;
}

module.exports = { uploadSong, listSongs, getSong, rateSong, incrementPlays, getPlayerRating };