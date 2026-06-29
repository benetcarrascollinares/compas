const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const fs   = require("fs");

// Crear directorio uploads si no existe (Railway)
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const rooms = require("./rooms");
const gameManager = require("./gameManager");
const authRoutes      = require("./routes/authRoutes");
const communityRoutes = require("./routes/communityRoutes");
const replayRoutes    = require("./routes/replayRoutes");
const songCatalog    = require("./songCatalog");
const { getSong: getCommunitySong } = require("./db/communitySongs");
const tm = require("./tournamentManager");

const { verifyToken } = require("./auth/auth");
const {
  findById,
  saveMatch,
  updateElo,
  updateWinLoss
} = require("./db/players");

const {
  checkUnlocks,
  grantTournamentTitle
} = require("./db/unlockables");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

/*
=================================
MIDDLEWARES
=================================
*/

app.use(cors());
app.use(express.json());

// Archivos estáticos del cliente
const clientPath = path.join(__dirname, "../client");
console.log("📁 Sirviendo cliente desde:", clientPath);

app.use(
  express.static(clientPath)
);

// Fallback — todas las rutas no-API sirven index.html
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
    res.sendFile(path.join(clientPath, "index.html"));
  }
});

// Archivos de audio subidos por la comunidad
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

/*
=================================
RUTAS REST
=================================
*/

app.use("/api", authRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/replays", replayRoutes);

/*
=================================
GET /api/songs
=================================
*/

app.get("/api/songs", (req, res) => {
  res.json(songCatalog.getAll());
});

/*
=================================
GET /api/queue  (debug)
=================================
*/

app.get("/api/queue", (req, res) => {
  res.json(rooms.getQueueStats());
});

/*
=================================
AUTH EN SOCKET
Verificar JWT en el handshake
=================================
*/

io.use((socket, next) => {

  const token =
    socket.handshake.auth?.token;

  // Sin token → jugador invitado (sin guardar stats)
  if (!token) {
    socket.player = null;
    return next();
  }

  const payload = verifyToken(token);

  if (!payload) {
    // Token inválido → rechazar conexión
    return next(
      new Error("Token inválido")
    );
  }

  const player = findById(payload.id);

  if (!player) {
    return next(
      new Error("Jugador no encontrado")
    );
  }

  // Adjuntar datos del jugador al socket
  socket.player = {
    id:       player.id,
    username: player.username,
    elo:      player.elo
  };

  console.log(
    `🔑 Auth OK: ${player.username}`
  );

  next();

});

/*
=================================
GUARDAR RESULTADO EN DB
=================================
*/

function calcElo(playerElo, opponentElo, result) {

  const K = 32;

  const expected =
    1 / (
      1 + 10 ** (
        (opponentElo - playerElo) / 400
      )
    );

  return Math.round(
    playerElo + K * (result - expected)
  );
}

function persistMatchResult({
  player1,
  player2,
  p1Data,
  p2Data,
  difficulty
}) {

  if (!player1 || !player2) return {};

  const isDraw =
    p1Data.score === p2Data.score;

  const p1Won =
    p1Data.score > p2Data.score;

  const winnerId = isDraw
    ? null
    : p1Won
      ? player1.id
      : player2.id;

  saveMatch({
    player1Id:  player1.id,
    player2Id:  player2.id,
    winnerId,
    difficulty,
    p1Stats:    p1Data,
    p2Stats:    p2Data
  });

  if (!isDraw) {

    const p1Result = p1Won ? 1 : 0;
    const p2Result = p1Won ? 0 : 1;

    const newElo1 = calcElo(
      player1.elo,
      player2.elo,
      p1Result
    );

    const newElo2 = calcElo(
      player2.elo,
      player1.elo,
      p2Result
    );

    updateElo(player1.id, newElo1);
    updateElo(player2.id, newElo2);

    updateWinLoss(player1.id, p1Won);
    updateWinLoss(player2.id, !p1Won);

    // Actualizar ELO en memoria para checkUnlocks
    player1.elo = newElo1;
    player2.elo = newElo2;
    if (p1Won) player1.wins++;
    else       player1.losses++;
    if (!p1Won) player2.wins++;
    else        player2.losses++;

    console.log(
      `📊 ELO: ${player1.username} →${newElo1}` +
      ` | ${player2.username} →${newElo2}`
    );

  }

  // Releer de DB para que checkUnlocks
  // vea los valores ya actualizados
  const updatedP1 =
    player1 ? findById(player1.id) : null;

  const updatedP2 =
    player2 ? findById(player2.id) : null;

  // Comprobar desbloqueos para ambos jugadores
  const p1Unlocks = updatedP1
    ? checkUnlocks(
        updatedP1,
        { accuracy: p1Data.accuracy, maxCombo: p1Data.maxCombo }
      )
    : { newTitles: [], newSkins: [] };

  const p2Unlocks = updatedP2
    ? checkUnlocks(
        updatedP2,
        { accuracy: p2Data.accuracy, maxCombo: p2Data.maxCombo }
      )
    : { newTitles: [], newSkins: [] };

  return { p1Unlocks, p2Unlocks };

}

/*
=================================
SOCKET.IO EVENTS
=================================
*/

// Guardar resultados hasta que ambos terminen
const finishedGames  = {};
const activeRoomData = {}; // room → { songId, difficulty, audioUrl, startAt }

// Votos de canción por sala
const songVotes = {};

// Relacionar socket.id → player
// (para acceder en gameFinished)
const socketPlayers = {};

io.on("connection", socket => {

  console.log(
    "Jugador conectado:",
    socket.id,
    socket.player
      ? `(${socket.player.username})`
      : "(invitado)"
  );

  if (socket.player) {
    socketPlayers[socket.id] =
      socket.player;
  }

  /*
  MATCHMAKING
  */

  socket.on("joinQueue", data => {

    const difficulty =
      data?.difficulty || "normal";

    socket.emit("waiting");

    rooms.addPlayer(socket, difficulty);

  });

  /*
  VOTACIÓN DE CANCIÓN
  */

  socket.on("voteSong", data => {

    const room =
      [...socket.rooms]
      .find(r => r !== socket.id);

    if (!room) return;

    if (!songVotes[room]) {
      songVotes[room] = {};
    }

    songVotes[room][socket.id] = data.songId;

    console.log(
      `Voto en sala ${room}:`,
      songVotes[room]
    );

    // Notificar al rival qué ha votado este jugador
    socket.to(room).emit("rivalVote", {
      songId: data.songId
    });

    const votes =
      Object.values(songVotes[room]);

    // Esperar a que voten los dos
    if (votes.length < 2) return;

    // Resolver canción
    const [v1, v2] = votes;

    let chosenId;

    if (v1 === v2) {
      chosenId = v1;
    } else {
      chosenId = Math.random() < 0.5 ? v1 : v2;
    }

    // Detectar si es canción oficial o comunitaria
    const officialSong   = songCatalog.getById(chosenId);
    const communitySong  = !officialSong
      ? getCommunitySong(chosenId)
      : null;

    const songName = officialSong?.name || communitySong?.name || "Canción";
    const isCommunity = !officialSong && !!communitySong;

    console.log(
      `Canción elegida para ${room}: ${songName} ${isCommunity ? "(comunidad)" : ""}`
    );

    io.to(room).emit("songChosen", {
      songId:      chosenId,
      songName,
      agreed:      v1 === v2,
      isCommunity
    });

    delete songVotes[room];

    setTimeout(() => {
      gameManager.startGame(io, room, chosenId, isCommunity);
    }, 2000);

  });

  /*
  SCORE ONLINE
  */

  socket.on("hit", data => {

    const room =
      [...socket.rooms]
      .find(r => r !== socket.id);

    if (!room) return;

    // Enviar score al rival
    socket.to(room).emit(
      "scoreUpdate",
      { score: data.score }
    );

    // Enviar hit completo a espectadores (para renderizar notas)
    io.to(`spectate_${room}`).emit("spectatorUpdate", {
      playerId:  socket.id,
      username:  socket.player?.username,
      score:     data.score,
      key:       data.key,
      result:    data.result,  // "perfect", "good", "ok", "miss"
      time:      data.time,
      type:      "hit"
    });

    // También actualizar score en espectador
    io.to(`spectate_${room}`).emit("spectatorUpdate", {
      playerId:  socket.id,
      username:  socket.player?.username,
      score:     data.score,
      type:      "score"
    });
  });

  /*
  HP ONLINE
  */

  socket.on("hpUpdate", data => {

    const room =
      [...socket.rooms]
      .find(r => r !== socket.id);

    if (!room) return;

    // Enviar al rival
    socket.to(room).emit(
      "enemyHP",
      { hp: data.hp }
    );

    // Enviar HP de este jugador a espectadores
    io.to(`spectate_${room}`).emit("spectatorUpdate", {
      playerId: socket.id,
      username: socket.player?.username,
      hp:       data.hp,
      type:     "hp"
    });

  });

  /*
  DAMAGE
  */

  socket.on("attack", data => {

    const room =
      [...socket.rooms]
      .find(r => r !== socket.id);

    if (!room) return;

    socket.to(room).emit(
      "takeDamage",
      { damage: data.damage }
    );
  });

  /*
  PLAYER KO
  */

  socket.on("playerKO", () => {

    const room =
      [...socket.rooms]
      .find(r => r !== socket.id);

    if (!room) return;

    socket.emit("koDefeat");
    socket.to(room).emit("koVictory");
  });

  /*
  SPECIAL ATTACK
  */

  socket.on("specialAttack", data => {

    const room =
      [...socket.rooms]
      .find(r => r !== socket.id);

    if (!room) return;

    socket.to(room).emit(
      "takeDamage",
      { damage: data.damage }
    );
  });

  /*
  BATTLE EFFECTS
  */

  socket.on("battleEffect", data => {

    const room =
      [...socket.rooms]
      .find(r => r !== socket.id);

    if (!room) return;

    socket.to(room).emit("battleEffect", data);
  });

  /*
  FIN DE PARTIDA
  */

  socket.on("gameFinished", data => {

    const allRooms = [...socket.rooms].filter(r => r !== socket.id);

    // Para torneos: coger el room del match MÁS RECIENTE (último)
    const tournamentMatchRooms = allRooms.filter(r =>
      r.startsWith("tournament_") && r.split("_").length >= 4
    );

    const room = tournamentMatchRooms.length > 0
      ? tournamentMatchRooms[tournamentMatchRooms.length - 1]
      : allRooms.find(r => !r.startsWith("tournament_"));

    if (!room) return;

    if (!finishedGames[room]) {
      finishedGames[room] = {
        results: {}
      };
    }

    // Guardar resultado con su dificultad propia
    finishedGames[room].results[socket.id] = data;

    // Guardar dificultad en activeRoomData para espectadores
    if (gameManager.activeRoomData[room] && data.difficulty) {
      gameManager.activeRoomData[room].difficulty = data.difficulty;
    }

    const playerIds =
      Object.keys(
        finishedGames[room].results
      );

    // Esperar a que terminen ambos
    if (playerIds.length < 2) return;

    const p1Id = playerIds[0];
    const p2Id = playerIds[1];

    const p1 = finishedGames[room].results[p1Id];
    const p2 = finishedGames[room].results[p2Id];

    // Cada jugador tiene su propia dificultad
    const diff = p1.difficulty || "normal";

    // Determinar resultado
    let r1 = "🤝 EMPATE";
    let r2 = "🤝 EMPATE";

    let winnerId = null;

    if (p1.score > p2.score) {
      r1 = "🏆 GANASTE";
      r2 = "😢 PERDISTE";
      winnerId = p1Id;
    } else if (p2.score > p1.score) {
      r1 = "😢 PERDISTE";
      r2 = "🏆 GANASTE";
      winnerId = p2Id;
    } else {
      // Empate en puntos → desempate por accuracy
      if ((p1.accuracy || 0) >= (p2.accuracy || 0)) {
        winnerId = p1Id;
      } else {
        winnerId = p2Id;
      }
    }

    // Si es partida de torneo, reportar ganador automáticamente
    const isTournamentRoom = room.startsWith("tournament_") &&
                             room.split("_").length >= 4;

    if (isTournamentRoom && winnerId) {

      // formato: tournament_{tournamentId}_{roundX}_{matchY}
      const withoutPrefix  = room.replace("tournament_", "");
      const firstUnderscore = withoutPrefix.indexOf("_");
      const tournamentId   = withoutPrefix.slice(0, firstUnderscore);
      const matchId        = withoutPrefix.slice(firstUnderscore + 1);

      const tmResult = tm.reportMatchResult(
        tournamentId, matchId, winnerId
      );

      if (tmResult) {

        if (tmResult.finished) {

          const t        = tmResult.tournament;
          const champion = t.players.find(p => p.socketId === winnerId);

          // Desbloquear título exclusivo al campeón
          if (champion) {
            const sp = socketPlayers[champion.socketId];
            if (sp) {
              grantTournamentTitle(sp.id);
              // Refrescar ELO actualizado de la DB
              const freshChampion = findById(sp.id);
              if (freshChampion) champion.elo = freshChampion.elo;
            }
          }

          // Calcular posiciones finales
          const finalist = t.bracket[t.bracket.length - 1][0];
          const loserId  = finalist.player1?.socketId === winnerId
            ? finalist.player2?.socketId
            : finalist.player1?.socketId;

          const semiLosers = t.bracket[0]
            .map(m => m.player1?.socketId === m.winner
              ? m.player2?.socketId
              : m.player1?.socketId
            )
            .filter(Boolean);

          t.positions = {
            first:  winnerId,
            second: loserId,
            third:  semiLosers
          };

          io.to(`tournament_${tournamentId}`).emit("tournamentFinished", {
            champion,
            bracket:   t.bracket,
            positions: t.positions
          });

          console.log(`🏆 Torneo terminado. Campeón: ${champion?.username} (${champion?.elo} ELO}`);

        } else if (tmResult.advanced) {

          const t = tmResult.tournament;
          const roundSongNames = t.roundSongs.map(id => {
            const s = songCatalog.getById(id);
            return s ? s.name : id;
          });

          io.to(`tournament_${tournamentId}`).emit("tournamentRoundAdvance", {
            bracket:      t.bracket,
            currentRound: t.currentRoundIndex,
            roundSongs:   roundSongNames
          });

          setTimeout(() => {
            launchTournamentRound(tournamentId, io);
          }, 5000);

        }
      }
    }

    // Guardar en DB y obtener nuevos desbloqueos
    // Releer de DB para tener datos frescos
    const sp1 = socketPlayers[p1Id];
    const sp2 = socketPlayers[p2Id];

    const freshP1 = sp1 ? findById(sp1.id) : null;
    const freshP2 = sp2 ? findById(sp2.id) : null;

    const { p1Unlocks, p2Unlocks } =
      persistMatchResult({
        player1:    freshP1,
        player2:    freshP2,
        p1Data:     p1,
        p2Data:     p2,
        difficulty: diff
      });

    // Emitir resultado a cada jugador
    const freshP1AfterMatch = freshP1 ? findById(freshP1.id) : null;
    const freshP2AfterMatch = freshP2 ? findById(freshP2.id) : null;

    io.to(p1Id).emit("gameFinished", {
      result:   r1,
      score:    p1.score,
      stats:    p1.stats,
      accuracy: p1.accuracy,
      unlocks:  p1Unlocks || null,
      streak:   freshP1AfterMatch?.streak ?? 0
    });

    io.to(p2Id).emit("gameFinished", {
      result:   r2,
      score:    p2.score,
      stats:    p2.stats,
      accuracy: p2.accuracy,
      unlocks:  p2Unlocks || null,
      streak:   freshP2AfterMatch?.streak ?? 0
    });

    // Notificar a espectadores que la partida terminó
    const winnerUsername = r1.includes("GANASTE")
      ? (sp1?.username ?? "Jugador 1")
      : r2.includes("GANASTE")
      ? (sp2?.username ?? "Jugador 2")
      : null; // empate

    io.to(`spectate_${room}`).emit("spectatorGameFinished", {
      winner:  winnerUsername,
      score1:  p1.score,
      score2:  p2.score,
      player1: sp1?.username ?? "Jugador 1",
      player2: sp2?.username ?? "Jugador 2"
    });

    delete finishedGames[room];
    rooms.removeRoom(room);
  });

  /*
  =================================
  TORNEOS
  =================================
  */

  // Crear torneo
  socket.on("createTournament", (data, cb) => {

    if (!socket.player) {
      if (cb) cb({ ok: false, error: "Debes iniciar sesión para crear torneos" });
      return;
    }

    const size = data?.size || 4;
    const t    = tm.createTournament(socket, size);

    // El creador se une automáticamente
    tm.joinTournament(t.code, socket);

    socket.join(`tournament_${t.id}`);

    console.log(
      `🏆 Torneo creado: ${t.code} por ${socket.player?.username}`
    );

    if (cb) cb({ ok: true, code: t.code, tournamentId: t.id, players: t.players });

  });

  // Unirse a torneo
  socket.on("joinTournament", (data, cb) => {

    if (!socket.player) {
      if (cb) cb({ ok: false, error: "Debes iniciar sesión para unirte a torneos" });
      return;
    }

    const result = tm.joinTournament(data?.code, socket);

    if (!result.ok) {
      if (cb) cb({ ok: false, error: result.error });
      return;
    }

    const t = result.tournament;

    // Notificar a todos los del torneo
    io.to(`tournament_${t.id}`).emit("tournamentUpdate", {
      players: t.players,
      size:    t.size,
      code:    t.code,
      status:  t.status
    });

    console.log(
      `🏆 ${socket.player?.username} se unió al torneo ${t.code} (${t.players.length}/${t.size})`
    );

    if (cb) cb({ ok: true, tournamentId: t.id, code: t.code });

    // Si está lleno → fase de votación
    if (t.players.length >= t.size) {

      t.status = "voting";

      const songs = songCatalog.getAll();
      const numRounds = Math.log2(t.size);

      io.to(`tournament_${t.id}`).emit("tournamentVoting", {
        tournamentId: t.id,
        songs,
        numRounds,
        roundNames: numRounds === 2
          ? ["Semifinal", "Final"]
          : ["Cuartos", "Semifinal", "Final"]
      });

    }

  });

  // ── Cola de torneo rápido ────────────────────────────────
  socket.on("joinQuickTournament", (data, cb) => {

    if (!socket.player) {
      if (cb) cb({ ok: false, error: "Debes iniciar sesión" });
      return;
    }

    const size = data?.size === 8 ? 8 : 4;
    const result = tm.joinQuickQueue(socket, size);

    if (!result.ok) {
      if (cb) cb({ ok: false, error: result.error });
      return;
    }

    if (result.ready) {

      // Torneo listo — arrancar fase de votación
      const t = result.tournament;
      t.status = "voting";

      const songs     = songCatalog.getAll();
      const numRounds = Math.log2(t.size);

      console.log(`🏆 Torneo rápido ${t.size} jugadores iniciado: ${t.code}`);

      // Notificar a todos los jugadores
      io.to(`tournament_${t.id}`).emit("tournamentUpdate", {
        players: t.players,
        size:    t.size,
        code:    t.code,
        status:  t.status
      });

      io.to(`tournament_${t.id}`).emit("tournamentVoting", {
        tournamentId: t.id,
        songs,
        numRounds,
        roundNames: numRounds === 2
          ? ["Semifinal", "Final"]
          : ["Cuartos", "Semifinal", "Final"]
      });

      // Notificar a cada jugador con su callback
      result.players.forEach(s => {
        s.emit("quickTournamentJoined", {
          tournamentId: t.id,
          code:         t.code,
          size:         t.size
        });
      });

    } else {

      // En cola — notificar posición
      if (cb) cb({ ok: true, position: result.position, total: result.total });

      // Broadcast a toda la cola con el estado actual
      const status = tm.getQuickQueueStatus(size);
      socket.emit("quickQueueUpdate", status);

    }

  });

  socket.on("leaveQuickTournament", () => {
    tm.leaveQuickQueue(socket);
  });

  // ══════════════════════════════════════════════
  // MODO ESPECTADOR
  // ══════════════════════════════════════════════

  // Obtener lista de partidas activas
  socket.on("getActiveMatches", (cb) => {

    const activeRooms = rooms.getAll ? rooms.getAll() : [];

    // Buscar todas las salas con exactamente 2 jugadores
    const matches = [];

    // Recorrer socketPlayers para encontrar partidas activas
    const roomMap = {};
    Object.entries(socketPlayers).forEach(([socketId, player]) => {
      const sock = io.sockets.sockets.get(socketId);
      if (!sock) return;

      const room = [...sock.rooms].find(r =>
        r !== socketId &&
        !r.startsWith("tournament_") &&
        !r.startsWith("spectate_")
      );

      if (!room) return;

      if (!roomMap[room]) roomMap[room] = [];
      roomMap[room].push({ socketId, username: player.username, elo: player.elo });
    });

    // Solo salas con 2 jugadores (partida real)
    Object.entries(roomMap).forEach(([room, players]) => {
      if (players.length === 2) {
        const roomData = gameManager.getRoomData(room);
        matches.push({
          room,
          players: players.map(p => ({
            username: p.username,
            elo:      p.elo
          })),
          songName:   roomData?.songName,
          difficulty: roomData?.difficulty
        });
      }
    });

    if (cb) cb({ matches });

  });

  // Unirse como espectador
  socket.on("spectate", (data, cb) => {

    const { room } = data;
    if (!room) {
      if (cb) cb({ ok: false, error: "Sala no encontrada" });
      return;
    }

    socket.join(`spectate_${room}`);
    socket.spectatingRoom = room;

    // Buscar info de los jugadores en esa sala
    const players = [];
    Object.entries(socketPlayers).forEach(([socketId, player]) => {
      const sock = io.sockets.sockets.get(socketId);
      if (!sock) return;
      if (sock.rooms.has(room)) {
        players.push({ socketId, username: player.username, elo: player.elo });
      }
    });

    // Enviar estado inicial — ambos jugadores a 100 HP
    players.forEach(p => {
      socket.emit("spectatorUpdate", {
        playerId: p.socketId,
        username: p.username,
        hp:       100,
        type:     "hp"
      });
      socket.emit("spectatorUpdate", {
        playerId: p.socketId,
        username: p.username,
        score:    0,
        type:     "score"
      });
    });

    console.log(`👁 ${socket.player?.username || "Anon"} espectando sala ${room}`);

    // Incluir datos de la canción si la partida ya está en curso
    const roomData = gameManager.getRoomData(room);

    if (cb) cb({ ok: true, players, ...( roomData || {}) });

  });

  // Dejar de espectare
  socket.on("stopSpectating", () => {
    if (socket.spectatingRoom) {
      socket.leave(`spectate_${socket.spectatingRoom}`);
      socket.spectatingRoom = null;
    }
  });

  // ── Votar canciones ───────────────────────────────────────
  socket.on("tournamentVote", (data) => {

    const t = tm.getTournament(data?.tournamentId);
    if (!t) return;

    tm.voteRoundSongs(t.id, socket.id, data.votes);

    // Notificar progreso de votación
    const voted = Object.keys(t.songVotes).length;
    io.to(`tournament_${t.id}`).emit("tournamentVoteProgress", {
      voted,
      total: t.players.length
    });

    // Si todos votaron → resolver y empezar
    if (tm.allVoted(t.id)) {

      const roundSongs = tm.resolveRoundSongs(t.id);
      const tournament = tm.startTournament(t.id);
      const matches    = tm.getCurrentMatches(t.id);

      // Resolver nombres de canciones para mostrar en el bracket
      const roundSongNames = roundSongs.map(id => {
        const s = songCatalog.getById(id);
        return s ? s.name : id;
      });

      // Notificar bracket a todos
      io.to(`tournament_${t.id}`).emit("tournamentStart", {
        tournamentId: t.id,
        bracket:      tournament.bracket,
        roundSongs:   roundSongNames,
        roundNames:   tournament.bracket.length === 2
          ? ["Semifinal", "Final"]
          : ["Cuartos", "Semifinal", "Final"]
      });

      // Lanzar cada match de la ronda 1
      setTimeout(() => {
        launchTournamentRound(t.id, io);
      }, 3000);

    }

  });

  // Resultado de match de torneo
  socket.on("tournamentMatchResult", (data) => {

    const { tournamentId, matchId, winnerId } = data;
    const result = tm.reportMatchResult(tournamentId, matchId, winnerId);

    if (!result) return;

    const t = result.tournament;

    if (result.finished) {

      // Torneo terminado — avisar campeón
      const champion = t.players.find(p => p.socketId === winnerId);

      // Refrescar ELO actualizado de la DB
      if (champion) {
        const sp = socketPlayers[champion.socketId];
        if (sp) {
          const fresh = findById(sp.id);
          if (fresh) champion.elo = fresh.elo;
        }
      }

      // Calcular posiciones
      const finalist   = t.bracket[t.bracket.length - 1][0];
      const loserId    = finalist.player1?.socketId === winnerId
        ? finalist.player2?.socketId
        : finalist.player1?.socketId;

      const semiLosers = t.bracket[0]
        .map(m => m.player1?.socketId === m.winner
          ? m.player2?.socketId
          : m.player1?.socketId
        )
        .filter(Boolean);

      const positions = { first: winnerId, second: loserId, third: semiLosers };

      io.to(`tournament_${t.id}`).emit("tournamentFinished", {
        champion,
        bracket:   t.bracket,
        positions
      });

      console.log(`🏆 Torneo ${t.code} terminado. Campeón: ${champion?.username}`);

    } else if (result.advanced) {

      // Nueva ronda disponible
      const roundSongNames = t.roundSongs.map(id => {
        const s = songCatalog.getById(id);
        return s ? s.name : id;
      });

      io.to(`tournament_${t.id}`).emit("tournamentRoundAdvance", {
        bracket:      t.bracket,
        currentRound: t.currentRoundIndex,
        roundSongs:   roundSongNames
      });

      setTimeout(() => {
        launchTournamentRound(t.id, io);
      }, 5000);

    }

  });

  // Estado del torneo (botón de seguridad)
  socket.on("getTournamentState", (data) => {

    const t = tm.getTournament(data?.tournamentId);
    if (!t) return;

    const roundSongNames = t.roundSongs.map(id => {
      const s = songCatalog.getById(id);
      return s ? s.name : id;
    });

    socket.emit("tournamentState", {
      status:            t.status,
      bracket:           t.bracket,
      currentRoundIndex: t.currentRoundIndex,
      roundSongNames,
      champion: t.champion
        ? t.players.find(p => p.socketId === t.champion)
        : null,
      positions: t.positions || null
    });

  });

  /*
  MODO PRÁCTICA
  */

  socket.on("joinPractice", data => {

    const songId      = data?.songId;
    const isCommunity = data?.isCommunity === true;

    let song;

    if (isCommunity && songId) {
      const cs = getCommunitySong(songId);
      if (cs) {
        song = {
          id:        cs.song_id,
          name:      cs.name,
          audio:     cs.audio_url
            ? cs.audio_url  // URL relativa
            : null,
          duration:  cs.duration,
          community: true
        };
      }
    }

    if (!song) {
      const id       = songId || songCatalog.getRandomId();
      const official = songCatalog.getById(id);
      const fallback = songCatalog.getAll()[0];
      const s        = official || fallback;
      song = {
        id:        s.id,
        name:      s.name,
        audio:     s.audio,
        duration:  s.duration,
        community: false
      };
    }

    socket.emit("gameStart", {
      startAt: Date.now() + 5000,
      song
    });

    console.log(
      `Práctica: ${socket.player?.username ?? "invitado"} | ${song.name}`
    );

  });

  /*
  PING
  */

  socket.on("ping_check", (cb) => {
    if (typeof cb === "function") cb();
  });

  /*
  DESCONECTAR
  */

  socket.on("disconnect", () => {

    rooms.removePlayer(socket.id);
    delete socketPlayers[socket.id];
    tm.leaveQuickQueue(socket); // limpiar cola rápida si estaba esperando

    console.log("Desconectado:", socket.id);
  });

});

/*
=================================
BUCLE DE MATCHMAKING
Cada 3s intenta emparejar jugadores
El rango ELO se amplía con el tiempo
de espera de cada jugador
=================================
*/


/*
=================================
LANZAR RONDA DE TORNEO
=================================
*/

function launchTournamentRound(tournamentId, io) {

  const t = tm.getTournament(tournamentId);
  if (!t) return;

  const matches = tm.getCurrentMatches(tournamentId);
  const songId  = t.roundSongs[t.currentRoundIndex];
  const song    = songCatalog.getById(songId);
  const startAt = Date.now() + 5000;

  if (!song) {
    console.error(`⚠️ Canción no encontrada: ${songId}`);
    return;
  }

  matches.forEach(match => {

    if (!match.player1 || !match.player2) return;

    const roomId = `tournament_${tournamentId}_${match.matchId}`;

    const s1 = io.sockets.sockets.get(match.player1.socketId);
    const s2 = io.sockets.sockets.get(match.player2.socketId);

    if (s1) s1.join(roomId);
    if (s2) s2.join(roomId);

    match.status = "playing";
    match.roomId = roomId;

    t.activeMatches[match.matchId] = roomId;

    io.to(roomId).emit("gameStart", {
      startAt,
      song: {
        id:        song.id,
        name:      song.name,
        audio:     song.audio,
        duration:  song.duration,
        community: false
      },
      tournament: {
        tournamentId,
        matchId:    match.matchId,
        roundIndex: t.currentRoundIndex
      }
    });

    console.log(
      `🏆 Match ${match.matchId}: ${match.player1.username} vs ${match.player2.username} | ${song.name}`
    );

  });

}

function tryCreateMatch() {

  while (rooms.canCreateMatch()) {

    const match = rooms.createMatch();

    if (!match) break;

    match.player1.join(match.roomId);
    match.player2.join(match.roomId);

    songVotes[match.roomId] = {};

    match.player1.emit("roomCreated", {
      roomId:     match.roomId,
      players:    2,
      difficulty: match.difficulty1,
      eloDiff:    match.eloDiff,
      rival: {
        username:   match.player2.player?.username ?? "Invitado",
        elo:        match.player2.player?.elo ?? 1000,
        difficulty: match.difficulty2
      }
    });

    match.player2.emit("roomCreated", {
      roomId:     match.roomId,
      players:    2,
      difficulty: match.difficulty2,
      eloDiff:    match.eloDiff,
      rival: {
        username:   match.player1.player?.username ?? "Invitado",
        elo:        match.player1.player?.elo ?? 1000,
        difficulty: match.difficulty1
      }
    });

    console.log(
      `Sala creada: ${match.roomId} | Δ ELO: ${match.eloDiff}`
    );

  }

}

setInterval(tryCreateMatch, 3000);

server.listen(PORT, () => {
  console.log(
    `Servidor iniciado en puerto ${PORT}`
  );
});