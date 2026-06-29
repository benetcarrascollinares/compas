const crypto = require("crypto");

/*
=================================
COLA ÚNICA POR ELO
Dificultad viaja con el jugador
pero no segrega la cola
Cada entrada: { socket, elo, difficulty, joinedAt }
=================================
*/

const waitingPlayers = [];

const activeRooms = {};

/*
=================================
RANGOS ELO
Se amplían con el tiempo de espera
=================================
*/

const ELO_RANGE_INITIAL = 150;  // 0–15s
const ELO_RANGE_MEDIUM  = 300;  // 15–45s
const ELO_RANGE_OPEN    = Infinity; // 45s+

function getEloRange(joinedAt) {

  const waitSeconds =
    (Date.now() - joinedAt) / 1000;

  if (waitSeconds < 15)
    return ELO_RANGE_INITIAL;

  if (waitSeconds < 45)
    return ELO_RANGE_MEDIUM;

  return ELO_RANGE_OPEN;

}

/*
=================================
AÑADIR JUGADOR A LA COLA
=================================
*/

function addPlayer(socket, difficulty) {

  const exists =
    waitingPlayers.find(
      p => p.socket.id === socket.id
    );

  if (!exists) {

    waitingPlayers.push({
      socket,
      elo:        socket.player?.elo ?? 1000,
      difficulty,
      joinedAt:   Date.now()
    });

  }

}

/*
=================================
ELIMINAR JUGADOR DE COLA Y SALAS
=================================
*/

function removePlayer(socketId) {

  const index =
    waitingPlayers.findIndex(
      p => p.socket.id === socketId
    );

  if (index !== -1) {
    waitingPlayers.splice(index, 1);
  }

  for (const roomId in activeRooms) {

    activeRooms[roomId] =
      activeRooms[roomId]
      .filter(p => p.id !== socketId);

    if (activeRooms[roomId].length === 0) {
      delete activeRooms[roomId];
    }

  }

}

/*
=================================
BUSCAR MEJOR RIVAL POR ELO
Cola única — sin filtro de dificultad
=================================
*/

function findBestMatch() {

  if (waitingPlayers.length < 2) return null;

  let bestPair = null;
  let bestDiff = Infinity;

  for (let i = 0; i < waitingPlayers.length; i++) {
    for (let j = i + 1; j < waitingPlayers.length; j++) {

      const p1 = waitingPlayers[i];
      const p2 = waitingPlayers[j];

      const eloDiff =
        Math.abs(p1.elo - p2.elo);

      // Usar el rango del jugador que lleva más tiempo
      const range = Math.max(
        getEloRange(p1.joinedAt),
        getEloRange(p2.joinedAt)
      );

      if (eloDiff <= range && eloDiff < bestDiff) {
        bestDiff = eloDiff;
        bestPair = [i, j];
      }

    }
  }

  return bestPair;

}

/*
=================================
¿SE PUEDE CREAR PARTIDA?
=================================
*/

function canCreateMatch() {
  return findBestMatch() !== null;
}

/*
=================================
CREAR PARTIDA
=================================
*/

function createMatch() {

  const pair = findBestMatch();

  if (!pair) return null;

  const [i, j] = pair;

  // Eliminar en orden inverso para no alterar índices
  const entry2 = waitingPlayers.splice(j, 1)[0];
  const entry1 = waitingPlayers.splice(i, 1)[0];

  const player1 = entry1.socket;
  const player2 = entry2.socket;

  const eloDiff =
    Math.abs(entry1.elo - entry2.elo);

  const roomId = crypto.randomUUID();

  activeRooms[roomId] = [player1, player2];

  console.log(
    `Match: ${player1.player?.username ?? "?"} ` +
    `(${entry1.elo} ${entry1.difficulty}) ` +
    `vs ${player2.player?.username ?? "?"} ` +
    `(${entry2.elo} ${entry2.difficulty}) ` +
    `| Δ ELO: ${eloDiff}`
  );

  return {
    player1,
    player2,
    roomId,
    eloDiff,
    // Cada jugador lleva su propia dificultad
    difficulty1: entry1.difficulty,
    difficulty2: entry2.difficulty
  };

}

/*
=================================
ESTADÍSTICAS DE COLA
=================================
*/

function getQueueStats() {

  return waitingPlayers.map(p => ({
    username:   p.socket.player?.username ?? "invitado",
    elo:        p.elo,
    difficulty: p.difficulty,
    waiting:    Math.round(
      (Date.now() - p.joinedAt) / 1000
    ) + "s"
  }));

}

function removeRoom(roomId) {
  delete activeRooms[roomId];
}

module.exports = {
  addPlayer,
  removePlayer,
  canCreateMatch,
  createMatch,
  removeRoom,
  getQueueStats
};