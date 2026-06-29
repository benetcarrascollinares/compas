import { socket } from "./socket.js";
import { fetchCommunitySongs } from "./communityClient.js";

const API = `${window.location.origin}/api`;

let selectedSongId   = null;
let selectedSongType = "official"; // "official" | "community"
let songs            = [];
let communitySongs   = [];
let inRoom           = false;

/*
=================================
CARGAR CATÁLOGO
=================================
*/

export async function loadSongCatalog() {

  try {
    const res = await fetch(`${API}/songs`);
    songs = await res.json();
  } catch {
    songs = [];
  }

  // Cargar canciones comunitarias
  communitySongs = await fetchCommunitySongs();

  renderSelector();

  if (songs.length > 0) {
    selectSong(songs[0].id, false);
  }

  // Actualizar estrellas cuando cambie la dificultad
  document
    .getElementById("difficulty")
    ?.addEventListener("change", () => {
      renderSelector();
      if (selectedSongId) {
        selectSong(selectedSongId, false);
      }
    });

}

/*
=================================
ACTIVAR MODO VOTACIÓN
(llamar cuando roomCreated)
=================================
*/

export function activateVoting() {

  inRoom = true;

  if (selectedSongId) {
    socket.emit("voteSong", {
      songId: selectedSongId
    });
  }

  const panel =
    document.getElementById("votePanel");

  if (panel) {
    panel.style.display = "block";
  }

}

export function deactivateVoting() {

  inRoom = false;

  const panel =
    document.getElementById("votePanel");

  if (panel) {
    panel.style.display = "none";
  }

  clearRivalVote();

}

/*
=================================
OBTENER CANCIÓN SELECCIONADA
=================================
*/

export function getSelectedSongId() {
  return selectedSongId;
}

export function getSelectedSongType() {
  return selectedSongType;
}

/*
=================================
SELECCIONAR CANCIÓN
=================================
*/

function selectSong(id, emitVote = true, type = "official") {

  selectedSongId   = id;
  selectedSongType = type;

  document
    .querySelectorAll(".song-card")
    .forEach(card => {
      card.classList.toggle(
        "selected",
        card.dataset.id === id
      );
    });

  // Manejar selector de dificultad
  const diffSelect = document.getElementById("difficulty");
  const diffWrapper = document.getElementById("difficultyWrapper");

  if (type === "community") {
    // Canción comunitaria — dificultad fija
    const card = document.querySelector(`.song-card[data-id="${id}"]`);
    const diff = card?.dataset.difficulty || "normal";
    if (diffSelect) {
      diffSelect.value    = diff;
      diffSelect.disabled = true;
      diffSelect.style.opacity = "0.5";
    }
  } else {
    // Canción oficial — dificultad libre
    if (diffSelect) {
      diffSelect.disabled      = false;
      diffSelect.style.opacity = "";
    }
  }

  if (inRoom && emitVote) {
    socket.emit("voteSong", { songId: id });
  }

  updateMyVoteLabel(id);

}

/*
=================================
MOSTRAR VOTO DEL RIVAL
=================================
*/

export function showRivalVote(songId) {

  document
    .querySelectorAll(".song-card")
    .forEach(card => {

      const rivalTag =
        card.querySelector(".rival-tag");

      if (card.dataset.id === songId) {

        if (!rivalTag) {
          const tag =
            document.createElement("div");
          tag.className = "rival-tag";
          tag.textContent = "👤 Rival";
          card.appendChild(tag);
        }

      } else {

        if (rivalTag) rivalTag.remove();

      }

    });

}

function clearRivalVote() {

  document
    .querySelectorAll(".rival-tag")
    .forEach(tag => tag.remove());

}

function updateMyVoteLabel(id) {

  const song = songs.find(s => s.id === id);

  const label =
    document.getElementById("myVoteLabel");

  if (label && song) {
    label.textContent =
      `Tu voto: ${song.name}`;
  }

}

/*
=================================
RENDER
=================================
*/

function starsHtml(stars) {

  const difficulty =
    document.getElementById("difficulty")?.value
    || "normal";

  const n = typeof stars === "object"
    ? (stars[difficulty] ?? stars.normal ?? 1)
    : stars;

  return "★".repeat(n) + "☆".repeat(5 - n);

}

function renderSelector() {

  const container =
    document.getElementById("songSelector");

  if (!container) return;

  const difficulty =
    document.getElementById("difficulty")?.value || "normal";

  // Canciones oficiales
  const officialCards = songs.map(song => {
    const n = typeof song.stars === "object"
      ? (song.stars[difficulty] ?? song.stars.normal ?? 1)
      : song.stars;
    return `
      <div class="song-card" data-id="${song.id}" data-type="official">
        <div class="song-name">${song.name}</div>
        <div class="song-artist">${song.artist}</div>
        <div class="song-stars">${"★".repeat(n)}${"☆".repeat(5-n)}</div>
      </div>
    `;
  }).join("");

  // Canciones comunitarias
  const communityCards = communitySongs.length > 0
    ? communitySongs.map(song => {
        const n = song.stars || 3;
        const ratingHtml = song.rating_count > 0
          ? `<span class="rating-val">⭐ ${song.avg_rating}</span> · ${song.rating_count} valoración${song.rating_count !== 1 ? "es" : ""}`
          : `Sin valoraciones`;
        return `
          <div class="song-card community-song" data-id="${song.song_id}" data-type="community" data-difficulty="${song.difficulty || 'normal'}">
            <div class="song-name">${song.name}</div>
            <div class="song-artist">${song.creator_name}</div>
            <div class="song-stars">${"★".repeat(n)}${"☆".repeat(5-n)}</div>
            <div class="song-community-rating">${ratingHtml}</div>
          </div>
        `;
      }).join("")
    : `<div class="songs-col-empty">🎹 ¡Sé el primero!<br>Crea un beatmap<br>desde el <a href="editor.html" style="color:#ffcc00;text-decoration:underline">Editor</a></div>`;

  container.innerHTML = `
    <div class="songs-col">
      <div class="songs-col-label">🎵 Oficial</div>
      <div class="songs-col-scroll" id="officialScroll">
        ${officialCards}
      </div>
    </div>
    <div class="songs-col">
      <div class="songs-col-label">🌍 Comunidad</div>
      <div class="songs-col-scroll" id="communityScroll">
        ${communityCards}
      </div>
    </div>
  `;

  container
    .querySelectorAll(".song-card")
    .forEach(card => {
      card.addEventListener("click", () => {
        selectSong(card.dataset.id, true, card.dataset.type);
      });
    });

}

/*
=================================
ACTUALIZAR ESTADO RIVAL EN PANEL
=================================
*/

export function updateRivalVoteStatus(songId) {

  const song = songs.find(s => s.id === songId);

  const el =
    document.getElementById("rivalVoteStatus");

  if (el && song) {
    el.textContent = `👤 Rival vota: ${song.name}`;
  }

}