/*
=================================
BEATMAP EDITOR — Rhythm Battle
=================================
*/

let audio      = null;
let notes      = [];
let isPlaying  = false;
let duration   = 0;
let PX_PER_MS  = 0.1; // pixels por ms en el timeline

// Elementos
const audioFile     = document.getElementById("audioFile");
const songName      = document.getElementById("songName");
const songArtist    = document.getElementById("songArtist");
const songStars     = document.getElementById("songStars");
const btnPlay       = document.getElementById("btnPlay");
const btnPause      = document.getElementById("btnPause");
const btnStop       = document.getElementById("btnStop");
const btnUndo       = document.getElementById("btnUndo");
const btnExport     = document.getElementById("btnExport");
const btnClear      = document.getElementById("btnClear");
const elCurrentTime = document.getElementById("currentTime");
const elTotalTime   = document.getElementById("totalTime");
const progressFill  = document.getElementById("progressFill");
const progressCursor= document.getElementById("progressCursor");
const progressBar   = document.getElementById("progressBar");
const elNoteCount   = document.getElementById("noteCount");
const elDensity     = document.getElementById("noteDensity");
const lastNotesList = document.getElementById("lastNotesList");
const feedbackEl    = document.getElementById("editorFeedback");
const timelineScroll= document.getElementById("timelineScroll");
const timelineBody  = document.getElementById("timelineBody");
const playheadEl    = document.getElementById("playheadEl");

const lanes = {
  d: document.getElementById("laneD"),
  f: document.getElementById("laneF"),
  j: document.getElementById("laneJ"),
  k: document.getElementById("laneK")
};

/*
=================================
AUDIO
=================================
*/

audioFile?.addEventListener("change", e => {

  const file = e.target.files[0];
  if (!file) return;

  audio = new Audio(URL.createObjectURL(file));
  audio.preload = "auto";

  audio.addEventListener("loadedmetadata", () => {

    duration = audio.duration * 1000;
    elTotalTime.textContent = `/ ${fmtTime(duration)}`;

    // Ajustar altura del timeline según duración
    const h = Math.max(3000, duration * PX_PER_MS + 400);
    timelineBody.style.height = `${h}px`;
    Object.values(lanes).forEach(l => l.style.height = `${h}px`);

    showFeedback(`🎵 ${file.name} cargado`);

  });

  audio.addEventListener("ended", () => {
    isPlaying = false;
    btnPlay.disabled  = false;
    btnPause.disabled = true;
  });

});

/*
=================================
TRANSPORT
=================================
*/

btnPlay?.addEventListener("click",  play);
btnPause?.addEventListener("click", pause);
btnStop?.addEventListener("click",  stop);

function play() {
  if (!audio) { showFeedback("⚠️ Carga un MP3 primero"); return; }
  audio.play();
  isPlaying = true;
  btnPlay.disabled  = true;
  btnPause.disabled = false;
  tick();
}

function pause() {
  if (!audio) return;
  audio.pause();
  isPlaying = false;
  btnPlay.disabled  = false;
  btnPause.disabled = true;
}

function stop() {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  isPlaying = false;
  btnPlay.disabled  = false;
  btnPause.disabled = true;
  updateUI(0);
}

function tick() {
  if (!audio || !isPlaying) return;
  updateUI(audio.currentTime * 1000);
  requestAnimationFrame(tick);
}

function seekTo(ms) {
  if (!audio) return;
  ms = Math.max(0, Math.min(ms, duration));
  audio.currentTime = ms / 1000;
  updateUI(ms);
}

function updateUI(ms) {

  if (!duration) return;

  // Progress bar
  const pct = (ms / duration) * 100;
  progressFill.style.width  = `${pct}%`;
  progressCursor.style.left = `${pct}%`;
  elCurrentTime.textContent = fmtPrecise(ms);

  // Playhead en el timeline
  const y = msToY(ms);
  playheadEl.style.top = `${y}px`;

  // Auto-scroll
  const viewH = timelineScroll.clientHeight;
  const scrollTarget = y - viewH / 2;
  timelineScroll.scrollTop = Math.max(0, scrollTarget);

}

// Seek por click en progress bar
progressBar?.addEventListener("click", e => {
  if (!duration) return;
  const rect = progressBar.getBoundingClientRect();
  const pct  = (e.clientX - rect.left) / rect.width;
  seekTo(pct * duration);
});

/*
=================================
TECLADO
=================================
*/

/*
=================================
HOLD NOTE EN TIEMPO REAL
Mantener tecla → nota se alarga
Soltar → nota queda con duración
=================================
*/

// Notas en curso (tecla mantenida)
const activeHolds = {}; // lane → { note, element }

window.addEventListener("keydown", e => {

  if (e.repeat) return;

  const k = e.key.toLowerCase();

  if (["input","select","textarea"].includes(
    e.target.tagName.toLowerCase()
  )) return;

  if (["d","f","j","k"].includes(k)) {
    e.preventDefault();
    startHoldOrNote(k);
    flashKey(k);
    return;
  }

  if (k === " ") {
    e.preventDefault();
    isPlaying ? pause() : play();
    return;
  }

  if (k === "z") { undoNote(); return; }

  if (k === "delete" || k === "backspace") {
    e.preventDefault();
    deleteNearest();
    return;
  }

  if (k === "arrowleft") {
    e.preventDefault();
    seekTo((audio?.currentTime ?? 0) * 1000 - 500);
    return;
  }

  if (k === "arrowright") {
    e.preventDefault();
    seekTo((audio?.currentTime ?? 0) * 1000 + 500);
    return;
  }

});

window.addEventListener("keyup", e => {

  const k = e.key.toLowerCase();
  if (!["d","f","j","k"].includes(k)) return;
  if (["input","select","textarea"].includes(
    e.target.tagName.toLowerCase()
  )) return;

  finishHoldOrNote(k);

});

// Botones táctiles
document.querySelectorAll(".key-btn").forEach(btn => {
  btn.addEventListener("mousedown", e => {
    e.preventDefault();
    startHoldOrNote(btn.dataset.lane);
    flashKey(btn.dataset.lane);
  });
  btn.addEventListener("mouseup", e => {
    finishHoldOrNote(btn.dataset.lane);
  });
});

/*
=================================
LÓGICA HOLD EN EDITOR
=================================
*/

function startHoldOrNote(lane) {

  if (!audio) { showFeedback("⚠️ Carga un MP3 primero"); return; }
  if (!isPlaying) { showFeedback("▶️ Dale play primero"); return; }

  const time = Math.round(audio.currentTime * 1000);

  // Evitar duplicados
  if (notes.find(n => n.lane === lane && Math.abs(n.time - time) < 80)) return;

  // Crear nota provisional (sin hold aún)
  const note = { time, lane };
  notes.push(note);
  notes.sort((a, b) => a.time - b.time);

  // Renderizar nota provisional
  renderNote(note);
  updateStats();
  updateLastNotes();

  // Guardar referencia para el hold en curso
  activeHolds[lane] = { note, startTime: time };

  // Animar el crecimiento en tiempo real
  requestAnimationFrame(() => growHold(lane));

}

function growHold(lane) {

  const active = activeHolds[lane];
  if (!active || !isPlaying) return;

  const now  = Math.round(audio.currentTime * 1000);
  const hold = now - active.startTime;

  // Actualizar visualmente si ya hay suficiente duración
  if (hold >= 200 && active.note.element) {
    const bodyHeight = Math.max(4, Math.round(hold * PX_PER_MS));
    const el = active.note.element;

    if (!el.classList.contains("timeline-hold")) {
      // Primera vez — convertir nota normal a hold
      // Limpiar TODO el contenido antes
      while (el.firstChild) el.removeChild(el.firstChild);
      el.classList.remove("timeline-note");
      el.classList.add("timeline-hold");
      
      const head = document.createElement("div");
      head.className = "tl-hold-head";
      head.textContent = lane.toUpperCase();
      
      const body = document.createElement("div");
      body.className = "tl-hold-body";
      body.style.height = bodyHeight + "px";
      
      const tail = document.createElement("div");
      tail.className = "tl-hold-tail";
      
      el.appendChild(head);
      el.appendChild(body);
      el.appendChild(tail);
    } else {
      // Solo actualizar altura — nunca decrecer
      const body = el.querySelector(".tl-hold-body");
      if (body) body.style.height = bodyHeight + "px";
    }
  }

  // Seguir animando mientras la tecla está pulsada
  if (activeHolds[lane]) {
    requestAnimationFrame(() => growHold(lane));
  }

}

function finishHoldOrNote(lane) {

  const active = activeHolds[lane];
  if (!active) return;

  delete activeHolds[lane];

  const now  = Math.round(audio.currentTime * 1000);
  const hold = now - active.startTime;

  if (hold >= 200) {
    // Es una hold note — actualizar el objeto
    active.note.hold = hold;
    active.note.element?.setAttribute("title",
      `Hold ${(hold/1000).toFixed(1)}s @ ${fmtPrecise(active.startTime)}`
    );
    showFeedback(`🎯 Hold ${(hold/1000).toFixed(1)}s`);
  }
  // Si hold < 100ms queda como nota normal (ya está añadida)

  updateLastNotes();

}

function flashKey(lane) {
  const btn = document.querySelector(`.key-btn[data-lane="${lane}"]`);
  if (!btn) return;
  btn.classList.add("pressed");
  setTimeout(() => btn.classList.remove("pressed"), 120);
}

/*
=================================
DESHACER / BORRAR
=================================
*/

function undoNote() {
  if (!notes.length) return;
  const last = notes.pop();
  last.element?.remove();
  updateStats();
  updateLastNotes();
  showFeedback(`↩️ ${last.lane.toUpperCase()} @ ${fmtPrecise(last.time)}`);
}

function deleteNearest() {
  if (!audio || !notes.length) return;
  const ms = audio.currentTime * 1000;
  let best = null, bestDiff = Infinity;
  notes.forEach(n => {
    const d = Math.abs(n.time - ms);
    if (d < bestDiff) { bestDiff = d; best = n; }
  });
  if (!best || bestDiff > 1000) return;
  notes = notes.filter(n => n !== best);
  best.element?.remove();
  updateStats();
  updateLastNotes();
  showFeedback(`🗑️ ${best.lane.toUpperCase()} borrado`);
}

/*
=================================
RENDER TIMELINE
=================================
*/

function msToY(ms) {
  return Math.round(ms * PX_PER_MS);
}

function renderNote(note) {
  const lane = lanes[note.lane];
  if (!lane) return;

  const el = document.createElement("div");

  if (note.hold >= 100) {
    const bodyHeight = Math.round(note.hold * PX_PER_MS);
    el.className = "timeline-note timeline-hold";
    el.innerHTML = `
      <div class="tl-hold-head">${note.lane.toUpperCase()}</div>
      <div class="tl-hold-body" style="height:${bodyHeight}px"></div>
      <div class="tl-hold-tail"></div>
    `;
    el.title = `Hold ${(note.hold/1000).toFixed(1)}s @ ${fmtPrecise(note.time)}`;
  } else {
    el.className = "timeline-note";
    el.textContent = note.lane.toUpperCase();
    el.title = fmtPrecise(note.time);
  }

  el.style.top = `${msToY(note.time)}px`;

  el.addEventListener("click", () => {
    notes = notes.filter(n => n !== note);
    el.remove();
    note.element = null;
    updateStats();
    updateLastNotes();
  });

  lane.appendChild(el);
  note.element = el;
}

function rebuildTimeline() {
  Object.values(lanes).forEach(l => l.innerHTML = "");
  notes.forEach(n => renderNote(n));
}

/*
=================================
STATS
=================================
*/

function updateStats() {
  elNoteCount.textContent = notes.length;

  if (notes.length > 0) {
    const lastNote = notes[notes.length - 1].time;
    const bmDuration = (lastNote + 2500) / 1000;
    elDensity.textContent =
      (notes.length / bmDuration).toFixed(1);

    // Mostrar duración del beatmap
    const durEl = document.getElementById("beatmapDuration");
    if (durEl) durEl.textContent = `⏱️ ${fmtTime(lastNote + 2500)}`;
  }
}

function updateLastNotes() {
  const last = notes.slice(-8).reverse();
  lastNotesList.innerHTML = last.map(n => `
    <div class="last-note-item">
      <span style="color:${laneColor(n.lane)};font-weight:bold">
        ${n.lane.toUpperCase()}${n.hold ? ` 🎯${(n.hold/1000).toFixed(1)}s` : ""}
      </span>
      <span>${fmtPrecise(n.time)}</span>
    </div>
  `).join("");
}

function laneColor(lane) {
  return { d:"#ff6666", f:"#ffaa44", j:"#44aaff", k:"#aa66ff" }[lane] || "#fff";
}

/*
=================================
EXPORTAR
=================================
*/

btnExport?.addEventListener("click", async () => {

  if (!notes.length) { showFeedback("⚠️ No hay notas"); return; }
  if (!audio)        { showFeedback("⚠️ Carga un MP3 primero"); return; }

  const name   = songName.value.trim()   || "Mi canción";
  const artist = songArtist.value.trim() || "Artista";
  const stars  = parseInt(songStars.value);
  const token  = localStorage.getItem("rb_token");

  if (!token) { showFeedback("⚠️ Inicia sesión para subir"); return; }

  btnExport.disabled    = true;
  btnExport.textContent = "⏳ Subiendo...";

  try {

    // Usar FormData para enviar MP3 + beatmap juntos
    const formData = new FormData();
    formData.append("name",     name);
    formData.append("artist",   artist);
    formData.append("stars",    stars);
    // Duración = última nota + 2500ms de margen
    // (no la duración del MP3 completo)
    const sortedNotes = notes.sort((a,b) => a.time - b.time);
    const lastNoteTime = sortedNotes[sortedNotes.length - 1].time;
    const beatmapDuration = lastNoteTime + 2500;

    formData.append("duration", beatmapDuration);
    formData.append("beatmap",  JSON.stringify(sortedNotes));

    // Añadir el archivo MP3 si existe
    const audioInput = document.getElementById("audioFile");
    if (audioInput?.files[0]) {
      formData.append("audio", audioInput.files[0]);
    }

    const res = await fetch(
      `${window.location.origin}/api/community/songs`,
      {
        method:  "POST",
        headers: { "Authorization": `Bearer ${token}` },
        // NO poner Content-Type — el browser lo pone automático con boundary
        body: formData
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showFeedback(`❌ ${data.error}`);
      return;
    }

    const audioMsg = data.audioUrl ? " 🎵 con audio" : " (sin audio)";
    showFeedback(`🎉 "${name}" subido${audioMsg}!`);

  } catch (err) {

    showFeedback("❌ Error al conectar con el servidor");

  } finally {

    btnExport.disabled    = false;
    btnExport.textContent = "🌍 Subir a comunidad";

  }

});

btnUndo?.addEventListener("click",  undoNote);
btnClear?.addEventListener("click", () => {
  if (!notes.length) return;
  if (!confirm(`¿Borrar las ${notes.length} notas?`)) return;
  notes = [];
  rebuildTimeline();
  updateStats();
  updateLastNotes();
  showFeedback("🗑️ Limpiado");
});

/*
=================================
FEEDBACK
=================================
*/

let fbTimer;
function showFeedback(text) {
  feedbackEl.textContent = text;
  feedbackEl.classList.remove("show");
  void feedbackEl.offsetWidth;
  feedbackEl.classList.add("show");
  clearTimeout(fbTimer);
  fbTimer = setTimeout(() => feedbackEl.classList.remove("show"), 1500);
}

/*
=================================
HELPERS
=================================
*/

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
}

function fmtPrecise(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}.${String(Math.floor(ms%1000)).padStart(3,"0")}`;
}