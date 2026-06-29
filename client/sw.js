const CACHE_NAME = "compas-v1";

const STATIC_ASSETS = [
  "/index.html",
  "/style.css",
  "/game.js",
  "/ui.js",
  "/audio.js",
  "/input.js",
  "/notes.js",
  "/renderer.js",
  "/score.js",
  "/combo.js",
  "/hp.js",
  "/energy.js",
  "/shield.js",
  "/difficulty.js",
  "/battle.js",
  "/socket.js",
  "/login.js",
  "/clientAuth.js",
  "/clientUnlockables.js",
  "/titles.js",
  "/profile.js",
  "/songSelector.js",
  "/communityClient.js",
  "/tournamentClient.js",
  "/songs/song_a_easy.js",
  "/songs/song_a_normal.js",
  "/songs/song_a_hard.js",
  "/songs/song_b_easy.js",
  "/songs/song_b_normal.js",
  "/songs/song_b_hard.js",
  "/songs/song_c_easy.js",
  "/songs/song_c_normal.js",
  "/songs/song_c_hard.js"
];

/*
=================================
INSTALL — cachear assets estáticos
=================================
*/

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );

});

/*
=================================
ACTIVATE — limpiar caches viejas
=================================
*/

self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );

});

/*
=================================
FETCH — network first, cache fallback
La lógica:
  - API y socket.io → siempre red (no cachear)
  - Assets estáticos → red primero, cache si falla
=================================
*/

self.addEventListener("fetch", event => {

  const url = new URL(event.request.url);

  // No interceptar: API, socket.io, uploads
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io/") ||
    url.pathname.startsWith("/uploads/")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {

        // No cachear: respuestas parciales (MP3 range requests),
        // respuestas de error, o respuestas no-GET
        if (
          response.ok &&
          response.status !== 206 &&
          event.request.method === "GET"
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone));
        }

        return response;

      })
      .catch(() => {
        // Sin red → usar cache
        return caches.match(event.request);
      })
  );

});