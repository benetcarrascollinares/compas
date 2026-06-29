const express = require("express");
const bcrypt  = require("bcrypt");

const { createPlayer, findByUsername, getProfile, getLeaderboard } = require("../db/players");
const { getUnlockablesProfile, setActiveTitle, setActiveSkin } = require("../db/unlockables");
const { signToken, verifyToken } = require("../auth/auth");

const router = express.Router();
const SALT_ROUNDS = 10;

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No autorizado" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Token inválido" });
  req.user = payload;
  next();
}

router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 3 || password.length < 4)
    return res.status(400).json({ error: "Username mínimo 3 chars, password mínimo 4" });
  if (username.length > 20)
    return res.status(400).json({ error: "Username máximo 20 caracteres" });

  try {
    const existing = await findByUsername(username);
    if (existing) return res.status(409).json({ error: "Ese username ya está en uso" });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const id     = await createPlayer(username, hashed);
    const token  = signToken({ id, username });
    return res.status(201).json({ token, user: { id, username, elo: 1000 } });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Faltan campos" });

  try {
    const player = await findByUsername(username);
    if (!player) return res.status(401).json({ error: "Usuario o contraseña incorrectos" });

    const match = await bcrypt.compare(password, player.password);
    if (!match) return res.status(401).json({ error: "Usuario o contraseña incorrectos" });

    const token = signToken({ id: player.id, username: player.username });
    return res.json({ token, user: { id: player.id, username: player.username, elo: player.elo } });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/profile/:username", async (req, res) => {
  try {
    const profile = await getProfile(req.params.username);
    if (!profile) return res.status(404).json({ error: "Jugador no encontrado" });
    return res.json(profile);
  } catch (err) {
    return res.status(500).json({ error: "Error cargando perfil" });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const board = await getLeaderboard(20);
    return res.json(board);
  } catch (err) {
    return res.status(500).json({ error: "Error cargando ranking" });
  }
});

router.get("/unlockables/:username", async (req, res) => {
  try {
    const player = await findByUsername(req.params.username);
    if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
    const data = await getUnlockablesProfile(player.id);
    return res.json({ ...data, activeTitle: player.active_title, activeSkin: player.active_skin || "default" });
  } catch (err) {
    return res.status(500).json({ error: "Error cargando desbloqueables" });
  }
});

router.post("/equip/title", auth, async (req, res) => {
  try {
    const ok = await setActiveTitle(req.user.id, req.body.titleKey);
    if (!ok) return res.status(400).json({ error: "Título no disponible" });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Error equipando título" });
  }
});

router.post("/equip/skin", auth, async (req, res) => {
  try {
    const ok = await setActiveSkin(req.user.id, req.body.skinKey);
    if (!ok) return res.status(400).json({ error: "Skin no disponible" });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Error equipando skin" });
  }
});

module.exports = router;