import {
  login,
  register,
  logout,
  getCurrentUser,
  isLoggedIn
} from "./clientAuth.js";

import { socket } from "./socket.js";

import {
  getTitleLabel
} from "./titles.js";

const API = `${window.location.origin}/api`;

/*
=================================
refreshUserBar — exportada para
usar desde otros módulos
=================================
*/

export async function refreshUserBar(username) {

  try {

    const res  = await fetch(`${API}/profile/${username}`);
    const data = await res.json();

    const eloEl    = document.getElementById("userBarElo");
    const titleEl  = document.getElementById("userBarTitle");
    const streakEl = document.getElementById("userBarStreak");

    if (eloEl)    eloEl.textContent    = `⭐ ${data.elo}`;
    if (streakEl) streakEl.textContent = data.streak >= 3 ? `🔥 ${data.streak}` : "";

    if (titleEl) {
      const label = getTitleLabel(data.active_title);
      titleEl.textContent = label || "";
    }

    const stored = getCurrentUser();
    if (stored) {
      localStorage.setItem(
        "rb_user",
        JSON.stringify({ ...stored, elo: data.elo })
      );
    }

  } catch {
    // silencioso
  }

}

/*
=================================
Inicialización — solo en páginas
que tienen el panel de login
=================================
*/

const authPanel  = document.getElementById("authPanel");
const gamePanel  = document.getElementById("gamePanel");

// Si no hay authPanel, este módulo se importó
// desde una página sin login (ej: editor.html)
if (authPanel) {

  const tabLogin      = document.getElementById("tabLogin");
  const tabRegister   = document.getElementById("tabRegister");
  const authUsername  = document.getElementById("authUsername");
  const authPassword  = document.getElementById("authPassword");
  const authSubmit    = document.getElementById("authSubmit");
  const authError     = document.getElementById("authError");
  const userBarName   = document.getElementById("userBarName");
  const userBarElo    = document.getElementById("userBarElo");
  const logoutButton  = document.getElementById("logoutButton");

  let mode = "login";

  function showGame(user) {

    authPanel.style.display = "none";
    gamePanel.style.display = "block";

    userBarName.textContent = user.username;
    userBarElo.textContent  = `⭐ ${user.elo}`;

    const startBtn = document.getElementById("startButton");
    if (startBtn) startBtn.style.display = "block";

    refreshUserBar(user.username);

  }

  // Auto-login si hay token guardado
  if (isLoggedIn()) {
    const user = getCurrentUser();
    if (user) showGame(user);
  }

  // Tabs
  tabLogin.addEventListener("click", () => {
    mode = "login";
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    authSubmit.textContent = "Entrar";
    authError.textContent  = "";
  });

  tabRegister.addEventListener("click", () => {
    mode = "register";
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    authSubmit.textContent = "Crear cuenta";
    authError.textContent  = "";
  });

  // Submit
  authSubmit.addEventListener("click", handleAuth);
  authPassword.addEventListener("keydown", e => {
    if (e.key === "Enter") handleAuth();
  });

  async function handleAuth() {

    const username = authUsername.value.trim();
    const password = authPassword.value;

    if (!username || !password) {
      authError.textContent = "Rellena todos los campos";
      return;
    }

    authSubmit.disabled   = true;
    authError.textContent = "";

    try {

      const data = mode === "login"
        ? await login(username, password)
        : await register(username, password);

      // Reconectar socket con el nuevo token
      // para que el servidor autentique al jugador
      if (socket.connected) {
        socket.auth = { token: data.token };
        socket.disconnect().connect();
      }

      showGame(data.user);

    } catch (err) {

      authError.textContent = err.message;

    } finally {

      authSubmit.disabled = false;

    }

  }

  // Logout
  logoutButton.addEventListener("click", () => logout());

}