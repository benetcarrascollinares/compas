const express = require("express");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const router  = express.Router();

const {
  uploadSong,
  listSongs,
  getSong,
  rateSong,
  incrementPlays,
  getPlayerRating
} = require("../db/communitySongs");

const { verifyToken } = require("../auth/auth");
const { findById }    = require("../db/players");
const db              = require("../db/database");

/*
Carpeta de uploads
*/
const UPLOADS_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/*
Límites globales
*/
const MAX_FILE_MB       = 10;
const MAX_SONGS_PER_USER = 3;
const MAX_SONGS_TOTAL    = 50;

/*
Multer — solo MP3, máx 5MB
*/
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "audio/mpeg" ||
      file.mimetype === "audio/mp3"  ||
      file.originalname.endsWith(".mp3")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Solo se aceptan archivos MP3"));
    }
  }
});

/*
Auth middleware
*/
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No autorizado" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Token inválido" });
  req.player = findById(payload.id);
  if (!req.player) return res.status(401).json({ error: "Jugador no encontrado" });
  next();
}

/*
=================================
GET /community/songs
=================================
*/
router.get("/songs", (req, res) => {
  res.json(listSongs({ minRatings: 0 }));
});

/*
=================================
GET /community/songs/:songId/beatmap
=================================
*/
router.get("/songs/:songId/beatmap", (req, res) => {
  const song = getSong(req.params.songId);
  if (!song) return res.status(404).json({ error: "Canción no encontrada" });
  incrementPlays(req.params.songId);
  res.json(song);
});

/*
=================================
POST /community/songs
Sube beatmap + MP3 (multipart/form-data)
Fields: name, artist, stars, duration, beatmap (JSON string)
File:   audio (MP3)
=================================
*/
router.post(
  "/songs",
  auth,
  upload.single("audio"),
  (req, res) => {

    const { name, artist, stars, duration, beatmap } = req.body;

    if (!name || !beatmap || !duration) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Faltan campos" });
    }

    // Límite total
    const total = db.prepare(
      "SELECT COUNT(*) AS n FROM community_songs"
    ).get();
    if (total.n >= MAX_SONGS_TOTAL) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "Límite total de canciones alcanzado"
      });
    }

    // Límite por usuario
    const userCount = db.prepare(
      "SELECT COUNT(*) AS n FROM community_songs WHERE creator_id = ?"
    ).get(req.player.id);
    if (userCount.n >= MAX_SONGS_PER_USER) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "Límite de canciones por usuario alcanzado"
      });
    }

    let parsedBeatmap;
    try {
      parsedBeatmap = JSON.parse(beatmap);
    } catch {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Beatmap inválido" });
    }

    // URL del audio (si se subió)
    const audioUrl = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const result = uploadSong({
      name,
      artist:      artist || req.player.username,
      stars:       parseInt(stars) || 3,
      duration:    parseInt(duration),
      beatmap:     parsedBeatmap,
      audioUrl,
      creatorId:   req.player.id,
      creatorName: req.player.username
    });

    if (!result.ok) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ songId: result.songId, audioUrl });

  }
);

/*
=================================
POST /community/songs/:songId/rate
=================================
*/
router.post("/songs/:songId/rate", auth, (req, res) => {
  const rating = parseInt(req.body.rating);
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating inválido (1-5)" });
  }
  const result = rateSong(req.params.songId, req.player.id, rating);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ avg: result.avg, count: result.count });
});

/*
=================================
GET /community/songs/:songId/myrating
=================================
*/
router.get("/songs/:songId/myrating", auth, (req, res) => {
  const rating = getPlayerRating(req.params.songId, req.player.id);
  res.json({ rating });
});

// Manejo de errores de multer (ej: archivo demasiado grande)
router.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: `El archivo es demasiado grande. Máximo ${MAX_FILE_MB}MB`
    });
  }
  next(err);
});

module.exports = router;