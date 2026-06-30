import { socket }
from "./socket.js";

import {
  showUnlockNotification,
  getActiveSkin
}
from "./clientUnlockables.js";

import {
  setNoteColor
}
from "./renderer.js";

import {
  getCurrentUser
}
from "./clientAuth.js";

import {
  refreshUserBar
}
from "./login.js";

import {
  setStatus,
  setRoom,
  setCountdown,
  setScore,
  setOpponentScore,
  showFeedback,
  showResult,
  hideResult,
  setCombo,
  hideCombo,
  setHP,
  setEnemyHP,
  hideEnemyHP,
  setEnergy,
  showShield,
  hideShield,
  showAbilitiesHud,
  hideAbilitiesHud,
  hideGameSetup,
  showGameSetup
}
from "./ui.js";

import {
  updateNotes,
  getNotes,
  getHitLine,
  resetNotes,
  setBeatmap,
  startHoldNote,
  releaseHoldNote,
  setNotesDifficulty
}
from "./notes.js";

import {
  isPressed,
  wasReleased,
  clearReleased
}
from "./input.js";

import {
  hitNote,
  startHold,
  completeHold,
  releaseHoldEarly,
  getScore,
  getStats,
  resetScore,
  getAccuracy
}
from "./score.js";

import {
  getMaxCombo
}
from "./combo.js";

import {
    loadAudio,
    playAudio,
    stopAudio,
    getAudioTime,
    unlockAudio,
    loadSfx,
    playSfx
}
from "./audio.js";

import {
  loadSongCatalog,
  getSelectedSongId,
  getSelectedSongType,
  activateVoting,
  deactivateVoting,
  showRivalVote,
  updateRivalVoteStatus
}
from "./songSelector.js";

import {
  fetchCommunityBeatmap,
  showRatingModal
}
from "./communityClient.js";

import {
  showTournamentLobby,
  getCurrentTournamentId
}
from "./tournamentClient.js";

import {
resetHP,
getHP,
damage
}
from "./hp.js";

// import {
// getAttackDamage
// }
// from "./battle.js";

import {
  getEnergy,
  resetEnergy,
  addEnergy,
  consumeEnergy
}
from "./energy.js";

import {
hasShield,
consumeShield,
activateShield,
resetShield
}
from "./shield.js";

import {
  setDifficulty,
  getDifficulty
}
from "./difficulty.js";

import {
  startRecording,
  stopRecording,
  recordInput,
  recordScore,
  startPlayback,
  stopPlayback,
  tickPlayback,
  isPlaybackActive
}
from "./replay.js";


let currentDifficulty =
"normal";

let songDuration = 30000;

// Cargar catálogo al arrancar
loadSongCatalog();


let startAt = 0;

let running = false;

let finished = false;

let practiceMode = false;

let currentSongId   = null;
let currentSongName = null;
let isCommunity     = false;
let tournamentMatch = null; // { tournamentId, matchId } si es torneo

let pingInterval = null;

function startPingMeasure() {

  const el =
    document.getElementById("pingIndicator");

  if (!el) return;

  pingInterval = setInterval(() => {

    const start = Date.now();

    socket.emit("ping_check", () => {

      const ms = Date.now() - start;

      const color =
        ms < 50  ? "#4caf50" :
        ms < 100 ? "#ffcc00" : "#f44336";

      el.textContent  = `📶 ${ms}ms`;
      el.style.color  = color;

    });

  }, 2000);

}

function stopPingMeasure() {

  clearInterval(pingInterval);
  pingInterval = null;

  const el =
    document.getElementById("pingIndicator");

  if (el) el.textContent = "📶 --ms";

}

let reverseActive = false;
let reverseTimer = null;

let shiftPressed = false;
let spacePressed = false;
let qPressed = false;
let ePressed = false;
let rPressed = false;


const startButton =
document.getElementById(
  "startButton"
);

const practiceButton =
document.getElementById(
  "practiceButton"
);

const rematchButton =
document.getElementById(
  "rematchButton"
);

/*
=================================
PRIMERA PARTIDA
=================================
*/

startButton.addEventListener(
  "click",
  ()=>{

    loadSfx();
    unlockAudio();

    // Limpiar estado de replay si venimos de uno
    running    = false;
    replayMode = false;
    finished   = false;
    resetNotes();
    resetScore();
    setScore(0);
    stopAudio();

    startButton.style.display =
      "none";

    document
      .getElementById("startButtons")
      .style.display = "none";

    practiceMode = false;

    // Restaurar rival score y HP por si venimos de práctica
    const opp = document.getElementById("opponent");
    if (opp) opp.parentElement.style.display = "";
    setOpponentScore(0); // resetear score rival correctamente
    const matchInfo = document.getElementById("matchInfo");
    if (matchInfo) matchInfo.style.display = "";

    // Restaurar barra HP rival
    const enemyHpBar = document.getElementById("enemyHpBar");
    if (enemyHpBar) enemyHpBar.style.display = "none"; // se mostrará al recibir gameStart

    hideGameSetup();

    const difficulty =
      document
      .getElementById(
        "difficulty"
      )
      .value;
      currentDifficulty =
      difficulty;

    setDifficulty(
      difficulty
    );
    setNotesDifficulty(difficulty);

    socket.emit(
      "joinQueue",
      {
        difficulty,
        songId: getSelectedSongId()
      }
    );

    setStatus(
      "⏳ Buscando rival..."
    );

  }
);

/*
=================================
PRÁCTICA
=================================
*/

practiceButton.addEventListener(
  "click",
  () => {

    loadSfx();
    unlockAudio();

    // Limpiar estado de replay si venimos de uno
    running    = false;
    replayMode = false;
    finished   = false;
    resetNotes();
    resetScore();
    setScore(0);
    stopAudio();

    practiceMode = true;

    document
      .getElementById("startButtons")
      .style.display = "none";

    hideGameSetup();

    const difficulty =
      document
      .getElementById("difficulty")
      .value;

    currentDifficulty = difficulty;
    setDifficulty(difficulty); setNotesDifficulty(difficulty);

    setStatus("🎯 Modo práctica");

    socket.emit("joinPractice", {
      songId:      getSelectedSongId(),
      isCommunity: getSelectedSongType() === "community"
    });

  }
);

/*
=================================
REMATCH
=================================
*/

// Replay button — usar delegación ya que el botón se crea dinámicamente
document.addEventListener("click", e => {
  if (e.target.id !== "replayButton") return;
  startReplayMode();
});

rematchButton.addEventListener(
  "click",
  ()=>{

    stopAudio();

    running = false;
    finished = false;

    resetNotes();
    resetScore();

    hideResult();
    hideAbilitiesHud();
    hideGameSetup();

    practiceMode = false;

    // Restaurar rival score por si venimos de práctica
    const oppEl = document.getElementById("opponent");
    if (oppEl) oppEl.parentElement.style.display = "";

    document
      .getElementById("startButtons")
      .style.display = "none";

    setScore(0);
    setOpponentScore(0);

    setCountdown("-");

    const difficulty =
    document
    .getElementById(
      "difficulty"
    )
    .value;
    currentDifficulty =
    difficulty;

    socket.emit(
      "joinQueue",
      {
        difficulty,
        songId: getSelectedSongId()
      }
    );

    setStatus(
      "⏳ Buscando rival..."
    );

  }
);

socket.on(
  "connect",
  ()=>{

    setStatus(
      "🟢 Conectado"
    );

  }
);

socket.on("onlineCount", (count) => {
  const el = document.getElementById("onlineCount");
  if (el) {
    el.textContent = `🟢 ${count} jugador${count === 1 ? "" : "es"} online`;
  }
});

socket.on(
  "waiting",
  ()=>{

    setStatus(
      "⏳ Buscando rival cercano..."
    );

    // Mensaje que va cambiando con el tiempo de espera
    let secs = 0;

    const waitTimer = setInterval(() => {

      secs += 5;

      if (secs === 15) {
        setStatus("⏳ Ampliando búsqueda...");
      } else if (secs === 45) {
        setStatus("⏳ Buscando cualquier rival...");
      }

      // Tras 20s sin encontrar rival, sugerir práctica
      if (secs === 20) {
        const suggestion = document.getElementById("noRivalSuggestion");
        if (suggestion) suggestion.style.display = "block";
      }

    }, 5000);

    // Limpiar timer cuando llegue roomCreated
    socket.once("roomCreated", () => {
      clearInterval(waitTimer);
      const suggestion = document.getElementById("noRivalSuggestion");
      if (suggestion) suggestion.style.display = "none";
    });

  }
);

document.getElementById("suggestPracticeBtn")?.addEventListener("click", () => {
  // Salir de la cola y entrar en práctica
  socket.emit("leaveQueue");
  document.getElementById("noRivalSuggestion").style.display = "none";
  document.getElementById("practiceButton")?.click();
});

socket.on(
  "roomCreated",
  data=>{

    setRoom(data.roomId);

    currentDifficulty = data.difficulty;
    setDifficulty(data.difficulty); setNotesDifficulty(data.difficulty);

    // Ocultar difficulty durante la partida
    const diffEl =
      document.getElementById("difficulty");
    if (diffEl) diffEl.style.display = "none";

    const rivalDiff =
      data.rival?.difficulty
        ? ` (${data.rival.difficulty})`
        : "";

    const rivalInfo =
      data.rival
        ? `👤 ${data.rival.username} ${data.rival.elo} ELO${rivalDiff}`
        : "👤 Rival encontrado";

    setStatus(
      `🎮 ${rivalInfo} — 🎵 Elige canción...`
    );

    activateVoting();

  }
);

socket.on(
  "rivalVote",
  data => {
    showRivalVote(data.songId);
    updateRivalVoteStatus(data.songId);
  }
);

socket.on(
  "songChosen",
  data => {

    deactivateVoting();

    // Actualizar status — ya no "Elige canción"
    setStatus(`🎵 ${data.songName} — comenzando...`);

    // Ocultar selector
    const songSel =
      document.getElementById("songSelector");
    if (songSel) songSel.style.display = "none";

    // Mostrar pantalla de canción elegida
    showSongChosenScreen(data);

  }
);

socket.on(
  "gameStart",
  async data=>{

    resetHP();

    resetEnergy();

    resetShield();
    hideShield();

    shiftPressed = false;
    spacePressed = false;

    setEnergy(
      getEnergy()
    );

    setHP(
      getHP()
    );

    socket.emit(
      "hpUpdate",
      {
        hp:getHP()
      }
    );

    finished = false;

    startAt =
      data.startAt;

    resetNotes();

    // Cargar beatmap según canción y dificultad
    const songId   = data.song.id;
    songDuration   = data.song.duration;

    currentSongId   = songId;
    currentSongName = data.song.name;
    isCommunity     = data.song.community === true;
    tournamentMatch = data.tournament || null;

    if (isCommunity) {

      // Canción comunitaria — cargar desde servidor
      const communityData = await fetchCommunityBeatmap(songId);
      setBeatmap(communityData.beatmap);

    } else {

      // Canción oficial — cargar desde archivo local
      const songModule = await import(
        `./songs/${songId}_${currentDifficulty}.js?v=${Date.now()}`
      );
      setBeatmap(songModule.beatmap);

    }

    // Aplicar skin activa del jugador
    const user = getCurrentUser();
    if (user) {
      const skinColor = await getActiveSkin(user.username);
      setNoteColor(skinColor);
    }

    // Cargar audio (puede ser null si canción comunitaria sin audio)
    if (data.song.audio) {
      loadAudio(data.song.audio);
    } else {
      // Sin audio — la partida funciona igual pero en silencio
      console.log("Canción comunitaria sin audio");
    }

    const timer =
      setInterval(
        ()=>{

          const remaining =
            Math.ceil(
              (startAt-Date.now())
              /1000
            );

          if(
            remaining>0
          ){

            setCountdown(
              remaining
            );

          }
          else{

            clearInterval(
              timer
            );

            setCountdown(
              "GO!"
            );

            setStatus(
              "🔥 Jugando"
            );

            setHP(
              getHP()
            );

            setTimeout(
              ()=>{

                playAudio();

                showAbilitiesHud();
                startPingMeasure();

                // Scroll automático al canvas cuando empieza la partida
                const gameEl = document.getElementById("game");
                if (gameEl) {
                  gameEl.scrollIntoView({
                    behavior: "smooth",
                    block:    "center"
                  });
                }

                // En práctica ocultar rival
                if (practiceMode) {
                  const opp = document.getElementById("opponent");
                  const oppLabel = opp?.nextElementSibling;
                  if (opp) opp.parentElement.style.display = "none";
                }

                running=true;
                showTouchButtons();
                startRecording(performance.now());

                requestAnimationFrame(
                  gameLoop
                );

              },
              200
            );

          }

        },
        100
      );

  }
);

function showSongChosenScreen(data) {

  const screen =
    document.getElementById("songChosenScreen");

  const nameEl =
    document.getElementById("songChosenName");

  const starsEl =
    document.getElementById("songChosenStars");

  const metaEl =
    document.getElementById("songChosenMeta");

  const labelEl =
    document.getElementById("songChosenLabel");

  const countdownEl =
    document.getElementById("songChosenCountdown");

  if (!screen) return;

  // Rellenar datos
  if (nameEl) nameEl.textContent = data.songName;

  if (starsEl) {
    // Buscar estrellas del catálogo si están disponibles
    starsEl.textContent = "";
  }

  if (metaEl) {
    metaEl.textContent = data.agreed
      ? "✅ Ambos de acuerdo"
      : "🎲 Elegida al azar";
  }

  if (labelEl) {
    labelEl.textContent = "🎵 Se jugará";
  }

  // Mostrar pantalla
  screen.style.display = "flex";

  // Countdown 2→1→GO!
  let secs = 2;

  if (countdownEl) countdownEl.textContent = secs;

  const timer = setInterval(() => {

    secs--;

    if (secs > 0) {
      if (countdownEl) countdownEl.textContent = secs;
    } else {
      clearInterval(timer);
      if (countdownEl) countdownEl.textContent = "🎵";
    }

  }, 1000);

  // Ocultar cuando llegue gameStart
  socket.once("gameStart", () => {
    screen.style.display = "none";
    clearInterval(timer);
  });

}


// Touch buttons helper

/*
=================================
REPLAY MODE
=================================
*/

let replayMode      = false;
let savedReplayData = [];

async function startReplayMode() {

  if (!savedReplayData.length) {
    alert("No hay replay disponible");
    return;
  }

  // Resetear processed flags para poder reproducir de nuevo
  savedReplayData.forEach(e => delete e.processed);

  // Preparar el juego igual que una partida normal
  replayMode = true;

  hideResult();
  hideAbilitiesHud();
  hideGameSetup();
  resetNotes();
  resetScore();
  setScore(0);  // forzar display a 0
  resetHP();

  // Cargar el beatmap
  const songId = getSelectedSongId();
  const diff   = currentDifficulty;

  try {
    if (isCommunity) {
      // Canción comunitaria — cargar desde servidor
      const communityData = await fetchCommunityBeatmap(songId);
      if (!communityData) throw new Error("No se pudo cargar la canción");
      setBeatmap([...communityData.beatmap]);
      songDuration = communityData.duration || 30000;
    } else {
      // Canción oficial — cargar desde archivo local
      const mod = await import(
        `./songs/${songId}_${diff}.js?v=${Date.now()}`
      );
      setBeatmap([...mod.beatmap]);
      songDuration = mod.duration || 30000;
    }
  } catch (err) {
    alert("No se pudo cargar el beatmap para el replay");
    replayMode = false;
    return;
  }

  // Mostrar indicador de replay
  const status = document.getElementById("status");
  if (status) status.textContent = "▶️ Reproduciendo replay...";

  // Parar audio y esperar a que se resetee
  stopAudio();
  await new Promise(r => setTimeout(r, 200));
  playAudio();

  running     = true;
  finished    = false;
  replayMode  = true;

  // Usar performance.now() como reloj propio del replay
  const replayStartTime = performance.now();

  // Iniciar playback de inputs grabados
  startPlayback(savedReplayData, () => {});

  function replayTick() {

    if (!running) return;

    // Tiempo relativo al inicio del replay (no al audio)
    const time = performance.now() - replayStartTime;

    tickPlayback(time);
    updateNotes(time);

    // Simular inputs del replay
    savedReplayData.forEach(event => {
      if (
        Math.abs(event.time - time) < 25 &&
        !event.processed
      ) {
        event.processed = true;

        if (event.type === "score" && event.score !== null) {
          // Aplicar score exacto grabado — no recalcular
          setScore(event.score);
        } else if (event.type === "down" && event.key) {
          // Solo efecto visual — no recalcular score
          checkReplayInput(event.key, time, true);
        }
      }
    });

    if (time > songDuration && !finished) {
      finished   = true;
      running    = false;
      replayMode = false;
      stopAudio();

      const status = document.getElementById("status");
      if (status) status.textContent = "✅ Replay completado";

      const sb = document.getElementById("startButtons");
      if (sb) {
        sb.style.display = "flex";
        document.getElementById("startButton").style.display    = "block";
        document.getElementById("practiceButton").style.display = "block";
      }
      showGameSetup();
      return;
    }

    requestAnimationFrame(replayTick);
  }

  requestAnimationFrame(replayTick);

}

function checkReplayInput(key, time, visualOnly = false) {

  const notes   = getNotes();
  const hitLine = getHitLine();

  // Hold note
  const holdNote = notes.find(n =>
    !n.hit && !n.missed &&
    n.hold > 0 &&
    n.lane === key &&
    n.y >= 200 && n.y <= 400
  );

  if (holdNote) {
    startHoldNote(holdNote, time);
    return;
  }

  // Nota normal
  const note = notes.find(n =>
    !n.hit && !n.missed &&
    n.hold === 0 &&
    n.lane === key &&
    Math.abs(n.y - hitLine) < 50
  );

  if (note) {
    const result = hitNote(time, note);
    note.hit = true;
    if (!visualOnly) {
      // Solo actualizar score si no es replay con score grabado
      setScore(getScore());
    }
    showFeedback(result.text);
  }

}


async function saveReplay(matchId) {
  const replayData = stopRecording();
  // Guardar globalmente para poder reproducir después
  savedReplayData = replayData;

  if (!replayData.length) return;

  const token = localStorage.getItem("rb_token");
  if (!token) return;

  try {
    await fetch(`${window.location.origin}/api/replays`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        match_id:   matchId || null,
        song_id:    getSelectedSongId(),
        difficulty: currentDifficulty,
        score:      getScore(),
        accuracy:   getAccuracy(),
        data:       replayData
      })
    });
  } catch (err) {
    console.warn("No se pudo guardar el replay:", err);
  }
}

function isMobile() {
  // Touch device Y pantalla pequeña (no tablets)
  return Math.min(window.innerWidth, window.innerHeight) <= 640;
}

function showTouchButtons() {
  const el = document.getElementById("touchButtons");
  if (el && isMobile()) el.style.display = "flex";
}

function hideTouchButtons() {
  const el = document.getElementById("touchButtons");
  if (el) el.style.display = "none";
}


// Helper para emitir hit con datos completos para espectadores
function emitHit(key = null, result = null) {
  const score = getScore();
  socket.emit("hit", {
    score,
    key,
    result,
    time: performance.now()
  });
  // Guardar score en replay para reproducción exacta
  recordScore(score, performance.now());
}

function gameLoop(){

  if(!running)
    return;

  let time =
    getAudioTime();

  if(time===0){

    time =
      Date.now()-startAt;

  }

  updateNotes(
    time
  );

  // Detectar holds completados y dar bonus
  getNotes().forEach(note => {
    if (note.holdDone && !note.holdBonusGiven) {
      note.holdBonusGiven = true;
      const result = completeHold(note);
      setScore(getScore());
      showFeedback(result.text);
      setCombo(result.combo);
      playSfx("perfect");
      emitHit();
    }
  });

  checkInput(
    time
  );

  if(
    time > songDuration &&
    !finished
  ){

    finished = true;
    running  = false;

    stopAudio();

    if (practiceMode) {

      // En práctica mostrar resultado local sin ELO
      hideCombo();
      hideAbilitiesHud();
      hideTouchButtons();
      stopPingMeasure();
      showGameSetup();

      // Restaurar rival score
      const matchInfo = document.getElementById("matchInfo");
      if (matchInfo) matchInfo.style.display = "";

      showResult({
        result:     "🎯 PRÁCTICA",
        score:      getScore(),
        stats:      getStats(),
        accuracy:   getAccuracy(),
        difficulty: currentDifficulty,
        streak:     0
      });

      saveReplay(null);

    } else {

      socket.emit(
        "gameFinished",
        {
          score:      getScore(),
          stats:      getStats(),
          accuracy:   getAccuracy(),
          maxCombo:   getMaxCombo(),
          difficulty: currentDifficulty
        }
      );

    }

    return;

  }

  requestAnimationFrame(
    gameLoop
  );

}

function checkInput(time){

  ["d","f","j","k"].forEach(key => {

    let inputKey = key;

    if (reverseActive) {
      if (key === "d") inputKey = "k";
      if (key === "k") inputKey = "d";
      if (key === "f") inputKey = "j";
      if (key === "j") inputKey = "f";
    }

    const pressed  = isPressed(inputKey);
    const released = wasReleased(inputKey);

    // Grabar inputs para replay
    if (pressed)  recordInput(key, "down", time);
    if (released) recordInput(key, "up",   time);

    // ── HOLD: soltar tecla ──────────────────
    if (released) {

      const holding = getNotes().find(n =>
        !n.missed && n.holding && n.lane === key
      );

      if (holding && !holding.holdDone) {

        const tailTime = holding.time + holding.hold;
        const earlyMs  = tailTime - time;

        const releaseWindow =
          currentDifficulty === "easy" ? 600 :
          currentDifficulty === "hard" ? 200 : 500;

        if (earlyMs <= releaseWindow) {

          // Soltado cerca del final → PERFECT
          holding.holdDone = true;
          holding.hit      = true;
          releaseHoldNote(holding);

          const result = completeHold(holding);
          setScore(getScore());
          showFeedback("PERFECT! ⭐");
          setCombo(result.combo);
          playSfx("perfect");

        } else {

          // Soltado demasiado pronto → MISS
          releaseHoldNote(holding);

          const result = releaseHoldEarly();
          setScore(getScore());
          showFeedback(result.text);
          setCombo(result.combo);
          playSfx("miss");

        }

        emitHit();

      }

    }

    // ── KEYDOWN ─────────────────────────────
    if (pressed) {

      const notes = getNotes();

      // 1) Hold activo — no hacer nada más
      const activeHold = notes.find(n =>
        !n.missed && n.holding && n.lane === key
      );

      if (activeHold) return;

      // 2) Buscar hold note — detección por posición
      // Para holds la ventana es generosa: desde 100px antes hasta 100px después
      const holdNote = notes.find(n =>
        !n.hit && !n.missed &&
        n.hold > 0 &&
        n.lane === key &&
        n.y >= 200 && n.y <= 400
      );

      if (holdNote) {

        // Activar siempre si está en rango — sin timing check
        startHoldNote(holdNote, time);

        const result = startHold(time, holdNote);
        const combo  = result?.combo ?? 0;

        // Mostrar feedback siempre
        showFeedback("HOLD! 🎯");
        setScore(getScore());

        const energy = addEnergy(2);
        setEnergy(energy);
        setCombo(combo);
        playSfx("good");

        emitHit();

        return;

      }

      // 3) Nota normal
      const note = notes.find(n =>
        !n.hit && !n.missed &&
        n.hold === 0 &&
        n.lane === key &&
        Math.abs(n.y - getHitLine()) < 50
      );

      if (note) {

        const result = hitNote(time, note);
        note.hit = true;

        setScore(getScore());
        showFeedback(result.text);

        let gained = 0;
        if (result.text.includes("PERFECT")) gained = 3;
        else if (result.text.includes("GOOD")) gained = 2;
        else if (result.text.includes("OK"))   gained = 1;

        const energy = addEnergy(gained);
        setEnergy(energy);
        setCombo(result.combo);

        if (result.text.includes("PERFECT")) playSfx("perfect");
        else if (result.text.includes("GOOD")) playSfx("good");
        else playSfx("miss");

        emitHit();

      }

    }

  });

  // Limpiar teclas soltadas al final del frame
  clearReleased();

  const space =
  isPressed(" ");

  const shift =
  isPressed("shift");


  // SPECIAL
  if(
  space &&
  !spacePressed
  ){

  specialAttack();

  }

  spacePressed = space;

  // FLASH
  const q =
  isPressed("q");


  if(
  q &&
  !qPressed
  ){

  flashAttack();

  }

  qPressed = q;

  // SHAKE
  const e =
  isPressed("e");

  if(
  e &&
  !ePressed
  ){
    shakeAttack();
  }

  ePressed = e;

  // REVERSE
  const r =
  isPressed("r");


  if(
  r &&
  !rPressed
  ){

  reverseAttack();

  }


  rPressed = r;


  // SHIELD
  if(
  shift &&
  !shiftPressed
  ){

  activatePlayerShield();

  }

  shiftPressed = shift;

}

function specialAttack(){

  if(
  getEnergy() < 100
  ){
  return;
  }

  const energy =
  consumeEnergy();

  setEnergy(
  energy
  );

  socket.emit(
  "specialAttack",
  {
  damage:30
  }
  );

  showFeedback(
  "⚡ SPECIAL!"
  );

}


function activatePlayerShield(){

  if(
  getEnergy() < 100
  ){
  return;
  }

  activateShield();

  const energy =
  consumeEnergy();

  setEnergy(
  energy
  );

  showShield();

  showFeedback(
  "🛡️ SHIELD"
  );

}

// FLASH ATTACK
function flashAttack(){

  if(
  getEnergy() < 50
  ){
  return;
  }


  const energy =
  consumeEnergy();


  setEnergy(
  energy
  );


  socket.emit(
  "battleEffect",
  {
  type:"flash"
  }
  );


  showFeedback(
  "💥 FLASH!"
  );

}

// SHAKE ATTACK
function shakeAttack(){

if(
getEnergy() < 50
){
return;
}


const energy =
consumeEnergy();


setEnergy(
energy
);


socket.emit(
"battleEffect",
{
type:"shake"
}
);


showFeedback(
"🌪️ SHAKE!"
);

}

// REVERSE ATTACK
function reverseAttack(){

  if(
  getEnergy() < 50
  ){
  return;
  }


  const energy =
  consumeEnergy();


  setEnergy(
  energy
  );


  socket.emit(
  "battleEffect",
  {
  type:"reverse"
  }
  );


  showFeedback(
  "🔄 REVERSE!"
  );

}


socket.on(
  "scoreUpdate",
  data=>{

    setOpponentScore(
      data.score
    );

  }
);

socket.on(
  "gameFinished",
  data=>{

    running = false;

    finished = true;

    hideCombo();
    hideEnemyHP();
    hideAbilitiesHud();
    stopPingMeasure();
    showGameSetup();

    showResult(
      {
        result:     data.result,
        score:      data.score,
        stats:      data.stats,
        accuracy:   data.accuracy,
        difficulty: currentDifficulty,
        streak:     data.streak ?? 0
      }
    );

    saveReplay(data.matchId || null);

    // Mostrar notificaciones de desbloqueo
    if (data.unlocks) {
      setTimeout(() => {
        showUnlockNotification(data.unlocks);
      }, 1000);
    }

    // Actualizar ELO y título en userBar
    const user = getCurrentUser();
    if (user) {
      refreshUserBar(user.username);
    }

    // Reportar resultado de torneo si aplica
    if (tournamentMatch) {
      const isWinner =
        data.result?.includes("GANASTE") ||
        data.result?.includes("VICTORIA") ||
        data.result?.includes("WIN");

      if (isWinner) {
        socket.emit("tournamentMatchResult", {
          tournamentId: tournamentMatch.tournamentId,
          matchId:      tournamentMatch.matchId,
          winnerId:     socket.id
        });
      }
      tournamentMatch = null; // reset para la siguiente ronda
    }

    // Mostrar rating modal si fue canción comunitaria
    if (isCommunity && currentSongId) {
      setTimeout(() => {
        showRatingModal(
          currentSongId,
          currentSongName,
          () => {}
        );
      }, 1500);
    }

  }
);


socket.on(
"enemyHP",
data=>{

 setEnemyHP(
  data.hp
 );

}
);


socket.on(
"takeDamage",
data=>{

  if(
    hasShield()
  ){

    consumeShield();

    hideShield();

    showFeedback(
      "🛡️ BLOCK!"
    );

    return;
  }

  const hp =
  damage(
    data.damage
  );

  setHP(
    hp
  );

  socket.emit(
    "hpUpdate",
    {
      hp
    }
  );

  if(
    hp <= 0 &&
    !finished
  ){

    socket.emit(
      "playerKO"
    );

  }

});


socket.on(
"koDefeat",
()=>{

  running = false;
  finished = true;

  hideCombo();
  hideEnemyHP();
  hideAbilitiesHud();
  stopPingMeasure();
  showGameSetup();

  stopAudio();

  showResult({
    result:"😢 KO",
    score:getScore(),
    stats:getStats(),
    accuracy:getAccuracy(),
    difficulty:
    currentDifficulty
  });

});

socket.on(
"koVictory",
()=>{

  running = false;
  finished = true;

  hideCombo();
  hideEnemyHP();
  hideAbilitiesHud();
  stopPingMeasure();
  showGameSetup();

  stopAudio();

  showResult({
    result:"🏆 VICTORIA POR KO",
    score:getScore(),
    stats:getStats(),
    accuracy:getAccuracy(),
    difficulty:
    currentDifficulty
  });

});


socket.on(
"battleEffect",
data=>{

  console.log(
    "battleEffect recibido:",
    data.type
  );

  if(
    data.type==="flash"
  ){

    document.body.classList.add(
      "flash"
    );

    setTimeout(
      ()=>{

        document.body.classList.remove(
          "flash"
        );

      },
      1000
    );

  }


  if(
    data.type==="shake"
  ){

    shakeScreen();

  }


  if(
    data.type==="reverse"
  ){

    activateReverse();

  }

});




setTimeout(
()=>{

document.body.classList.remove(
"flash"
);

},
1000
);


function shakeScreen(){

document.body.classList.add(
"shake"
);


setTimeout(
()=>{

document.body.classList.remove(
"shake"
);

},
500
);

}


function activateReverse(){

reverseActive=true;


showFeedback(
"🔄 CONTROLES INVERTIDOS!"
);


clearTimeout(
reverseTimer
);


reverseTimer =
setTimeout(
()=>{

reverseActive=false;


showFeedback(
"✅ Controles normales"
);


},
3000
);

}