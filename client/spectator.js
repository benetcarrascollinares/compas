/*
=================================
MODO ESPECTADOR — Compás
Ver partidas en tiempo real con notas
=================================
*/

import { socket } from "./socket.js";

let spectatorActive = false;
let spectatorData   = {};
let spectatorRoom   = null;

// Referencias al juego del espectador
// Dos sets de notas — uno por jugador
let specNotes      = { 0: [], 1: [] };
let specBeatmap    = [];
let specStartTime  = null;
let specDuration   = 30000;
let specRunning    = false;
let specAudio      = null;

const TRAVEL_TIME  = 2000;
const HIT_LINE     = 300;

// Colores por jugador (no por lane)
const PLAYER_COLORS = ["#ffcc00", "#00e5ff"]; // dorado y cian

/*
=================================
PANEL PRINCIPAL
=================================
*/

export function showSpectatorPanel() {
  const panel = document.getElementById("spectatorPanel");
  if (panel) {
    panel.style.display = "flex";
    loadActiveMatches();
  }
}

export function hideSpectatorPanel() {
  const panel = document.getElementById("spectatorPanel");
  if (panel) panel.style.display = "none";
  stopSpectating();
}

/*
=================================
LISTA DE PARTIDAS
=================================
*/

function loadActiveMatches() {

  const content = document.getElementById("spectatorContent");
  if (!content) return;

  content.innerHTML = `<div class="spectator-loading">🔍 Buscando partidas...</div>`;

  socket.emit("getActiveMatches", (res) => {

    if (!res?.matches?.length) {
      content.innerHTML = `
        <div class="spectator-empty">
          😴 No hay partidas en curso<br>
          <small>Vuelve cuando haya jugadores activos</small>
        </div>
        <button id="btnRefreshMatches" class="tournament-btn" style="margin-top:12px">
          🔄 Actualizar
        </button>
      `;
      document.getElementById("btnRefreshMatches")
        ?.addEventListener("click", loadActiveMatches);
      return;
    }

    content.innerHTML = `
      <h3 style="color:#ffcc00;margin-bottom:12px">
        🎮 Partidas en curso (${res.matches.length})
      </h3>
      ${res.matches.map(m => `
        <div class="spectator-match" data-room="${m.room}">
          <div class="spectator-match-players">
            <span>${m.players[0]?.username ?? "?"}</span>
            <span class="vs">VS</span>
            <span>${m.players[1]?.username ?? "?"}</span>
          </div>
          <div class="spectator-match-info">
            <small>${m.songName ?? ""} · ${m.difficulty ?? ""}</small>
          </div>
          <button class="tournament-btn primary btn-watch" data-room="${m.room}">
            👁 Ver
          </button>
        </div>
      `).join("")}
      <button id="btnRefreshMatches" class="tournament-btn" style="margin-top:8px">
        🔄 Actualizar
      </button>
    `;

    document.querySelectorAll(".btn-watch").forEach(btn => {
      btn.addEventListener("click", () => startSpectating(btn.dataset.room));
    });

    document.getElementById("btnRefreshMatches")
      ?.addEventListener("click", loadActiveMatches);

  });

}

/*
=================================
INICIAR ESPECTADO
=================================
*/

async function startSpectating(room) {

  socket.emit("spectate", { room }, async (res) => {

    if (!res?.ok) {
      alert("No se pudo unir como espectador");
      return;
    }

    spectatorActive = true;
    spectatorRoom   = room;
    spectatorData   = {};

    res.players.forEach((p, i) => {
      spectatorData[p.username] = {
        username: p.username,
        elo:      p.elo,
        score:    0,
        hp:       100,
        index:    i
      };
    });

    showSpectatorView(res.players, res);

    // Cargar beatmap si la partida ya está en curso
    const songId     = res.songId;
    const difficulty = res.difficulty || "normal";
    const audioUrl   = res.audioUrl;
    const startAt    = res.startAt;

    if (songId) {
        await loadSpectatorGame(songId, difficulty, audioUrl, startAt);
    }

  });

}

/*
=================================
CARGAR BEATMAP + AUDIO
=================================
*/

async function loadSpectatorGame(songId, difficulty, audioUrl, startAt) {

  console.log("loadSpectatorGame:", { songId, difficulty, audioUrl, startAt });

  try {
    const mod = await import(
      `./songs/${songId}_${difficulty}.js?v=${Date.now()}`
    );

    // Dos copias del beatmap — una por jugador
    specBeatmap   = [
      mod.beatmap.map(n => ({ ...n })),
      mod.beatmap.map(n => ({ ...n }))
    ];
    specDuration  = mod.duration || 30000;
    specNotes     = { 0: [], 1: [] };

    // Cargar audio
    if (audioUrl) {
      specAudio = new Audio(audioUrl);
      specAudio.preload = "auto";

      specAudio.addEventListener("canplaythrough", () => {
        // Sincronizar con el tiempo actual de la partida
        const elapsed = (Date.now() - startAt) / 1000;
        specAudio.currentTime = Math.max(0, elapsed);
        specAudio.play().catch(() => {});
      }, { once: true });
    }

    specStartTime = startAt;
    specRunning   = true;

    requestAnimationFrame(specLoop);

  } catch (err) {
    console.warn("Espectador: no se pudo cargar el beatmap", err);
  }

}

/*
=================================
GAME LOOP DEL ESPECTADOR
=================================
*/

function specLoop() {

  if (!specRunning || !spectatorActive) return;

  const elapsed = Date.now() - specStartTime;

  // Spawnear notas para ambos jugadores
  [0, 1].forEach(playerIdx => {

    const beatmap = specBeatmap[playerIdx];
    if (!beatmap) return;

    beatmap.forEach(data => {
      if (data.spawned) return;
      const spawnTime = data.hold > 0
        ? data.time - TRAVEL_TIME - data.hold
        : data.time - TRAVEL_TIME;
      if (elapsed < spawnTime) return;

      const note = {
        time:      data.time,
        lane:      data.lane,
        hold:      data.hold || 0,
        y:         0,
        hit:       false,
        missed:    false,
        element:   null,
        playerIdx
      };

      specNotes[playerIdx].push(note);
      data.spawned = true;
      createSpecNote(note, playerIdx);
    });

  });

  // Actualizar posiciones de ambos sets
  [0, 1].forEach(playerIdx => {
    specNotes[playerIdx].forEach(note => {
      if (note.hit || note.missed) return;

      const progress = (elapsed - (note.time - TRAVEL_TIME)) / TRAVEL_TIME;
      note.y = progress * HIT_LINE;

      if (note.element) {
        note.element.style.transform = `translateY(${note.y}px)`;
      }

      // Miss automático si pasa la hitline
      if (elapsed > note.time + 300) {
        note.missed = true;
        note.element?.remove();
        note.element = null;
      }
    });
  });

  if (elapsed > specDuration) {
    specRunning = false;
    return;
  }

  requestAnimationFrame(specLoop);
}

/*
=================================
CREAR NOTA EN EL CANVAS ESPECTADOR
=================================
*/

const LANE_X = { d: 0, f: 1, j: 2, k: 3 };
// p1 ocupa la mitad izquierda (0-199px), p2 la derecha (200-399px)
const PLAYER_LANE_OFFSET = [0, 200]; // offset horizontal por jugador

function createSpecNote(note, playerIdx) {

  const canvas = document.getElementById("specCanvas");
  if (!canvas) return;

  const color  = PLAYER_COLORS[playerIdx] ?? "#ffcc00";
  const offset = PLAYER_LANE_OFFSET[playerIdx] ?? 0;
  const x      = LANE_X[note.lane] * 50 + offset + 5;

  const el = document.createElement("div");
  el.className   = "spec-note";
  el.textContent = note.lane.toUpperCase();
  el.style.left  = `${x}px`;
  el.style.background = color;
  el.style.width  = "40px";
  el.style.height = "40px";
  el.style.fontSize = "14px";

  canvas.appendChild(el);
  note.element = el;

}

/*
=================================
PROCESAR HIT RECIBIDO
=================================
*/

function processSpectatorHit(username, key, result) {

  if (!key) return;

  // Encontrar el índice del jugador
  const player = spectatorData[username];
  if (!player) return;
  const playerIdx = player.index;

  // Buscar en las notas de ese jugador
  const note = specNotes[playerIdx]?.find(n =>
    !n.hit && !n.missed &&
    n.lane === key &&
    Math.abs(n.y - HIT_LINE) < 100
  );

  if (!note) return;

  note.hit = true;

  if (note.element) {
    note.element.style.opacity    = "0";
    note.element.style.transition = "opacity .15s";
    setTimeout(() => {
      note.element?.remove();
      note.element = null;
    }, 150);
  }

  showSpecFeedback(key, result, playerIdx);

}

function showSpecFeedback(key, result, playerIdx) {

  const canvas = document.getElementById("specCanvas");
  if (!canvas) return;

  const playerColor = PLAYER_COLORS[playerIdx] ?? "#ffcc00";
  const offset      = PLAYER_LANE_OFFSET[playerIdx] ?? 0;
  const x           = LANE_X[key] * 50 + offset + 5;

  const el = document.createElement("div");
  el.className = "spec-feedback";
  el.textContent = result?.toUpperCase() ?? "HIT";
  el.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${HIT_LINE - 30}px;
    color: ${playerColor};
    font-size: 10px;
    font-weight: bold;
    pointer-events: none;
    animation: specFeedbackAnim .5s forwards;
    text-shadow: 0 0 4px ${playerColor};
  `;

  canvas.appendChild(el);
  setTimeout(() => el.remove(), 500);

}

/*
=================================
VISTA ESPECTADOR
=================================
*/

function showSpectatorView(players, res) {

  const content = document.getElementById("spectatorContent");
  if (!content) return;

  const p1 = players[0] ?? { username: "Jugador 1" };
  const p2 = players[1] ?? { username: "Jugador 2" };

  content.innerHTML = `
    <div class="spectator-hud">
      <div class="spectator-player">
        <div class="spectator-name">${p1.username}</div>
        <div class="spectator-score" id="spec-score-0">0</div>
        <div class="spectator-hp-bar">
          <div class="spectator-hp-fill" id="spec-hp-0" style="width:100%"></div>
        </div>
      </div>

      <div class="spectator-center">
        <div>👁 EN VIVO</div>
        <div style="margin-top:6px;font-size:10px;display:flex;flex-direction:column;gap:2px">
          <span style="color:#ffcc00">■ ${p1.username}</span>
          <span style="color:#00e5ff">■ ${p2.username}</span>
        </div>
      </div>

      <div class="spectator-player right">
        <div class="spectator-name">${p2.username}</div>
        <div class="spectator-score" id="spec-score-1">0</div>
        <div class="spectator-hp-bar">
          <div class="spectator-hp-fill" id="spec-hp-1" style="width:100%"></div>
        </div>
      </div>
    </div>

    ${res?.songId ? `
    <div id="specGameWrapper" style="display:flex;justify-content:center;margin-top:8px">
      <div id="specCanvas" style="
        position: relative;
        width: 400px;
        height: 500px;
        background: #222;
        border: 2px solid #fff;
        overflow: hidden;
      ">
        <!-- Lane lines p1 (izquierda 0-200) -->
        <div style="position:absolute;left:50px;top:0;bottom:0;width:1px;background:#333"></div>
        <div style="position:absolute;left:100px;top:0;bottom:0;width:1px;background:#333"></div>
        <div style="position:absolute;left:150px;top:0;bottom:0;width:1px;background:#333"></div>
        <!-- Divisor central -->
        <div style="position:absolute;left:200px;top:0;bottom:0;width:2px;background:#555"></div>
        <!-- Lane lines p2 (derecha 200-400) -->
        <div style="position:absolute;left:250px;top:0;bottom:0;width:1px;background:#333"></div>
        <div style="position:absolute;left:300px;top:0;bottom:0;width:1px;background:#333"></div>
        <div style="position:absolute;left:350px;top:0;bottom:0;width:1px;background:#333"></div>
        <!-- Hitline -->
        <div style="position:absolute;left:0;right:0;top:300px;height:2px;background:#fff"></div>
        <!-- Labels p1 -->
        <div style="position:absolute;bottom:8px;left:0;width:200px;display:flex;color:#ffcc0099;font-size:10px">
          <div style="flex:1;text-align:center">D</div>
          <div style="flex:1;text-align:center">F</div>
          <div style="flex:1;text-align:center">J</div>
          <div style="flex:1;text-align:center">K</div>
        </div>
        <!-- Labels p2 -->
        <div style="position:absolute;bottom:8px;left:200px;width:200px;display:flex;color:#00e5ff99;font-size:10px">
          <div style="flex:1;text-align:center">D</div>
          <div style="flex:1;text-align:center">F</div>
          <div style="flex:1;text-align:center">J</div>
          <div style="flex:1;text-align:center">K</div>
        </div>
      </div>
    </div>
    ` : `
    <div style="text-align:center;padding:20px;color:#666;font-size:13px">
      ⏳ Cargando datos de la partida...
    </div>
    `}

    <button id="btnStopSpectating" class="tournament-btn danger" style="margin-top:12px">
      ✕ Dejar de ver
    </button>
  `;

  document.getElementById("btnStopSpectating")
    ?.addEventListener("click", () => {
      stopSpectating();
      loadActiveMatches();
    });

}

/*
=================================
PARAR ESPECTADO
=================================
*/

function stopSpectating() {
  if (!spectatorActive) return;
  spectatorActive = false;
  specRunning     = false;
  spectatorRoom   = null;

  if (specAudio) {
    specAudio.pause();
    specAudio = null;
  }

  [0,1].forEach(i => specNotes[i]?.forEach(n => n.element?.remove()));
  specNotes    = { 0: [], 1: [] };
  specBeatmap  = [];

  socket.emit("stopSpectating");
}

/*
=================================
SOCKET LISTENERS
=================================
*/

socket.on("spectatorUpdate", (data) => {

  if (!spectatorActive) return;

  const player = spectatorData[data.username];
  if (!player) return;

  const idx = player.index;

  if (data.type === "score" || data.type === "hit") {
    if (data.score !== undefined) {
      player.score = data.score;
      const el = document.getElementById(`spec-score-${idx}`);
      if (el) el.textContent = data.score.toLocaleString();
    }

    // Procesar hit visualmente
    if (data.type === "hit" && data.key) {
      processSpectatorHit(data.username, data.key, data.result);
    }
  }

  if (data.type === "hp") {
    player.hp = data.hp;
    const el  = document.getElementById(`spec-hp-${idx}`);
    if (el) {
      el.style.width      = `${data.hp}%`;
      el.style.background = data.hp > 60 ? "#4caf50"
                          : data.hp > 30 ? "#ffcc00"
                          : "#f44336";
    }
  }

});

socket.on("spectatorGameFinished", (data) => {

  if (!spectatorActive) return;

  specRunning = false;
  if (specAudio) { specAudio.pause(); specAudio = null; }

  const area = document.getElementById("specGameWrapper") ||
               document.getElementById("spectatorContent");

  const resultDiv = document.createElement("div");
  resultDiv.style.cssText = "text-align:center;padding:20px";
  resultDiv.innerHTML = `
    <div style="font-size:32px">${data.winner ? "🏆" : "🤝"}</div>
    <div style="font-size:20px;font-weight:bold;color:#ffcc00;margin:8px 0">
      ${data.winner ? `${data.winner} gana!` : "¡Empate!"}
    </div>
    <div style="color:#888">
      ${data.player1}: ${data.score1?.toLocaleString()} —
      ${data.player2}: ${data.score2?.toLocaleString()}
    </div>
  `;

  const wrapper = document.getElementById("specGameWrapper");
  if (wrapper) wrapper.replaceWith(resultDiv);

  spectatorActive = false;

});

// Espectador recibe info de la partida cuando el juego arranca
socket.on("spectatorGameStart", (data) => {
  if (!spectatorRoom) return; // no estamos espectando ninguna sala

  // Resetear para nueva partida (rematch)
  specRunning = false;
  [0,1].forEach(i => specNotes[i]?.forEach(n => n.element?.remove()));
  specNotes   = { 0: [], 1: [] };
  specBeatmap = [];
  if (specAudio) { specAudio.pause(); specAudio = null; }
  spectatorActive = true;

  // Resetear scores y HP
  document.querySelectorAll(".spectator-score")
    .forEach(el => el.textContent = "0");
  document.querySelectorAll(".spectator-hp-fill")
    .forEach(el => { el.style.width = "100%"; el.style.background = "#4caf50"; });

  // Restaurar canvas si fue reemplazado por el mensaje del ganador
  const existing = document.getElementById("specCanvas");
  if (!existing) {
    const wrapper = document.getElementById("specGameWrapper");
    const stopBtn = document.getElementById("btnStopSpectating");
    if (stopBtn) {
      const newWrapper = document.createElement("div");
      newWrapper.id = "specGameWrapper";
      newWrapper.style.cssText = "display:flex;justify-content:center;margin-top:8px";
      newWrapper.innerHTML = `
        <div id="specCanvas" style="
          position:relative;width:400px;height:500px;
          background:#222;border:2px solid #fff;overflow:hidden;
        ">
          <div style="position:absolute;left:50px;top:0;bottom:0;width:1px;background:#333"></div>
          <div style="position:absolute;left:100px;top:0;bottom:0;width:1px;background:#333"></div>
          <div style="position:absolute;left:150px;top:0;bottom:0;width:1px;background:#333"></div>
          <div style="position:absolute;left:200px;top:0;bottom:0;width:2px;background:#555"></div>
          <div style="position:absolute;left:250px;top:0;bottom:0;width:1px;background:#333"></div>
          <div style="position:absolute;left:300px;top:0;bottom:0;width:1px;background:#333"></div>
          <div style="position:absolute;left:350px;top:0;bottom:0;width:1px;background:#333"></div>
          <div style="position:absolute;left:0;right:0;top:300px;height:2px;background:#fff"></div>
        </div>
      `;
      stopBtn.parentNode.insertBefore(newWrapper, stopBtn);
    }
  }

  loadSpectatorGame(
    data.songId,
    data.difficulty || "normal",
    data.audioUrl,
    data.startAt
  );
});