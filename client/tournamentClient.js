import { socket } from "./socket.js";

/*
=================================
ESTADO LOCAL
=================================
*/

let currentTournament = null;

/*
=================================
CREAR TORNEO
=================================
*/

export function createTournament(size = 4) {

  return new Promise((resolve, reject) => {

    socket.emit("createTournament", { size }, (res) => {

      if (!res.ok) {
        reject(res.error);
        return;
      }

      currentTournament = {
        id:   res.tournamentId,
        code: res.code
      };

      resolve(res);

    });

  });

}

/*
=================================
COLA RÁPIDA
=================================
*/

export function joinQuickQueue(size) {

  // Ocultar botones, mostrar estado
  document.getElementById("quickTournamentActions").style.display = "none";
  const statusEl = document.getElementById("quickQueueStatus");
  const leaveBtn = document.getElementById("btnLeaveQueue");

  statusEl.style.display = "block";
  statusEl.textContent   = `⏳ En cola... 1/${size}`;
  leaveBtn.style.display = "block";

  socket.emit("joinQuickTournament", { size }, (res) => {

    if (!res?.ok) {
      statusEl.textContent = `❌ ${res?.error || "Error"}`;
      leaveBtn.style.display = "none";
      document.getElementById("quickTournamentActions").style.display = "flex";
      return;
    }

    // position y total vienen en res si no está listo aún
    if (res.position) {
      statusEl.textContent = `⏳ En cola... ${res.position}/${res.total}`;
    }

  });

}

/*
=================================
UNIRSE A TORNEO
=================================
*/

export function joinTournament(code) {

  return new Promise((resolve, reject) => {

    socket.emit("joinTournament", { code }, (res) => {

      if (!res.ok) {
        reject(res.error);
        return;
      }

      currentTournament = {
        id:   res.tournamentId,
        code: res.code
      };

      resolve(res);

    });

  });

}

/*
=================================
VOTAR CANCIONES
=================================
*/

export function submitVotes(votes) {

  if (!currentTournament) return;

  socket.emit("tournamentVote", {
    tournamentId: currentTournament.id,
    votes
  });

}

/*
=================================
PANTALLA TORNEO — MODAL PRINCIPAL
=================================
*/

export function showTournamentLobby() {

  // Crear modal si no existe
  if (document.getElementById("tournamentModal")) return;

  const modal = document.createElement("div");
  modal.id = "tournamentModal";
  modal.innerHTML = `
    <div id="tournamentModalInner">
      <button id="tournamentClose">✕</button>
      <div id="tournamentContent">
        ${renderLobbyMenu()}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("tournamentClose")
    .addEventListener("click", closeTournamentModal);

  bindLobbyEvents();

}

function closeTournamentModal() {
  document.getElementById("tournamentModal")?.remove();
  currentTournament = null;
}

/*
=================================
MENÚ INICIAL
=================================
*/

function renderLobbyMenu() {
  return `
    <h2>🏆 Torneos</h2>

    <div class="tournament-section">
      <div class="tournament-section-title">⚡ Torneo rápido</div>
      <p class="tournament-subtitle">Únete a la cola y empieza cuando haya suficientes jugadores</p>
      <div id="quickTournamentActions">
        <button id="btnQuick4" class="tournament-btn primary">
          ⚡ Cola rápida — 4 jugadores
        </button>
        <button id="btnQuick8" class="tournament-btn primary">
          ⚡ Cola rápida — 8 jugadores
        </button>
      </div>
      <div id="quickQueueStatus" style="display:none" class="tournament-subtitle"></div>
      <button id="btnLeaveQueue" class="tournament-btn danger" style="display:none">
        ✕ Salir de la cola
      </button>
    </div>

    <div class="tournament-divider">— o con amigos —</div>

    <div class="tournament-section">
      <div class="tournament-section-title">🎮 Torneo con amigos</div>
      <div id="tournamentActions">
        <button id="btnCreate4" class="tournament-btn">
          ✨ Crear torneo — 4 jugadores
        </button>
        <button id="btnCreate8" class="tournament-btn">
          ✨ Crear torneo — 8 jugadores
        </button>
        <div class="tournament-divider">o</div>
        <div id="joinRow">
          <input
            id="tournamentCodeInput"
            type="text"
            placeholder="Código (ej: NEON42)"
            maxlength="8"
          >
          <button id="btnJoinTournament" class="tournament-btn">
            Unirse
          </button>
        </div>
      </div>
    </div>
    <div id="tournamentError" class="tournament-error"></div>
  `;
}

function bindLobbyEvents() {

  // ── Cola rápida ──────────────────────────────────────────
  [4, 8].forEach(size => {
    document.getElementById(`btnQuick${size}`)
      ?.addEventListener("click", () => joinQuickQueue(size));
  });

  document.getElementById("btnLeaveQueue")
    ?.addEventListener("click", () => {
      socket.emit("leaveQuickTournament");
      document.getElementById("quickQueueStatus").style.display    = "none";
      document.getElementById("btnLeaveQueue").style.display       = "none";
      document.getElementById("quickTournamentActions").style.display = "flex";
    });

  // ── Con amigos ───────────────────────────────────────────
  document.getElementById("btnCreate4")
    ?.addEventListener("click", async () => {
      try {
        const res = await createTournament(4);
        showWaitingRoom(res.code, res.players || [], 4);
      } catch (err) { showTournamentError(err); }
    });

  document.getElementById("btnCreate8")
    ?.addEventListener("click", async () => {
      try {
        const res = await createTournament(8);
        showWaitingRoom(res.code, res.players || [], 8);
      } catch (err) { showTournamentError(err); }
    });

  document.getElementById("btnJoinTournament")
    ?.addEventListener("click", async () => {
      const code = document.getElementById("tournamentCodeInput")?.value.trim();
      if (!code) return;
      try {
        await joinTournament(code);
      } catch (err) { showTournamentError(err); }
    });

  document.getElementById("tournamentCodeInput")
    ?.addEventListener("keydown", e => {
      if (e.key === "Enter") document.getElementById("btnJoinTournament")?.click();
    });

}

/*
=================================
SALA DE ESPERA
=================================
*/

function showWaitingRoom(code, players, size = 4) {

  const content = document.getElementById("tournamentContent");
  if (!content) return;

  content.innerHTML = `
    <h2>🏆 Torneo</h2>
    <div id="tournamentCode">
      Código: <span>${code}</span>
      <button id="copyCode" title="Copiar">📋</button>
    </div>
    <p class="tournament-subtitle">Comparte el código con tus amigos</p>

    <div id="tournamentPlayers">
      ${renderPlayerSlots(players, size)}
    </div>

    <div id="tournamentWaitMsg">⏳ Esperando jugadores...</div>
  `;

  document.getElementById("copyCode")?.addEventListener("click", () => {
    navigator.clipboard.writeText(code);
    document.getElementById("copyCode").textContent = "✅";
    setTimeout(() => {
      if (document.getElementById("copyCode"))
        document.getElementById("copyCode").textContent = "📋";
    }, 1500);
  });

}

function renderPlayerSlots(players, size) {

  const slots = [];

  for (let i = 0; i < size; i++) {
    const p = players[i];
    if (p) {
      slots.push(`
        <div class="tournament-player filled">
          <span class="player-name">${p.username}</span>
          <span class="player-elo">⭐ ${p.elo}</span>
        </div>
      `);
    } else {
      slots.push(`
        <div class="tournament-player empty">
          <span>Esperando...</span>
        </div>
      `);
    }
  }

  return slots.join("");

}

/*
=================================
PANTALLA DE VOTACIÓN
=================================
*/

export function showVotingScreen({ songs, numRounds, roundNames, tournamentId }) {

  const content = document.getElementById("tournamentContent");
  if (!content) return;

  // Guardar selecciones
  const selected = {};
  for (let r = 0; r < numRounds; r++) selected[r] = null;

  content.innerHTML = `
    <h2>🎵 Elige las canciones</h2>
    <p class="tournament-subtitle">Una canción por ronda</p>

    <div id="votingRounds">
      ${Array.from({length: numRounds}, (_, r) => `
        <div class="voting-round">
          <div class="voting-round-label">${roundNames[r]}</div>
          <div class="voting-songs" data-round="${r}">
            ${songs.map(s => `
              <div class="voting-song" data-song="${s.id}" data-round="${r}">
                <div class="voting-song-name">${s.name}</div>
                <div class="voting-song-artist">${s.artist}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>

    <div id="voteProgress"></div>
    <button id="btnSubmitVotes" class="tournament-btn primary" disabled>
      ✅ Confirmar votos
    </button>
  `;

  // Selección de canciones
  content.querySelectorAll(".voting-song").forEach(el => {

    el.addEventListener("click", () => {

      const round  = parseInt(el.dataset.round);
      const songId = el.dataset.song;

      // Deseleccionar otros de la misma ronda
      content.querySelectorAll(`.voting-song[data-round="${round}"]`)
        .forEach(s => s.classList.remove("selected"));

      el.classList.add("selected");
      selected[round] = songId;

      // Habilitar confirmar si todas las rondas tienen voto
      const allSelected = Object.values(selected).every(v => v !== null);
      const btn = document.getElementById("btnSubmitVotes");
      if (btn) btn.disabled = !allSelected;

    });

  });

  document.getElementById("btnSubmitVotes")
    ?.addEventListener("click", () => {

      submitVotes(selected);

      document.getElementById("btnSubmitVotes").disabled = true;
      document.getElementById("btnSubmitVotes").textContent = "⏳ Esperando...";

    });

}

/*
=================================
PROGRESO DE VOTACIÓN
=================================
*/

export function updateVoteProgress(voted, total) {

  const el = document.getElementById("voteProgress");
  if (el) {
    el.textContent = `${voted}/${total} jugadores han votado`;
  }

}

/*
=================================
BRACKET SCREEN
=================================
*/

export function showBracket({ bracket, roundSongs, roundNames, currentRound = 0 }) {

  const content = document.getElementById("tournamentContent");
  if (!content) return;

  content.innerHTML = `
    <h2>🏆 Bracket</h2>
    <div id="bracketView">
      ${bracket.map((round, r) => `
        <div class="bracket-round ${r === currentRound ? "active" : ""}">
          <div class="bracket-round-label">
            ${roundNames[r]}
            ${roundSongs[r] ? `<span class="bracket-song">🎵 ${roundSongs[r]}</span>` : ""}
          </div>
          ${round.map(match => `
            <div class="bracket-match ${match.status}">
              <div class="bracket-player ${match.winner === match.player1?.socketId ? "winner" : ""}">
                ${match.player1?.username ?? "?"}
              </div>
              <div class="bracket-vs">vs</div>
              <div class="bracket-player ${match.winner === match.player2?.socketId ? "winner" : ""}">
                ${match.player2?.username ?? "?"}
              </div>
            </div>
          `).join("")}
        </div>
      `).join("")}
    </div>
    <div id="bracketStatus">🎮 ¡Que empiece el torneo!</div>
  `;

}

export function updateBracket(bracket, currentRound, roundNames, roundSongs) {

  // Re-render el bracket con el estado actualizado
  showBracket({ bracket, roundSongs, roundNames, currentRound });

}

/*
=================================
PANTALLA CAMPEÓN
=================================
*/

export function showChampion(champion, positions) {

  if (!document.getElementById("tournamentModal")) {
    const modal = document.createElement("div");
    modal.id = "tournamentModal";
    modal.innerHTML = `
      <div id="tournamentModalInner">
        <div id="tournamentContent"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const content = document.getElementById("tournamentContent");
  if (!content) return;

  // Determinar posición del jugador actual
  const myId = socket.id;
  let medal = "🥉";
  let position = "3º";
  let title = "¡TORNEO TERMINADO!";

  if (positions) {
    if (positions.first === myId) {
      medal = "🏆"; position = "1º"; title = "¡CAMPEÓN!";
    } else if (positions.second === myId) {
      medal = "🥈"; position = "2º"; title = "¡FINALISTA!";
    } else if (positions.third?.includes(myId)) {
      medal = "🥉"; position = "3º"; title = "¡SEMIFINALISTA!";
    }
  } else {
    // Fallback sin positions
    if (champion?.socketId === myId) {
      medal = "🏆"; position = "1º"; title = "¡CAMPEÓN!";
    }
  }

  const isChampion = positions?.first === myId || champion?.socketId === myId;

  content.innerHTML = `
    <div id="championScreen">
      <div id="championTrophy">${medal}</div>
      <div id="championPosition">${position}</div>
      <h2>${title}</h2>
      <div id="championName">🏆 ${champion?.username ?? "?"}</div>
      <div id="championElo">⭐ ${champion?.elo ?? "?"} ELO</div>
      ${isChampion
        ? `<div id="championTitle">🎖️ Has desbloqueado el título <strong>👑 Campeón</strong></div>`
        : ""
      }
      <button id="btnCloseTournament" class="tournament-btn primary">
        Volver al lobby
      </button>
    </div>
  `;

  document.getElementById("btnCloseTournament")
    ?.addEventListener("click", closeTournamentModal);

}

/*
=================================
HELPERS
=================================
*/

function showTournamentError(msg) {
  const el = document.getElementById("tournamentError");
  if (el) el.textContent = msg;
}

export function getCurrentTournamentId() {
  return currentTournament?.id;
}

/*
=================================
SOCKET LISTENERS
=================================
*/

// ── Cola rápida ──────────────────────────────────────────────
socket.on("quickTournamentJoined", (data) => {
  // El torneo rápido está listo — actualizar estado
  currentTournament = { id: data.tournamentId, code: data.code };

  const statusEl = document.getElementById("quickQueueStatus");
  if (statusEl) statusEl.textContent = `✅ Torneo iniciado! ${data.size} jugadores`;
});

socket.on("quickQueueUpdate", (data) => {
  const statusEl = document.getElementById("quickQueueStatus");
  if (statusEl && statusEl.style.display !== "none") {
    statusEl.textContent = `⏳ En cola... ${data.current}/${data.total}`;
  }
});

socket.on("tournamentUpdate", (data) => {

  // Actualizar sala de espera
  const el = document.getElementById("tournamentPlayers");
  if (el) {
    el.innerHTML = renderPlayerSlots(data.players, data.size);
  }

  const waitMsg = document.getElementById("tournamentWaitMsg");
  if (waitMsg) {
    waitMsg.textContent =
      `⏳ ${data.players.length}/${data.size} jugadores`;
  }

});

socket.on("tournamentVoting", (data) => {
  showVotingScreen(data);
});

socket.on("tournamentVoteProgress", (data) => {
  updateVoteProgress(data.voted, data.total);
});

socket.on("tournamentStart", (data) => {

  const roundNames = data.roundNames || ["Semifinal", "Final"];

  showBracket({
    bracket:     data.bracket,
    roundSongs:  data.roundSongs,
    roundNames,
    currentRound: 0
  });

  // Countdown antes de empezar
  const status = document.getElementById("bracketStatus");
  if (status) {
    let secs = 3;
    status.textContent = `🎮 Iniciando en ${secs}...`;
    const t = setInterval(() => {
      secs--;
      if (secs > 0) {
        status.textContent = `🎮 Iniciando en ${secs}...`;
      } else {
        clearInterval(t);
        status.textContent = "🎮 ¡A jugar!";
      }
    }, 1000);
  }

});

socket.on("tournamentRoundAdvance", (data) => {

  const roundNames = data.bracket.length === 2
    ? ["Semifinal", "Final"]
    : ["Cuartos", "Semifinal", "Final"];

  // Reabrir el modal si está cerrado
  if (!document.getElementById("tournamentModal")) {

    const modal = document.createElement("div");
    modal.id = "tournamentModal";
    modal.innerHTML = `
      <div id="tournamentModalInner">
        <div id="tournamentContent"></div>
      </div>
    `;
    document.body.appendChild(modal);

  }

  showBracket({
    bracket:      data.bracket,
    roundSongs:   data.roundSongs,
    roundNames,
    currentRound: data.currentRound
  });

  // Countdown antes de la siguiente ronda
  const status = document.getElementById("bracketStatus");
  if (status) {
    let secs = 5;
    status.textContent = `🎮 ${roundNames[data.currentRound]} en ${secs}...`;
    const t = setInterval(() => {
      secs--;
      if (secs > 0) {
        status.textContent = `🎮 ${roundNames[data.currentRound]} en ${secs}...`;
      } else {
        clearInterval(t);
        status.textContent = `🎮 ¡Empieza la ${roundNames[data.currentRound]}!`;
      }
    }, 1000);
  }

});

socket.on("tournamentFinished", (data) => {
  showChampion(data.champion, data.positions);
});

// Cuando empieza la partida — cerrar modal y ocultar lobby
let activeTournamentData = null;

socket.on("gameStart", (data) => {

  if (!data.tournament) return;

  activeTournamentData = data.tournament;

  document.getElementById("tournamentModal")?.remove();

  const gameSetup = document.getElementById("gameSetup");
  if (gameSetup) gameSetup.style.display = "none";

  const songSelector = document.getElementById("songSelector");
  if (songSelector) songSelector.style.display = "none";

  const startButtons = document.getElementById("startButtons");
  if (startButtons) startButtons.style.display = "none";

  const difficulty = document.getElementById("difficulty");
  if (difficulty) difficulty.style.display = "none";

});

// Recibir estado del torneo (botón de seguridad)
socket.on("tournamentState", (data) => {

  if (!data) return;

  const roundNames = data.bracket?.length === 2
    ? ["Semifinal", "Final"]
    : ["Cuartos", "Semifinal", "Final"];

  if (data.status === "finished") {
    showChampion(data.champion, data.positions);
    return;
  }

  if (!document.getElementById("tournamentModal")) {
    const modal = document.createElement("div");
    modal.id = "tournamentModal";
    modal.innerHTML = `<div id="tournamentModalInner"><div id="tournamentContent"></div></div>`;
    document.body.appendChild(modal);
  }

  showBracket({
    bracket:      data.bracket,
    roundSongs:   data.roundSongNames || [],
    roundNames,
    currentRound: data.currentRoundIndex || 0
  });

});