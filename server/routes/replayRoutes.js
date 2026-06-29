const express         = require("express");
const router          = express.Router();
const db              = require("../db/database");
const { verifyToken } = require("../auth/auth");

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No autorizado" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Token inválido" });
  req.user = payload;
  next();
}

router.post("/", auth, async (req, res) => {
  const { match_id, song_id, difficulty, score, accuracy, data } = req.body;
  if (!song_id || !difficulty || !data) return res.status(400).json({ error: "Faltan campos" });

  try {
    const result = await db.run(`
      INSERT INTO replays (match_id, player_id, song_id, difficulty, score, accuracy, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [match_id || null, req.user.id, song_id, difficulty, score || 0, accuracy || 0, JSON.stringify(data)]);

    res.json({ id: result.lastID });
  } catch (err) {
    console.error("Error guardando replay:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const replay = await db.get(`
      SELECT r.*, p.username FROM replays r
      JOIN players p ON p.id = r.player_id WHERE r.id = ?
    `, [req.params.id]);

    if (!replay) return res.status(404).json({ error: "Replay no encontrado" });
    replay.data = JSON.parse(replay.data);
    res.json(replay);
  } catch (err) {
    res.status(500).json({ error: "Error cargando replay" });
  }
});

router.get("/player/me", auth, async (req, res) => {
  try {
    const replays = await db.all(`
      SELECT id, match_id, song_id, difficulty, score, accuracy, created_at
      FROM replays WHERE player_id = ? ORDER BY created_at DESC LIMIT 20
    `, [req.user.id]);
    res.json(replays);
  } catch (err) {
    res.status(500).json({ error: "Error cargando replays" });
  }
});

router.get("/match/:matchId", async (req, res) => {
  try {
    const replays = await db.all(`
      SELECT r.id, r.player_id, r.score, r.accuracy, p.username
      FROM replays r JOIN players p ON p.id = r.player_id WHERE r.match_id = ?
    `, [req.params.matchId]);
    res.json(replays);
  } catch (err) {
    res.status(500).json({ error: "Error cargando replays" });
  }
});

module.exports = router;