const songCatalog = require("./songCatalog");
const { getSong: getCommunitySong } = require("./db/communitySongs");

// Datos activos por sala (para espectadores)
const activeRoomData = {};

function startGame(io, roomId, songId, isCommunity = false) {

  const startAt = Date.now() + 5000;

  let song;

  if (isCommunity && songId) {

    // Canción comunitaria
    const cs = getCommunitySong(songId);

    if (cs) {
      song = {
        id:        cs.song_id,
        name:      cs.name,
        audio:     cs.audio_url
          ? cs.audio_url  // URL relativa — el cliente usa window.location.origin
          : null,
        duration:  cs.duration,
        community: true
      };
    }

  }

  if (!song) {

    // Canción oficial
    const id = songId || songCatalog.getRandomId();
    const official = songCatalog.getById(id);

    if (official) {
      song = {
        id:        official.id,
        name:      official.name,
        audio:     official.audio,
        duration:  official.duration,
        community: false
      };
    } else {
      // Fallback
      const fallback = songCatalog.getAll()[0];
      song = {
        id:        fallback.id,
        name:      fallback.name,
        audio:     fallback.audio,
        duration:  fallback.duration,
        community: false
      };
    }

  }

  io.to(roomId).emit("gameStart", { startAt, song });

  // Guardar info de la sala para espectadores
  activeRoomData[roomId] = {
    songId:     song.id,
    songName:   song.name,
    audioUrl:   song.audio,
    duration:   song.duration,
    startAt,
    community:  song.community
  };

  // Notificar a espectadores que la partida empezó
  io.to(`spectate_${roomId}`).emit("spectatorGameStart", {
    songId:     song.id,
    audioUrl:   song.audio,
    startAt,
    difficulty: "normal" // se actualizará cuando los jugadores envíen difficulty
  });

  console.log(
    `Partida: ${roomId} | ${song.community ? "🌍" : "🎵"} ${song.name}`
  );

}

function getRoomData(roomId) {
  return activeRoomData[roomId] || null;
}

function clearRoomData(roomId) {
  delete activeRoomData[roomId];
}

module.exports = { startGame, getRoomData, clearRoomData, activeRoomData };