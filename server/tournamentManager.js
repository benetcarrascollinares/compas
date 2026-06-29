/*
=================================
TOURNAMENT MANAGER
Compás V3

Escalable para 4 u 8 jugadores.
=================================
*/

const crypto     = require("crypto");
const songCatalog = require("./songCatalog");

// Torneos activos en memoria
const tournaments = {};

// Colas de torneo rápido por tamaño
const quickQueues = {
  4: [], // sockets esperando torneo de 4
  8: []  // sockets esperando torneo de 8
};

/*
=================================
GENERAR CÓDIGO LEGIBLE
=================================
*/

function generateCode() {
  const words = [
    "NEON","BEAT","FIRE","WAVE","RUSH",
    "STAR","GOLD","EPIC","BASS","DROP"
  ];
  const word = words[Math.floor(Math.random() * words.length)];
  const num  = Math.floor(Math.random() * 90) + 10;
  return `${word}${num}`;
}

/*
=================================
GENERAR BRACKET
Funciona para 4 u 8 jugadores
=================================
*/

function generateBracket(players) {

  const size = players.length; // 4 u 8
  const shuffled = [...players].sort(() => Math.random() - 0.5);

  // Ronda 1: emparejar jugadores
  const round1 = [];
  for (let i = 0; i < size; i += 2) {
    round1.push({
      matchId:  `r1_m${i/2}`,
      player1:  shuffled[i],
      player2:  shuffled[i+1],
      winner:   null,
      status:   "pending" // pending | playing | finished
    });
  }

  // Rondas vacías (se rellenan con ganadores)
  const rounds = [round1];

  let remaining = size / 2;
  let roundNum  = 2;

  while (remaining > 1) {
    const round = [];
    for (let i = 0; i < remaining; i += 2) {
      round.push({
        matchId: `r${roundNum}_m${i/2}`,
        player1: null,
        player2: null,
        winner:  null,
        status:  "pending"
      });
    }
    rounds.push(round);
    remaining /= 2;
    roundNum++;
  }

  return rounds;

}

/*
=================================
CREAR TORNEO
=================================
*/

function createTournament(creatorSocket, size = 4) {

  const id   = crypto.randomUUID().slice(0, 8);
  let   code = generateCode();

  // Evitar colisiones de código
  while (Object.values(tournaments).find(t => t.code === code)) {
    code = generateCode();
  }

  const tournament = {
    id,
    code,
    size,
    status:      "waiting", // waiting|voting|playing|finished
    creatorId:   creatorSocket.id,
    players:     [],        // { socketId, username, elo }
    bracket:     null,
    songVotes:   {},        // { socketId: { semi: songId, final: songId } }
    roundSongs:  [],        // canción elegida por ronda [semi, final, ...]
    currentRoundIndex: 0,
    activeMatches: {}       // matchId → roomId socket
  };

  tournaments[id] = tournament;
  return tournament;

}

/*
=================================
UNIRSE A TORNEO
=================================
*/

function joinTournament(code, socket) {

  const tournament = Object.values(tournaments).find(
    t => t.code === code.toUpperCase() && t.status === "waiting"
  );

  if (!tournament) {
    return { ok: false, error: "Torneo no encontrado o ya empezado" };
  }

  if (tournament.players.length >= tournament.size) {
    return { ok: false, error: "Torneo lleno" };
  }

  // Evitar duplicados
  if (tournament.players.find(p => p.socketId === socket.id)) {
    return { ok: false, error: "Ya estás en este torneo" };
  }

  const player = {
    socketId: socket.id,
    username: socket.player?.username ?? "Invitado",
    elo:      socket.player?.elo      ?? 1000
  };

  tournament.players.push(player);
  socket.join(`tournament_${tournament.id}`);

  return { ok: true, tournament, player };

}

/*
=================================
VOTAR CANCIONES PRE-TORNEO
=================================
*/

function voteRoundSongs(tournamentId, socketId, votes) {
  // votes = { 0: songId, 1: songId, ... } — una por ronda

  const t = tournaments[tournamentId];
  if (!t) return false;

  t.songVotes[socketId] = votes;
  return true;

}

function allVoted(tournamentId) {

  const t = tournaments[tournamentId];
  if (!t) return false;

  return Object.keys(t.songVotes).length >= t.players.length;

}

function resolveRoundSongs(tournamentId) {

  const t = tournaments[tournamentId];
  if (!t) return [];

  const numRounds = Math.log2(t.size); // 4→2, 8→3

  const resolved = [];

  for (let r = 0; r < numRounds; r++) {

    // Contar votos para esta ronda
    const tally = {};

    Object.values(t.songVotes).forEach(votes => {
      const songId = votes[r];
      if (songId) {
        tally[songId] = (tally[songId] || 0) + 1;
      }
    });

    if (Object.keys(tally).length === 0) {
      // Fallback: canción aleatoria
      resolved.push(songCatalog.getRandomId());
    } else {
      // Ganadora: la más votada, en empate random
      const maxVotes = Math.max(...Object.values(tally));
      const winners  = Object.entries(tally)
        .filter(([, v]) => v === maxVotes)
        .map(([k]) => k);
      resolved.push(winners[Math.floor(Math.random() * winners.length)]);
    }

  }

  t.roundSongs = resolved;
  return resolved;

}

/*
=================================
INICIAR TORNEO
(llama a esto cuando todos votaron)
=================================
*/

function startTournament(tournamentId) {

  const t = tournaments[tournamentId];
  if (!t) return null;

  t.bracket = generateBracket(t.players);
  t.status  = "playing";
  t.currentRoundIndex = 0;

  return t;

}

/*
=================================
OBTENER PARTIDOS DE LA RONDA ACTUAL
=================================
*/

function getCurrentMatches(tournamentId) {

  const t = tournaments[tournamentId];
  if (!t || !t.bracket) return [];

  return t.bracket[t.currentRoundIndex] || [];

}

/*
=================================
REGISTRAR GANADOR DE UN MATCH
Y AVANZAR SI TODOS TERMINARON
=================================
*/

function reportMatchResult(tournamentId, matchId, winnerId) {

  const t = tournaments[tournamentId];
  if (!t) return null;

  const round = t.bracket[t.currentRoundIndex];
  const match = round.find(m => m.matchId === matchId);

  if (!match) return null;

  match.winner = winnerId;
  match.status = "finished";

  // ¿Todos los partidos de la ronda terminaron?
  const allDone = round.every(m => m.status === "finished");

  if (!allDone) {
    return { advanced: false, tournament: t };
  }

  // Avanzar a la siguiente ronda
  const nextRoundIndex = t.currentRoundIndex + 1;

  if (nextRoundIndex >= t.bracket.length) {
    // Torneo terminado
    t.status = "finished";
    t.champion = winnerId;
    return { advanced: true, finished: true, champion: winnerId, tournament: t };
  }

  // Rellenar la siguiente ronda con los ganadores
  const nextRound = t.bracket[nextRoundIndex];
  const winners   = round.map(m => {
    return t.players.find(p => p.socketId === m.winner);
  });

  for (let i = 0; i < nextRound.length; i++) {
    nextRound[i].player1 = winners[i * 2];
    nextRound[i].player2 = winners[i * 2 + 1];
  }

  t.currentRoundIndex = nextRoundIndex;

  return { advanced: true, finished: false, tournament: t };

}

/*
=================================
GETTERS
=================================
*/

function getTournament(id)         { return tournaments[id]; }
function getTournamentByCode(code) {
  return Object.values(tournaments).find(
    t => t.code === code.toUpperCase()
  );
}
function getAll() { return Object.values(tournaments); }

function removeTournament(id) {
  delete tournaments[id];
}

/*
=================================
LIMPIAR TORNEOS VIEJOS
(cada hora)
=================================
*/

setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  Object.entries(tournaments).forEach(([id, t]) => {
    if (t.createdAt < oneHourAgo || t.status === "finished") {
      delete tournaments[id];
    }
  });
}, 3600000);

/*
=================================
COLA DE TORNEO RÁPIDO
=================================
*/

function joinQuickQueue(socket, size) {

  const queue = quickQueues[size];
  if (!queue) return { ok: false, error: "Tamaño inválido (4 u 8)" };

  // Evitar duplicados
  if (queue.find(s => s.id === socket.id)) {
    return { ok: false, error: "Ya estás en la cola" };
  }

  queue.push(socket);

  const position = queue.length;
  const ready    = queue.length >= size;

  if (ready) {
    // Sacar los jugadores de la cola y crear torneo automáticamente
    const players = queue.splice(0, size);
    const t       = createTournament(players[0], size);

    // Unir todos los jugadores al torneo
    players.forEach(s => joinTournament(t.code, s));

    return { ok: true, ready: true, tournament: t, players };
  }

  return { ok: true, ready: false, position, total: size };

}

function leaveQuickQueue(socket) {

  [4, 8].forEach(size => {
    const idx = quickQueues[size].findIndex(s => s.id === socket.id);
    if (idx !== -1) quickQueues[size].splice(idx, 1);
  });

}

function getQuickQueueStatus(size) {
  return {
    current: quickQueues[size]?.length ?? 0,
    total:   size
  };
}

module.exports = {
  createTournament,
  joinTournament,
  joinQuickQueue,
  leaveQuickQueue,
  getQuickQueueStatus,
  voteRoundSongs,
  allVoted,
  resolveRoundSongs,
  startTournament,
  getCurrentMatches,
  reportMatchResult,
  getTournament,
  getTournamentByCode,
  getAll,
  removeTournament
};