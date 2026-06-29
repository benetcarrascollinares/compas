const express = require("express");
const bcrypt = require("bcrypt");

const {
  createPlayer,
  findByUsername,
  getProfile,
  getLeaderboard
} = require("../db/players");

const { signToken } = require("../auth/auth");

const router = express.Router();

const SALT_ROUNDS = 10;

/*
=================================
POST /register
Body: { username, password }
=================================
*/

router.post(
  "/register",
  async (req, res) => {

    const { username, password } = req.body;

    // Validación básica
    if (
      !username ||
      !password ||
      username.length < 3 ||
      password.length < 4
    ) {
      return res.status(400).json({
        error:
          "Username mínimo 3 chars, password mínimo 4"
      });
    }

    if (username.length > 20) {
      return res.status(400).json({
        error: "Username máximo 20 caracteres"
      });
    }

    // Verificar si ya existe
    const existing = findByUsername(username);

    if (existing) {
      return res.status(409).json({
        error: "Ese username ya está en uso"
      });
    }

    try {

      const hashed =
        await bcrypt.hash(password, SALT_ROUNDS);

      const id = createPlayer(username, hashed);

      const token = signToken({ id, username });

      return res.status(201).json({
        token,
        user: { id, username, elo: 1000 }
      });

    } catch (err) {

      console.error("Register error:", err);

      return res.status(500).json({
        error: "Error interno del servidor"
      });

    }
  }
);

/*
=================================
POST /login
Body: { username, password }
=================================
*/

router.post(
  "/login",
  async (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Faltan campos"
      });
    }

    const player = findByUsername(username);

    if (!player) {
      return res.status(401).json({
        error: "Usuario o contraseña incorrectos"
      });
    }

    try {

      const match =
        await bcrypt.compare(password, player.password);

      if (!match) {
        return res.status(401).json({
          error: "Usuario o contraseña incorrectos"
        });
      }

      const token = signToken({
        id: player.id,
        username: player.username
      });

      return res.json({
        token,
        user: {
          id:       player.id,
          username: player.username,
          elo:      player.elo
        }
      });

    } catch (err) {

      console.error("Login error:", err);

      return res.status(500).json({
        error: "Error interno del servidor"
      });

    }
  }
);

/*
=================================
GET /profile/:username
=================================
*/

router.get(
  "/profile/:username",
  (req, res) => {

    const profile =
      getProfile(req.params.username);

    if (!profile) {
      return res.status(404).json({
        error: "Jugador no encontrado"
      });
    }

    return res.json(profile);
  }
);

/*
=================================
GET /leaderboard
=================================
*/

router.get(
  "/leaderboard",
  (req, res) => {

    const board = getLeaderboard(20);

    return res.json(board);
  }
);

module.exports = router;


const {
  getUnlockablesProfile,
  setActiveTitle,
  setActiveSkin
} = require("../db/unlockables");

const { verifyToken } = require("../auth/auth");

/*
=================================
GET /unlockables/:username
=================================
*/

router.get(
  "/unlockables/:username",
  (req, res) => {

    const player =
      findByUsername(req.params.username);

    if (!player) {
      return res.status(404).json({
        error: "Jugador no encontrado"
      });
    }

    const data =
      getUnlockablesProfile(player.id);

    return res.json({
      ...data,
      activeTitle: player.active_title,
      activeSkin:  player.active_skin || "default"
    });

  }
);

/*
=================================
POST /equip/title
Body: { titleKey }
Auth: Bearer token
=================================
*/

router.post(
  "/equip/title",
  (req, res) => {

    const token =
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "No autorizado"
      });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        error: "Token inválido"
      });
    }

    const ok = setActiveTitle(
      payload.id,
      req.body.titleKey
    );

    if (!ok) {
      return res.status(400).json({
        error: "Título no disponible"
      });
    }

    return res.json({ ok: true });

  }
);

/*
=================================
POST /equip/skin
Body: { skinKey }
Auth: Bearer token
=================================
*/

router.post(
  "/equip/skin",
  (req, res) => {

    const token =
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "No autorizado"
      });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        error: "Token inválido"
      });
    }

    const ok = setActiveSkin(
      payload.id,
      req.body.skinKey
    );

    if (!ok) {
      return res.status(400).json({
        error: "Skin no disponible"
      });
    }

    return res.json({ ok: true });

  }
);
