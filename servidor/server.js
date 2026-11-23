const http = require("http");
const fs = require("fs");
const path = require("path");
const webpush = require("web-push");

const PUERTO = process.env.PORT || 3000;
const RAIZ = path.join(__dirname, "..");
const DIRECTORIO_DATOS = process.env.DATA_DIR || __dirname;
const ARCHIVO_CLAVES = path.join(DIRECTORIO_DATOS, "claves-vapid.json");
const ARCHIVO_DATOS = path.join(DIRECTORIO_DATOS, "datos.json");
const ORIGEN_PERMITIDO = process.env.FRONTEND_ORIGIN || "https://0jed1ta.github.io";

let claves;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  claves = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };
} else if (fs.existsSync(ARCHIVO_CLAVES)) {
  claves = JSON.parse(fs.readFileSync(ARCHIVO_CLAVES, "utf8"));
} else {
  fs.mkdirSync(DIRECTORIO_DATOS, { recursive: true });
  claves = webpush.generateVAPIDKeys();
  fs.writeFileSync(ARCHIVO_CLAVES, JSON.stringify(claves, null, 2));
}
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:juan.ojeda@uptc.edu.co",
  claves.publicKey,
  claves.privateKey
);

function leerDatos() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO_DATOS, "utf8"));
  } catch {
    return { suscripciones: [] };
  }
}

function guardarDatos(datos) {
  fs.writeFileSync(ARCHIVO_DATOS, JSON.stringify(datos, null, 2));
}

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function leerCuerpo(peticion) {
  return new Promise((resolve, reject) => {
    let texto = "";
    peticion.on("data", (fragmento) => {
      texto += fragmento;
      if (texto.length > 1e6) peticion.destroy();
    });
    peticion.on("end", () => {
      try {
        resolve(texto ? JSON.parse(texto) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function responder(respuesta, codigo, objeto) {
  respuesta.writeHead(codigo, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": ORIGEN_PERMITIDO,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  respuesta.end(JSON.stringify(objeto));
}

async function atenderApi(peticion, respuesta, ruta) {
  const datos = leerDatos();
  if (peticion.method === "GET" && ruta === "/api/clave-publica") {
    return responder(respuesta, 200, { clave: claves.publicKey });
  }
  if (peticion.method === "POST" && ruta === "/api/suscribir") {
    const suscripcion = await leerCuerpo(peticion);
    if (!suscripcion.endpoint || !suscripcion.keys?.p256dh || !suscripcion.keys?.auth) {
      return responder(respuesta, 400, { error: "suscripción incompleta" });
    }
    datos.suscripciones = datos.suscripciones
      .filter((elemento) => elemento.endpoint !== suscripcion.endpoint)
      .concat(suscripcion);
    guardarDatos(datos);
    return responder(respuesta, 201, { ok: true, total: datos.suscripciones.length });
  }
  if (peticion.method === "POST" && ruta === "/api/desuscribir") {
    const { endpoint } = await leerCuerpo(peticion);
    datos.suscripciones = datos.suscripciones.filter((elemento) => elemento.endpoint !== endpoint);
    guardarDatos(datos);
    return responder(respuesta, 200, { ok: true, total: datos.suscripciones.length });
  }
  if (peticion.method === "POST" && ruta === "/api/enviar-prueba") {
    const cuerpo = await leerCuerpo(peticion);
    const mensaje = JSON.stringify({
      titulo: cuerpo.titulo ?? "Gestor de Tareas",
      cuerpo: cuerpo.cuerpo ?? "Mensaje de prueba desde el servidor",
      url: cuerpo.url ?? "/index.html",
    });
    const resultado = { enviados: 0, fallidos: 0, eliminadas: 0 };
    for (const suscripcion of [...datos.suscripciones]) {
      try {
        await webpush.sendNotification(suscripcion, mensaje, { TTL: 60 });
        resultado.enviados += 1;
      } catch (error) {
        resultado.fallidos += 1;
        if (error.statusCode === 404 || error.statusCode === 410) {
          datos.suscripciones = datos.suscripciones.filter((elemento) => elemento.endpoint !== suscripcion.endpoint);
          resultado.eliminadas += 1;
        }
      }
    }
    guardarDatos(datos);
    return responder(respuesta, 200, resultado);
  }
  return responder(respuesta, 404, { error: "ruta de API desconocida" });
}

http.createServer(async (peticion, respuesta) => {
  try {
    const ruta = decodeURIComponent(new URL(peticion.url, "http://localhost").pathname);
    if (peticion.method === "OPTIONS") {
      respuesta.writeHead(204, {
        "Access-Control-Allow-Origin": ORIGEN_PERMITIDO,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      });
      return respuesta.end();
    }
    if (peticion.method === "GET" && ruta === "/health") {
      return responder(respuesta, 200, { ok: true });
    }
    if (ruta.startsWith("/api/")) return await atenderApi(peticion, respuesta, ruta);
    const archivo = path.normalize(path.join(RAIZ, ruta === "/" ? "index.html" : ruta));
    if (!archivo.startsWith(`${RAIZ}${path.sep}`) || archivo.startsWith(`${__dirname}${path.sep}`)) {
      respuesta.writeHead(403);
      return respuesta.end("Prohibido");
    }
    fs.readFile(archivo, (error, contenido) => {
      if (error) {
        respuesta.writeHead(404);
        return respuesta.end("No encontrado");
      }
      const cabeceras = { "Content-Type": TIPOS[path.extname(archivo)] ?? "application/octet-stream" };
      if (path.basename(archivo) === "sw.js") cabeceras["Cache-Control"] = "no-cache";
      respuesta.writeHead(200, cabeceras);
      respuesta.end(contenido);
    });
  } catch (error) {
    responder(respuesta, 500, { error: String(error.message ?? error) });
  }
}).listen(PUERTO, () => console.log(`Gestor de Tareas en http://localhost:${PUERTO}`));
