const db = require("./database");

/*
=================================
VALIDACIÓN
=================================
*/

const MIN_NOTES    = 20;
const MIN_DURATION = 30000; // 30 segundos

function validate(beatmap, duration) {

  if (!Array.isArray(beatmap) || beatmap.length < MIN_NOTES) {
    return `Mínimo ${MIN_NOTES} notas requeridas (tienes ${beatmap?.length ?? 0})`;
  }

  if (duration < MIN_DURATION) {
    return `La canción debe durar al menos 30 segundos`;
  }

  // Verificar densidad máxima (no más de 20 notas/seg)
  const density = beatmap.length / (duration / 1000);
  if (density > 20) {
    return `Demasiadas notas (${density.toFixed(1)}/seg, máximo 20/seg)`;
  }

  return null;

}

/*
=================================
SUBIR CANCIÓN
=================================
*/

function uploadSong({
  name,
  artist,
  stars,
  duration,
  beatmap,
  audioUrl,
  creatorId,
  creatorName
}) {

  // Validar
  const error = validate(beatmap, duration);
  if (error) return { ok: false, error };

  // Generar ID único
  const songId =
    name.toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "") +
    "_" + Date.now();

  try {

    db.prepare(`
      INSERT INTO community_songs
        (song_id, name, artist, stars, duration,
         beatmap, audio_url, creator_id, creator_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      songId, name, artist, stars, duration,
      JSON.stringify(beatmap), audioUrl || null,
      creatorId, creatorName
    );

    return { ok: true, songId };

  } catch (err) {

    if (err.message.includes("UNIQUE")) {
      return { ok: false, error: "Ya existe una canción con ese nombre" };
    }

    return { ok: false, error: "Error al guardar la canción" };

  }

}

/*
=================================
LISTAR CANCIONES
(ordenadas por rating desc, mínimo 1 valoración)
=================================
*/

function listSongs({ minRatings = 0 } = {}) {

  return db.prepare(`
    SELECT
      cs.song_id,
      cs.name,
      cs.artist,
      cs.stars,
      cs.duration,
      cs.creator_name,
      cs.plays,
      cs.created_at,
      COUNT(sr.id)        AS rating_count,
      ROUND(AVG(sr.rating), 1) AS avg_rating
    FROM community_songs cs
    LEFT JOIN song_ratings sr
      ON sr.song_id = cs.song_id
    GROUP BY cs.song_id
    HAVING rating_count >= ?
    ORDER BY avg_rating DESC, cs.plays DESC
  `)
  .all(minRatings);

}

/*
=================================
OBTENER BEATMAP DE UNA CANCIÓN
=================================
*/

function getSong(songId) {

  const row = db.prepare(`
    SELECT * FROM community_songs
    WHERE song_id = ?
  `)
  .get(songId);

  if (!row) return null;

  return {
    ...row,
    beatmap: JSON.parse(row.beatmap)
  };

}

/*
=================================
VALORAR CANCIÓN
=================================
*/

function rateSong(songId, playerId, rating) {

  // Verificar que la canción existe
  const song = db.prepare(`
    SELECT creator_id FROM community_songs
    WHERE song_id = ?
  `)
  .get(songId);

  if (!song) return { ok: false, error: "Canción no encontrada" };

  // No puedes valorar tu propia canción
  if (song.creator_id === playerId) {
    return { ok: false, error: "No puedes valorar tu propia canción" };
  }

  try {

    db.prepare(`
      INSERT INTO song_ratings (song_id, player_id, rating)
      VALUES (?, ?, ?)
      ON CONFLICT(song_id, player_id)
      DO UPDATE SET rating = ?, rated_at = datetime('now')
    `)
    .run(songId, playerId, rating, rating);

    // Calcular nuevo promedio
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS count,
        ROUND(AVG(rating), 1) AS avg
      FROM song_ratings
      WHERE song_id = ?
    `)
    .get(songId);

    return { ok: true, avg: stats.avg, count: stats.count };

  } catch (err) {
    return { ok: false, error: "Error al guardar valoración" };
  }

}

/*
=================================
INCREMENTAR PLAYS
=================================
*/

function incrementPlays(songId) {

  db.prepare(`
    UPDATE community_songs
    SET plays = plays + 1
    WHERE song_id = ?
  `)
  .run(songId);

}

/*
=================================
OBTENER VALORACIÓN DEL JUGADOR
=================================
*/

function getPlayerRating(songId, playerId) {

  const row = db.prepare(`
    SELECT rating FROM song_ratings
    WHERE song_id = ? AND player_id = ?
  `)
  .get(songId, playerId);

  return row?.rating ?? null;

}

module.exports = {
  uploadSong,
  listSongs,
  getSong,
  rateSong,
  incrementPlays,
  getPlayerRating
};