import {
  fetchProfile,
  fetchLeaderboard,
  getCurrentUser
} from "./clientAuth.js";

import {
  renderUnlockables
} from "./clientUnlockables.js";

import {
  getTitleLabel
} from "./titles.js";

const API = "http://localhost:3000/api";

/*
=================================
ELEMENTOS
=================================
*/

const gamePanel =
  document.getElementById("gamePanel");

const profilePanel =
  document.getElementById("profilePanel");

const leaderboardPanel =
  document.getElementById("leaderboardPanel");

import { showTournamentLobby } from "./tournamentClient.js";
import { showSpectatorPanel, hideSpectatorPanel } from "./spectator.js";

const profileBtn =
  document.getElementById("profileButton");

const leaderboardBtn =
  document.getElementById("leaderboardButton");

const tournamentBtn =
  document.getElementById("tournamentButton");

const spectatorBtn =
  document.getElementById("spectatorButton");

const profileClose =
  document.getElementById("profileClose");

const leaderboardClose =
  document.getElementById("leaderboardClose");

const spectatorClose =
  document.getElementById("spectatorClose");

/*
=================================
PERFIL
=================================
*/

profileBtn.addEventListener("click", async () => {

  const user = getCurrentUser();

  if (!user) return;

  profilePanel.style.display = "block";
  gamePanel.style.display    = "none";

  renderProfile(null); // skeleton

  const data = await fetchProfile(user.username);

  if (data) {
    renderProfile(data);

    // Cargar desbloqueables debajo del perfil
    const unlockContainer =
      document.getElementById("unlockablesContent");

    if (unlockContainer) {
      renderUnlockables(data.username, unlockContainer);
    }
  } else {
    document.getElementById("profileContent")
      .innerHTML = "<p>Error cargando perfil</p>";
  }

});

profileClose.addEventListener("click", () => {

  profilePanel.style.display = "none";
  gamePanel.style.display    = "block";

});

function getRank(elo) {

  if (elo >= 1700) return { name: "Diamante", icon: "💎" };
  if (elo >= 1500) return { name: "Platino",  icon: "🔷" };
  if (elo >= 1300) return { name: "Oro",      icon: "🌟" };
  if (elo >= 1100) return { name: "Plata",    icon: "⚡" };

  return { name: "Bronce", icon: "🔥" };

}

function renderProfile(data) {

  const el =
    document.getElementById("profileContent");

  if (!data) {
    el.innerHTML = `<p class="loading">Cargando...</p>`;
    return;
  }

  const rank = getRank(data.elo);

  const historyRows = data.history.length
    ? data.history.map(m => `
        <tr class="history-row ${m.result.toLowerCase()}">
          <td>${m.result === "WIN" ? "🏆" : m.result === "LOSS" ? "😢" : "🤝"} ${m.result}</td>
          <td>${m.opponent}</td>
          <td>${m.score.toLocaleString()}</td>
          <td>${m.accuracy}%</td>
          <td>${m.difficulty}</td>
          <td>${formatDate(m.played_at)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="6" class="no-data">Sin partidas todavía</td></tr>`;

  el.innerHTML = `

    <div class="profile-header">
      <div class="profile-rank-icon">${rank.icon}</div>
      <div class="profile-info">
        <h2 class="profile-username">${data.username}</h2>
        <div class="profile-rank-name">${rank.name}</div>
        <div class="profile-elo">⭐ ${data.elo} ELO</div>
      </div>
    </div>

    <div class="stats-grid">

      <div class="stat-card">
        <div class="stat-value">${data.wins}</div>
        <div class="stat-label">Victorias</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">${data.losses}</div>
        <div class="stat-label">Derrotas</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">${data.winrate}%</div>
        <div class="stat-label">Winrate</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">${data.avg_accuracy}%</div>
        <div class="stat-label">Accuracy media</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">${(data.best_score || 0).toLocaleString()}</div>
        <div class="stat-label">Mejor puntuación</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">${data.best_combo || 0}</div>
        <div class="stat-label">Mejor combo</div>
      </div>

    </div>

    <h3 class="section-title">Últimas partidas</h3>

    <div class="history-table-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>Resultado</th>
            <th>Rival</th>
            <th>Puntos</th>
            <th>Accuracy</th>
            <th>Dificultad</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${historyRows}
        </tbody>
      </table>
    </div>

  `;

}

/*
=================================
LEADERBOARD
=================================
*/

leaderboardBtn.addEventListener("click", async () => {

  leaderboardPanel.style.display = "block";
  gamePanel.style.display        = "none";

  renderLeaderboard(null); // skeleton

  const data = await fetchLeaderboard();

  renderLeaderboard(data);

});

leaderboardClose.addEventListener("click", () => {

  leaderboardPanel.style.display = "none";
  gamePanel.style.display        = "block";

});

// Torneo
tournamentBtn?.addEventListener("click", () => {
  showTournamentLobby();
});

// Espectador
spectatorBtn?.addEventListener("click", () => {
  showSpectatorPanel();
});

spectatorClose?.addEventListener("click", () => {
  hideSpectatorPanel();
});

function renderLeaderboard(data) {

  const el =
    document.getElementById("leaderboardContent");

  if (!data) {
    el.innerHTML = `<p class="loading">Cargando...</p>`;
    return;
  }

  if (data.length === 0) {
    el.innerHTML = `<p class="no-data">Sin jugadores todavía</p>`;
    return;
  }

  const currentUser = getCurrentUser();

  const rows = data.map((p, i) => {

    const rank  = getRank(p.elo);
    const total = p.wins + p.losses;

    const winrate = total === 0
      ? 0
      : Math.round((p.wins / total) * 100);

    const isMe = currentUser?.username === p.username;

    // Posición como texto, no como medalla
    const pos =
      i === 0 ? "🥇 1º" :
      i === 1 ? "🥈 2º" :
      i === 2 ? "🥉 3º" :
      `#${i + 1}`;

    return `
      <tr class="${isMe ? "leaderboard-me" : ""}">
        <td class="rank-pos">${pos}</td>
        <td class="rank-icon" title="${rank.name}">${rank.icon}</td>
        <td class="rank-username">
          ${p.username}${isMe ? " <span class='you-tag'>(tú)</span>" : ""}
          ${p.active_title ? `<span class="rank-title">${getTitleLabel(p.active_title)}</span>` : ""}
        </td>
        <td>${p.elo}</td>
        <td>${winrate}%</td>
        <td>${p.wins}W / ${p.losses}L</td>
      </tr>
    `;

  }).join("");

  el.innerHTML = `
    <div class="rank-legend">
      🔥 Bronce &lt;1100 &nbsp;
      ⚡ Plata &lt;1300 &nbsp;
      🌟 Oro &lt;1500 &nbsp;
      🔷 Platino &lt;1700 &nbsp;
      💎 Diamante
    </div>
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Rango</th>
          <th>Jugador</th>
          <th>ELO</th>
          <th>Winrate</th>
          <th>Record</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

}

/*
=================================
HELPERS
=================================
*/

function formatDate(dateStr) {

  const d = new Date(dateStr);

  return d.toLocaleDateString(
    "es-ES",
    {
      day:   "2-digit",
      month: "2-digit",
      year:  "numeric"
    }
  );

}