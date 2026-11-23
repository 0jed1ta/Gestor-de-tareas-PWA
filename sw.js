importScripts("lib/workbox-v7.4.1/workbox-sw.js");
workbox.setConfig({ modulePathPrefix: "lib/workbox-v7.4.1/", debug: false });

const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

self.skipWaiting();
workbox.core.clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute([{"revision":"469f20d665a2ef2d84c14c2d9ecec795","url":"index.html"},{"revision":"176f4fdad6ace411252fa1ea18309510","url":"manifest.json"},{"revision":"3986ddbbfbec831479e09cc8d4d6efdc","url":"css/estilos.css"},{"revision":"f3ffe36112cde77aaae2bb041caff119","url":"workbox-196b24d2.js"},{"revision":"bae8c18edeaf5063460a102116a4ad8a","url":"tareas.js"},{"revision":"f401e0d081efc5a304a8253260784a63","url":"sensores.js"},{"revision":"1433ebf348a0f5a72297890d9f38770e","url":"notificaciones.js"},{"revision":"dc281b70aea49e5525e2343f8269306f","url":"dispositivo.js"},{"revision":"288b47049dc99b30afc9443b1012ae7c","url":"db.js"},{"revision":"200128abd7e14f28b5147f2a71e59527","url":"crypto.js"},{"revision":"c758f10b3a272723ec8bf0ca98e94172","url":"app.js"},{"revision":"916675198be1f0b31c9535700364d050","url":"icons/icon-512.png"},{"revision":"238df3f8103dfc9c36e481b23510eb84","url":"icons/icon-512-maskable.png"},{"revision":"30dad524c42638418c4249e28bda4dbe","url":"icons/icon-192.png"}]);

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
