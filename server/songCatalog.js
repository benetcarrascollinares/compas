const songs = [

  {
    id:       "song_a",
    name:     "Neon Rush",
    artist:   "RhythmBot",
    stars:    { easy: 1, normal: 2, hard: 4 },
    duration: 30000,
    audio:    "./assets/songs/song_a.mp3"
  },

  {
    id:       "song_b",
    name:     "Circuit Break",
    artist:   "RhythmBot",
    stars:    { easy: 1, normal: 3, hard: 5 },
    duration: 30000,
    audio:    "./assets/songs/song_b.mp3"
  },

  {
    id:       "song_c",
    name:     "Pulse Wave",
    artist:   "RhythmBot",
    stars:    { easy: 1, normal: 2, hard: 3 },
    duration: 30000,
    audio:    "./assets/songs/song_c.mp3"
  }

];

function getAll() {
  return songs;
}

function getById(id) {
  return songs.find(s => s.id === id) || null;
}

function getRandomId() {
  const i = Math.floor(Math.random() * songs.length);
  return songs[i].id;
}

module.exports = { getAll, getById, getRandomId };
