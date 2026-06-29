import {
  addCombo,
  resetCombo,
  getCombo
}
from "./combo.js";

import {
  getWindows
}
from "./difficulty.js";


let score = 0;

let stats = {
  perfect: 0,
  good:    0,
  ok:      0,
  miss:    0
};


function getMultiplier(combo) {
  if (combo >= 50) return 2;
  if (combo >= 20) return 1.5;
  if (combo >= 10) return 1.2;
  return 1;
}

/*
=================================
NOTA NORMAL
=================================
*/

export function hitNote(time, note) {

  const diff    = Math.abs(time - note.time);
  const windows = getWindows();

  if (diff <= windows.perfect) {
    const combo = addCombo();
    score += 300 * getMultiplier(combo);
    stats.perfect++;
    return { text: "PERFECT!", combo };
  }

  if (diff <= windows.good) {
    const combo = addCombo();
    score += 100 * getMultiplier(combo);
    stats.good++;
    return { text: "GOOD!", combo };
  }

  if (diff <= windows.ok) {
    const combo = addCombo();
    score += 50 * getMultiplier(combo);
    stats.ok++;
    return { text: "OK!", combo };
  }

  resetCombo();
  stats.miss++;
  return { text: "MISS!", combo: 0 };

}

/*
=================================
HOLD NOTE — inicio (cabeza)
=================================
*/

export function startHold(time, note) {

  const diff    = Math.abs(time - note.time);
  const windows = getWindows();

  if (diff <= windows.perfect) {
    const combo = addCombo();
    score += 100 * getMultiplier(combo);
    stats.perfect++;
    return { text: "HOLD!", grade: "perfect", combo };
  }

  if (diff <= windows.good) {
    const combo = addCombo();
    score += 75 * getMultiplier(combo);
    stats.good++;
    return { text: "HOLD!", grade: "good", combo };
  }

  if (diff <= windows.ok * 2) {
    const combo = addCombo();
    score += 50 * getMultiplier(combo);
    stats.ok++;
    return { text: "HOLD!", grade: "ok", combo };
  }

  return null;

}

/*
=================================
HOLD NOTE — completado
=================================
*/

export function completeHold(note) {

  const combo = getCombo();
  score += 200 * getMultiplier(combo);
  stats.perfect++;
  return { text: "PERFECT!", combo };

}

/*
=================================
HOLD NOTE — soltado antes de tiempo
=================================
*/

export function releaseHoldEarly() {

  resetCombo();
  stats.miss++;
  return { text: "MISS!", combo: 0 };

}

/*
=================================
GETTERS
=================================
*/

export function getScore()  { return score; }
export function getStats()  { return stats; }

export function resetScore() {
  score = 0;
  stats = { perfect: 0, good: 0, ok: 0, miss: 0 };
}

export function getAccuracy() {

  const total =
    stats.perfect + stats.good +
    stats.ok      + stats.miss;

  if (total === 0) return 0;

  const scoreValue =
    stats.perfect * 100 +
    stats.good    * 75  +
    stats.ok      * 50;

  return Math.round(
    (scoreValue / (total * 100)) * 100
  );

}