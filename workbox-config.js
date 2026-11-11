module.exports = {
  globDirectory: ".",
  globPatterns: [
    "index.html",
    "manifest.json",
    "css/*.css",
    "*.js",
    "icons/*.png",
  ],
  globIgnores: [
    "node_modules/**/*",
    "workbox-config.js",
    "workbox-*.js",
    "package*.json",
  ],
  swDest: "sw.js",
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /\/icons\//,
      handler: "CacheFirst",
      options: {
        cacheName: "imagenes",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 2592000,
        },
      },
    },
    {
      urlPattern: /\/api\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-tareas",
      },
    },
  ],
};
