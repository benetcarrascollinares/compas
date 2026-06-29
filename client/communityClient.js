const API = `${window.location.origin}/api/community`;

/*
=================================
CARGAR CANCIONES COMUNITARIAS
=================================
*/

export async function fetchCommunitySongs() {

  try {
    const res = await fetch(`${API}/songs`);
    return await res.json();
  } catch {
    return [];
  }

}

/*
=================================
OBTENER BEATMAP COMPLETO
=================================
*/

export async function fetchCommunityBeatmap(songId) {

  try {
    const res = await fetch(`${API}/songs/${songId}/beatmap`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }

}

/*
=================================
VALORAR CANCIÓN
=================================
*/

export async function rateSong(songId, rating) {

  const token = localStorage.getItem("rb_token");
  if (!token) return null;

  try {

    const res = await fetch(
      `${API}/songs/${songId}/rate`,
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ rating })
      }
    );

    return await res.json();

  } catch {
    return null;
  }

}

/*
=================================
MI VALORACIÓN
=================================
*/

export async function getMyRating(songId) {

  const token = localStorage.getItem("rb_token");
  if (!token) return null;

  try {

    const res = await fetch(
      `${API}/songs/${songId}/myrating`,
      {
        headers: { "Authorization": `Bearer ${token}` }
      }
    );

    const data = await res.json();
    return data.rating;

  } catch {
    return null;
  }

}

/*
=================================
RENDER STARS
=================================
*/

export function starsHtml(avg, count) {

  if (!avg || count === 0) return "Sin valoraciones";

  const full  = Math.floor(avg);
  const half  = avg - full >= 0.3 ? 1 : 0;
  const empty = 5 - full - half;

  return (
    "★".repeat(full) +
    (half ? "½" : "") +
    "☆".repeat(empty) +
    ` ${avg} (${count})`
  );

}

/*
=================================
MOSTRAR MODAL DE RATING
Post-partida con canción comunitaria
=================================
*/

export function showRatingModal(songId, songName, onRate) {

  // No mostrar si ya existe
  if (document.getElementById("ratingModal")) return;

  const modal = document.createElement("div");
  modal.id = "ratingModal";

  modal.innerHTML = `
    <div id="ratingModalInner">
      <div id="ratingModalTitle">¿Qué te pareció este beatmap?</div>
      <div id="ratingModalSong">${songName}</div>
      <div id="ratingStars">
        <span class="rating-star" data-value="1">★</span>
        <span class="rating-star" data-value="2">★</span>
        <span class="rating-star" data-value="3">★</span>
        <span class="rating-star" data-value="4">★</span>
        <span class="rating-star" data-value="5">★</span>
      </div>
      <button id="ratingSkip">Omitir</button>
    </div>
  `;

  document.body.appendChild(modal);

  let selected = 0;

  const stars = modal.querySelectorAll(".rating-star");

  stars.forEach(star => {

    star.addEventListener("mouseenter", () => {
      const val = parseInt(star.dataset.value);
      stars.forEach((s, i) => {
        s.classList.toggle("active", i < val);
      });
    });

    star.addEventListener("mouseleave", () => {
      stars.forEach((s, i) => {
        s.classList.toggle("active", i < selected);
      });
    });

    star.addEventListener("click", async () => {

      selected = parseInt(star.dataset.value);
      stars.forEach((s, i) => {
        s.classList.toggle("active", i < selected);
      });

      const result = await rateSong(songId, selected);

      if (result?.error) {
        const errorEl = document.createElement("div");
        errorEl.style.cssText = "color:#f44336;font-size:13px;margin-top:8px;text-align:center";
        errorEl.textContent = result.error;
        document.getElementById("ratingModalInner")?.appendChild(errorEl);
        setTimeout(() => modal.remove(), 2000);
        return;
      }

      if (onRate) onRate(result);
      setTimeout(() => modal.remove(), 600);

    });

  });

  document.getElementById("ratingSkip")
    .addEventListener("click", () => modal.remove());

}