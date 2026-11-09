const CACHE_ACTUAL = "gestor-tareas-v2";
const CORE_ASSETS = [
  "/index.html",
  "/css/estilos.css",
  "/app.js",
  "/tareas.js",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_ACTUAL).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((nombre) => nombre !== CACHE_ACTUAL)
            .map((nombre) => caches.delete(nombre))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((encontrado) => encontrado || fetch(event.request))
  );
});
