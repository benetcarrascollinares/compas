/*
=================================
REPLAY ROUTES
POST /api/replays       — guardar replay
GET  /api/replays/:id   — obtener replay por id
GET  /api/replays/match/:matchId — replays de un match
GET  /api/replays/me    — mis últimos replays
=================================
*/

const express       = require("express");
const router        = express.Router();
const db            = require("../db/database");
const { verifyToken } = require("../auth/auth");

// ── Guardar replay ──────────────────────────
router.post("/", verifyToken, (req, res) => {

  const { match_id, song_id, difficulty, score, accuracy, data } = req.body;

  if (!song_id || !difficulty || !data) {
    return res.status(400).json({ error: "Faltan campos" });
  }

  try {
    const result = db.prepare(`
      INSERT INTO replays (match_id, player_id, song_id, difficulty, score, accuracy, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      match_id || null,
      req.player.id,
      song_id,
      difficulty,
      score || 0,
      accuracy || 0,
      JSON.stringify(data)
    );

    res.json({ id: result.lastInsertRowid });

  } catch (err) {
    console.error("Error guardando replay:", err);
    res.status(500).json({ error: "Error interno" });
  }

});

// ── Obtener replay por id ───────────────────
router.get("/:id", (req, res) => {

  const replay = db.prepare(`
    SELECT r.*, p.username
    FROM replays r
    JOIN players p ON p.id = r.player_id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!replay) return res.status(404).json({ error: "Replay no encontrado" });

  replay.data = JSON.parse(replay.data);
  res.json(replay);

});

// ── Mis últimos replays ─────────────────────
router.get("/player/me", verifyToken, (req, res) => {

  const replays = db.prepare(`
    SELECT id, match_id, song_id, difficulty, score, accuracy, created_at
    FROM replays
    WHERE player_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(req.player.id);

  res.json(replays);

});

// ── Replays de un match ─────────────────────
router.get("/match/:matchId", (req, res) => {

  const replays = db.prepare(`
    SELECT r.id, r.player_id, r.score, r.accuracy, p.username
    FROM replays r
    JOIN players p ON p.id = r.player_id
    WHERE r.match_id = ?
  `).all(req.params.matchId);

  res.json(replays);

});

module.exports = router;
