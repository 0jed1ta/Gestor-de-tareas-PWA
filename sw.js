importScripts("lib/workbox-v7.4.1/workbox-sw.js");
workbox.setConfig({ modulePathPrefix: "lib/workbox-v7.4.1/", debug: false });

const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

self.skipWaiting();
workbox.core.clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute([{"revision":"22384029b97d74ebcb301e72f00f55a8","url":"index.html"},{"revision":"fc84ff63224634818999002d4288067c","url":"manifest.json"},{"revision":"4277ca83a432d463b2dd6c5cb094baf4","url":"css/estilos.css"},{"revision":"f3ffe36112cde77aaae2bb041caff119","url":"workbox-196b24d2.js"},{"revision":"bae8c18edeaf5063460a102116a4ad8a","url":"tareas.js"},{"revision":"29e2582e508185a509c93fc73f0dfc74","url":"sync.js"},{"revision":"f401e0d081efc5a304a8253260784a63","url":"sensores.js"},{"revision":"1433ebf348a0f5a72297890d9f38770e","url":"notificaciones.js"},{"revision":"dc281b70aea49e5525e2343f8269306f","url":"dispositivo.js"},{"revision":"cdc81d730bd8024bee54cafda4a537b8","url":"db.js"},{"revision":"200128abd7e14f28b5147f2a71e59527","url":"crypto.js"},{"revision":"c418814c55332dd3135d6399fc7c5499","url":"app.js"},{"revision":"916675198be1f0b31c9535700364d050","url":"icons/icon-512.png"},{"revision":"238df3f8103dfc9c36e481b23510eb84","url":"icons/icon-512-maskable.png"},{"revision":"30dad524c42638418c4249e28bda4dbe","url":"icons/icon-192.png"}]);

registerRoute(
  ({ url }) => url.pathname.startsWith("/icons/"),
  new CacheFirst({
    cacheName: "imagenes",
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 2592000 })],
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({ cacheName: "api-tareas" })
);

self.addEventListener("push", (evento) => {
  let datos = { titulo: "Gestor de Tareas", cuerpo: "Tienes novedades.", url: "/index.html" };
  try {
    if (evento.data) datos = { ...datos, ...evento.data.json() };
  } catch {
    if (evento.data) datos.cuerpo = evento.data.text();
  }
  evento.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: datos.tag ?? "gestor-aviso",
      data: { url: datos.url },
    })
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.url ?? "/index.html", self.location.origin).href;
  evento.waitUntil(
    (async () => {
      const ventanas = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const abierta = ventanas.find((ventana) => new URL(ventana.url).origin === self.location.origin);
      return abierta ? abierta.focus() : clients.openWindow(destino);
    })()
  );
});

function abrirBaseDeDatos() {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open("gestor-tareas-db");
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
}

function resolverPeticion(peticion) {
  return new Promise((resolve, reject) => {
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
}

async function vaciarBandeja() {
  const db = await abrirBaseDeDatos();
  const pendientes = await resolverPeticion(db.transaction("outbox").objectStore("outbox").getAll());
  let enviados = 0;
  for (const cambio of pendientes) {
    const respuesta = await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambio),
    });
    if (!respuesta.ok) throw new Error(`El servidor respondió ${respuesta.status}`);
    await resolverPeticion(db.transaction("outbox", "readwrite").objectStore("outbox").delete(cambio.idCambio));
    enviados += 1;
  }
  db.close();
  return enviados;
}

async function avisarDeSincronizacion(enviados) {
  if (enviados === 0) return;
  const ventanas = await clients.matchAll({ type: "window" });
  ventanas.forEach((ventana) => ventana.postMessage({ tipo: "sync-completo", enviados }));
  if (!ventanas.some((ventana) => ventana.visibilityState === "visible")) {
    await self.registration.showNotification("Tareas sincronizadas", {
      body: enviados === 1 ? "1 tarea llegó al servidor." : `${enviados} tareas llegaron al servidor.`,
      icon: "/icons/icon-192.png",
      tag: "gestor-sync",
      data: { url: "/index.html" },
    });
  }
}

self.addEventListener("sync", (evento) => {
  if (evento.tag === "sync-tareas") {
    evento.waitUntil(vaciarBandeja().then(avisarDeSincronizacion));
  }
});
