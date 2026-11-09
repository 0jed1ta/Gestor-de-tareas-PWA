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

function cacheFirst(peticion) {
  return caches.match(peticion).then((enCache) => {
    if (enCache) {
      return enCache;
    }

    return fetch(peticion).then((respuesta) => {
      const clon = respuesta.clone();
      caches
        .open(CACHE_ACTUAL)
        .then((cache) => cache.put(peticion, clon));
      return respuesta;
    });
  });
}

function networkFirst(peticion) {
  return fetch(peticion)
    .then((respuesta) => {
      const clon = respuesta.clone();
      caches
        .open(CACHE_ACTUAL)
        .then((cache) => cache.put(peticion, clon));
      return respuesta;
    })
    .catch(() => caches.match(peticion));
}

function staleWhileRevalidate(peticion) {
  return caches.open(CACHE_ACTUAL).then((cache) =>
    cache.match(peticion).then((enCache) => {
      const actualizacion = fetch(peticion).then((respuesta) => {
        cache.put(peticion, respuesta.clone());
        return respuesta;
      });
      return enCache || actualizacion;
    })
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(event.request));
  } else if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request));
  } else {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
