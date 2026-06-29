import {
  createNoteElement,
  createHoldElement,
  updateNotePosition,
  setHoldActive,
  removeNoteElement
}
from "./renderer.js";

const notes      = [];
const TRAVEL_TIME = 2000;
const HIT_LINE    = 300;

let activeBeatmap    = [];
let currentDifficulty = "normal";

export function setNotesDifficulty(d) {
  currentDifficulty = d;
}

export function setBeatmap(map) {
  activeBeatmap = map;
}

export function updateNotes(time) {

  // Spawnear notas
  activeBeatmap.forEach(data => {

    if (data.spawned) return;

    // Las hold notes necesitan spawnar antes
    // porque la cola aparece primero visualmente
    const spawnTime = data.hold > 0
      ? data.time - TRAVEL_TIME - data.hold
      : data.time - TRAVEL_TIME;

    if (time < spawnTime) return;

    const note = {
      time:      data.time,       // cuando la CABEZA llega a la hitline
      lane:      data.lane,
      hold:      data.hold || 0,
      y:         0,
      hit:       false,
      missed:    false,
      holding:   false,
      holdDone:  false
    };

    notes.push(note);
    data.spawned = true;

    if (note.hold > 0) {
      createHoldElement(note);
    } else {
      createNoteElement(note);
    }

  });

  // Actualizar posiciones y lógica
  notes.forEach(note => {

    if (note.hit || note.missed) return;

    // y = posición de la CABEZA
    // Para hold: la cola está en y - bodyHeight (arriba)
    const progress =
      (time - (note.time - TRAVEL_TIME)) / TRAVEL_TIME;

    note.y = progress * HIT_LINE;

    updateNotePosition(note);

    if (note.hold > 0) {

      // ── Hold activo: la nota sigue viajando ──
      if (note.holding) {

        const tailTime   = note.time + note.hold;
        const releaseWindow = 350; // ms de margen para soltar

        // Auto-completar cuando la cola llega
        // En Hard el jugador debe soltar manualmente
        if (time >= tailTime) {
          if (currentDifficulty !== "hard") {
            note.holdDone = true;
            note.hit      = true;
            setHoldActive(note, false);
            removeNoteElement(note);
          } else {
            // En Hard: si no has soltado, MISS
            note.missed = true;
            setHoldActive(note, false);
            removeNoteElement(note);
          }
        }

        return;
      }

      // Miss — pasó demasiado tiempo sin pulsar la cabeza
      if (!note.holding && time > note.time + 400) {
        note.missed = true;
        removeNoteElement(note);
      }

    } else {

      // Nota normal — miss si pasa la ventana
      if (time > note.time + 150) {
        note.missed = true;
        removeNoteElement(note);
      }

    }

  });

}

/*
Activar hold desde game.js
*/
export function startHoldNote(note, time) {
  note.holding = true;
  setHoldActive(note, true);
}

/*
Soltar hold antes de tiempo
*/
export function releaseHoldNote(note) {
  note.holding  = false;
  note.hit      = true;
  setHoldActive(note, false);
  removeNoteElement(note);
}

export function getNotes()   { return notes;    }
export function getHitLine() { return HIT_LINE; }

export function resetNotes() {
  notes.forEach(note => removeNoteElement(note));
  notes.length = 0;
  activeBeatmap.forEach(note => delete note.spawned);
}