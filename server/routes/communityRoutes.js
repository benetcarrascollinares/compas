const express = require("express");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const router  = express.Router();

const { uploadSong, listSongs, getSong, rateSong, incrementPlays, getPlayerRating } = require("../db/communitySongs");
const { verifyToken } = require("../auth/auth");
const { findById }    = require("../db/players");
const db              = require("../db/database");

const UPLOADS_DIR     = path.join(__dirname, "../uploads");
const MAX_FILE_MB     = 10;
const MAX_SONGS_PER_USER = 3;
const MAX_SONGS_TOTAL    = 50;

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "audio/mpeg" || file.mimetype === "audio/mp3" || file.originalname.endsWith(".mp3"))
      cb(null, true);
    else cb(new Error("Solo se aceptan archivos MP3"));
  }
});

async function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No autorizado" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Token inválido" });
  const player = await findById(payload.id);
  if (!player) return res.status(401).json({ error: "Jugador no encontrado" });
  req.player = player;
  next();
}

router.get("/songs", async (req, res) => {
  try {
    res.json(await listSongs({ minRatings: 0 }));
  } catch (err) {
    console.error("Error en /community/songs:", err);
    res.status(500).json({ error: "Error cargando canciones" });
  }
});

router.get("/songs/:songId/beatmap", async (req, res) => {
  try {
    const song = await getSong(req.params.songId);
    if (!song) return res.status(404).json({ error: "Canción no encontrada" });
    await incrementPlays(req.params.songId);
    res.json(song);
  } catch (err) {
    res.status(500).json({ error: "Error cargando beatmap" });
  }
});

router.post("/songs", auth, upload.single("audio"), async (req, res) => {
  const { name, artist, stars, duration, beatmap, difficulty } = req.body;

  if (!name || !beatmap || !duration) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Faltan campos" });
  }

  try {
    const total = await db.get("SELECT COUNT(*) AS n FROM community_songs");
    if (parseInt(total.n) >= MAX_SONGS_TOTAL) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `Límite de ${MAX_SONGS_TOTAL} canciones alcanzado` });
    }

    const userCount = await db.get("SELECT COUNT(*) AS n FROM community_songs WHERE creator_id = ?", [req.player.id]);
    if (parseInt(userCount.n) >= MAX_SONGS_PER_USER) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `Máximo ${MAX_SONGS_PER_USER} canciones por usuario` });
    }

    let parsedBeatmap;
    try { parsedBeatmap = JSON.parse(beatmap); }
    catch { if (req.file) fs.unlinkSync(req.file.path); return res.status(400).json({ error: "Beatmap inválido" }); }

    const audioUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await uploadSong({
      name, artist: artist || req.player.username,
      stars: parseInt(stars) || 3, duration: parseInt(duration),
      beatmap: parsedBeatmap, audioUrl, difficulty: difficulty || "normal",
      creatorId: req.player.id, creatorName: req.player.username
    });

    if (!result.ok) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ songId: result.songId, audioUrl });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: "Error subiendo canción" });
  }
});

router.post("/songs/:songId/rate", auth, async (req, res) => {
  const rating = parseInt(req.body.rating);
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating inválido (1-5)" });
  try {
    const result = await rateSong(req.params.songId, req.player.id, rating);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ avg: result.avg, count: result.count });
  } catch (err) {
    res.status(500).json({ error: "Error valorando canción" });
  }
});

router.get("/songs/:songId/myrating", auth, async (req, res) => {
  try {
    const rating = await getPlayerRating(req.params.songId, req.player.id);
    res.json({ rating });
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo valoración" });
  }
});

router.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(400).json({ error: `El archivo es demasiado grande. Máximo ${MAX_FILE_MB}MB` });
  next(err);
});

module.exports = router;