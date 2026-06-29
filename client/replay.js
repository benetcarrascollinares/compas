/*
=================================
REPLAY — Rhythm Battle
Graba inputs con timestamps y
permite reproducirlos después.
=================================
*/

let recording   = false;
let replayData  = [];
let startTime   = 0;

/*
=================================
GRABAR
=================================
*/

export function startRecording(time) {
  recording  = true;
  replayData = [];
  startTime  = time;
}

export function stopRecording() {
  recording = false;
  return replayData;
}

export function recordInput(key, type, time, score = null, result = null) {
  if (!recording) return;
  replayData.push({
    key,
    type,
    time:   Math.round(time - startTime),
    score,
    result
  });
}

export function recordScore(score, time) {
  if (!recording) return;
  replayData.push({
    type:  "score",
    score,
    time:  Math.round(time - startTime)
  });
}

export function getReplayData() {
  return replayData;
}

/*
=================================
REPRODUCIR
=================================
*/

let playbackEvents  = [];
let playbackIndex   = 0;
let playbackActive  = false;
let onInputCallback = null;

export function startPlayback(data, onInput) {
  playbackEvents  = [...data].sort((a, b) => a.time - b.time);
  playbackIndex   = 0;
  playbackActive  = true;
  onInputCallback = onInput;
}

export function stopPlayback() {
  playbackActive  = false;
  playbackEvents  = [];
  playbackIndex   = 0;
  onInputCallback = null;
}

// Llamar cada frame desde el gameLoop con el tiempo actual
export function tickPlayback(time) {
  if (!playbackActive) return;

  while (
    playbackIndex < playbackEvents.length &&
    playbackEvents[playbackIndex].time <= time
  ) {
    const event = playbackEvents[playbackIndex];
    if (onInputCallback) onInputCallback(event);
    playbackIndex++;
  }

  // Fin del replay
  if (playbackIndex >= playbackEvents.length) {
    playbackActive = false;
  }
}

export function isPlaybackActive() {
  return playbackActive;
}