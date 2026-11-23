import { crearTarea, renderizarTarea } from "./tareas.js";
import {
  abrirBaseDeDatos,
  agregarTarea,
  actualizarTarea,
  eliminarTareaDB,
  obtenerTodasLasTareas,
} from "./db.js";
import {
  derivarClaveDesdeContrasena,
  cifrarTexto,
  descifrarTexto,
  obtenerOCrearSal,
} from "./crypto.js";
import {
  abrirCamara,
  detenerCamara,
  capturarFoto,
  describirErrorCamara,
  obtenerUbicacion,
  describirErrorUbicacion,
} from "./dispositivo.js";
import {
  pedirPermisoSensores,
  hayLecturasReales,
  escucharOrientacion,
  detectarSacudida,
} from "./sensores.js";
import {
  estadoNotificaciones,
  pedirPermisoNotificaciones,
  mostrarAvisoLocal,
  suscribirAPush,
  suscripcionActual,
  cancelarSuscripcion,
  describirErrorPush,
} from "./notificaciones.js";
import { API_URL } from "./api-config.js";

let db;
let tareas = [];
let claveSesion = null;

const listaEl = document.getElementById("lista-tareas");
const formEl = document.getElementById("form-tarea");
const inputTituloEl = document.getElementById("input-titulo");
const inputPrioridadEl = document.getElementById("input-prioridad");
const mensajeDispositivoEl = document.getElementById("mensaje-dispositivo");
const dialogoCamaraEl = document.getElementById("dlg-camara");
const videoCamaraEl = document.getElementById("video-camara");
const btnSensoresEl = document.getElementById("btn-sensores");
const btnDeshacerEl = document.getElementById("btn-deshacer");
const lecturaSensoresEl = document.getElementById("lectura-sensores");
const btnAvisosEl = document.getElementById("btn-avisos");
const btnPushEl = document.getElementById("btn-push");
const btnPushPruebaEl = document.getElementById("btn-push-prueba");
const estadoAvisosEl = document.getElementById("estado-avisos");
let streamCamara = null;
let tareaDeFoto = null;
let ultimaEliminada = null;
let detenerSacudida = null;
let detenerOrientacion = null;

function mostrarMensajeDispositivo(texto, tipo = "informacion") {
  mensajeDispositivoEl.textContent = texto;
  mensajeDispositivoEl.dataset.tipo = tipo;
  mensajeDispositivoEl.hidden = !texto;
}

const pintarTodo = () => {
  listaEl
    .querySelectorAll("img.miniatura")
    .forEach((imagen) => URL.revokeObjectURL(imagen.src));
  listaEl.innerHTML = "";
  tareas.forEach((tarea) =>
    renderizarTarea(tarea, listaEl, {
      onToggle: alternarCompletada,
      onEliminar: eliminarTarea,
      onGuardarNota: guardarNotaPrivada,
      onVerNota: verNotaPrivada,
      onFoto: abrirDialogoCamara,
      onUbicacion: adjuntarUbicacion,
    })
  );
};

async function abrirDialogoCamara(id) {
  mostrarMensajeDispositivo("");
  tareaDeFoto = id;

  try {
    streamCamara = await abrirCamara();
    videoCamaraEl.srcObject = streamCamara;
    dialogoCamaraEl.showModal();
  } catch (error) {
    mostrarMensajeDispositivo(describirErrorCamara(error), "error");
  }
}

function cerrarDialogoCamara() {
  detenerCamara(streamCamara);
  streamCamara = null;
  videoCamaraEl.srcObject = null;
  if (dialogoCamaraEl.open) {
    dialogoCamaraEl.close();
  }
}

async function guardarFotoCapturada() {
  const foto = await capturarFoto(videoCamaraEl);
  const tarea = tareas.find((elemento) => elemento.id === tareaDeFoto);
  cerrarDialogoCamara();

  if (!foto || !tarea) {
    return;
  }

  tarea.foto = foto;
  await actualizarTarea(db, tarea);
  mostrarMensajeDispositivo("La foto quedó guardada únicamente en este dispositivo.");
  pintarTodo();
}

async function adjuntarUbicacion(id) {
  mostrarMensajeDispositivo("Obteniendo ubicación...");

  try {
    const ubicacion = await obtenerUbicacion();
    const tarea = tareas.find((elemento) => elemento.id === id);
    tarea.ubicacion = ubicacion;
    await actualizarTarea(db, tarea);
    mostrarMensajeDispositivo("Ubicación guardada únicamente en este dispositivo.");
    pintarTodo();
  } catch (error) {
    mostrarMensajeDispositivo(describirErrorUbicacion(error), "error");
  }
}

document
  .getElementById("btn-capturar")
  .addEventListener("click", guardarFotoCapturada);
document
  .getElementById("btn-cancelar-camara")
  .addEventListener("click", cerrarDialogoCamara);
dialogoCamaraEl.addEventListener("close", () => {
  if (streamCamara) {
    cerrarDialogoCamara();
  }
});

async function obtenerClaveSesion() {
  if (claveSesion) {
    return claveSesion;
  }

  const contrasena = window.prompt(
    "Escribe la contraseña de tus notas privadas. No se guardará en el navegador."
  );
  if (!contrasena) {
    return null;
  }

  claveSesion = await derivarClaveDesdeContrasena(
    contrasena,
    obtenerOCrearSal()
  );
  return claveSesion;
}

async function guardarNotaPrivada(id, textoPlano) {
  if (!textoPlano.trim()) {
    return;
  }

  const clave = await obtenerClaveSesion();
  if (!clave) {
    return;
  }

  const { cifrado, iv } = await cifrarTexto(clave, textoPlano);
  const tarea = tareas.find((elemento) => elemento.id === id);
  tarea.notaCifrada = cifrado;
  tarea.notaIv = iv;
  await actualizarTarea(db, tarea);
  pintarTodo();
}

async function verNotaPrivada(id) {
  const tarea = tareas.find((elemento) => elemento.id === id);
  if (!tarea.notaCifrada) {
    return;
  }

  const clave = await obtenerClaveSesion();
  if (!clave) {
    return;
  }

  try {
    const texto = await descifrarTexto(clave, {
      cifrado: tarea.notaCifrada,
      iv: tarea.notaIv,
    });
    window.alert(`Nota privada de "${tarea.titulo}":\n\n${texto}`);
  } catch {
    claveSesion = null;
    window.alert("No se pudo descifrar la nota. Verifica la contraseña.");
  }
}

async function alternarCompletada(id) {
  const tarea = tareas.find((elemento) => elemento.id === id);
  tarea.completada = !tarea.completada;
  await actualizarTarea(db, tarea);
  pintarTodo();
}

async function deshacerEliminacion() {
  if (!ultimaEliminada) {
    return;
  }

  const { id, ...tareaRestaurada } = ultimaEliminada;
  const nuevoId = await agregarTarea(db, tareaRestaurada);
  tareas.push({ ...tareaRestaurada, id: nuevoId });
  mostrarMensajeDispositivo(`Se restauró “${tareaRestaurada.titulo}”.`);
  ultimaEliminada = null;
  btnDeshacerEl.disabled = true;
  pintarTodo();
}

function apagarSensores() {
  detenerSacudida?.();
  detenerOrientacion?.();
  detenerSacudida = null;
  detenerOrientacion = null;
  lecturaSensoresEl.textContent = "";
  btnSensoresEl.textContent = "Activar agitar para deshacer";
  btnSensoresEl.dataset.activo = "false";
}

async function alternarSensores() {
  if (detenerSacudida) {
    apagarSensores();
    mostrarMensajeDispositivo("Los sensores quedaron desactivados.");
    return;
  }

  const permiso = await pedirPermisoSensores();
  if (permiso === "denied") {
    mostrarMensajeDispositivo(
      "El acceso a los sensores fue denegado. Puedes usar el botón Deshacer eliminación.",
      "error"
    );
    return;
  }

  mostrarMensajeDispositivo("Comprobando sensores de movimiento...");
  const haySensores = permiso !== "no-soportado" && (await hayLecturasReales());
  if (!haySensores) {
    mostrarMensajeDispositivo(
      "Este dispositivo no tiene sensores de movimiento. Usa el botón Deshacer eliminación."
    );
    return;
  }

  detenerSacudida = detectarSacudida(() => deshacerEliminacion());
  detenerOrientacion = escucharOrientacion(({ beta, gamma }) => {
    lecturaSensoresEl.textContent = `Inclinación β ${Math.round(beta)}° · γ ${Math.round(gamma)}°`;
  });
  btnSensoresEl.textContent = "Agitar para deshacer: activo";
  btnSensoresEl.dataset.activo = "true";
  mostrarMensajeDispositivo("Sensores activos. Agita el dispositivo para restaurar la última tarea eliminada.");
}

btnDeshacerEl.addEventListener("click", deshacerEliminacion);
btnSensoresEl.addEventListener("click", alternarSensores);

async function eliminarTarea(id) {
  ultimaEliminada = tareas.find((elemento) => elemento.id === id) ?? null;
  btnDeshacerEl.disabled = !ultimaEliminada;
  await eliminarTareaDB(db, id);
  tareas = tareas.filter((elemento) => elemento.id !== id);
  pintarTodo();
}

formEl.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const titulo = inputTituloEl.value.trim();
  if (!titulo) {
    return;
  }

  try {
    const tareaNueva = crearTarea(titulo, inputPrioridadEl.value);
    tareaNueva.id = await agregarTarea(db, tareaNueva);
    tareas.push(tareaNueva);
    pintarTodo();
    formEl.reset();
  } catch (error) {
    console.error("No se pudo guardar la tarea:", error);
    mostrarMensajeDispositivo("No se pudo guardar la tarea en este dispositivo.", "error");
  }
});

async function iniciar() {
  db = await abrirBaseDeDatos();
  tareas = await obtenerTodasLasTareas(db);
  if (tareas.length === 0) {
    const tareaInicial = crearTarea("Aprender el Bloque 3: PWA", "alta");
    tareaInicial.id = await agregarTarea(db, tareaInicial);
    tareas = [tareaInicial];
  }
  pintarTodo();
  await actualizarControlesAvisos();
}

iniciar().catch((error) =>
  console.error("No se pudo iniciar el almacenamiento de tareas:", error)
);

const estadoConexionEl = document.getElementById("estado-conexion");
const btnInstalarEl = document.getElementById("btn-instalar");
let eventoInstalacion = null;

function actualizarEstadoConexion() {
  const enLinea = navigator.onLine;
  estadoConexionEl.textContent = enLinea
    ? "En línea"
    : "Sin conexión · datos guardados en el dispositivo";
  estadoConexionEl.className = enLinea
    ? "estado estado--en-linea"
    : "estado estado--sin-conexion";
}

window.addEventListener("online", actualizarEstadoConexion);
window.addEventListener("offline", actualizarEstadoConexion);
actualizarEstadoConexion();

window.addEventListener("beforeinstallprompt", (evento) => {
  evento.preventDefault();
  eventoInstalacion = evento;
  btnInstalarEl.hidden = false;
});

btnInstalarEl.addEventListener("click", async () => {
  if (!eventoInstalacion) {
    return;
  }

  eventoInstalacion.prompt();
  await eventoInstalacion.userChoice;
  eventoInstalacion = null;
  btnInstalarEl.hidden = true;
});

window.addEventListener("appinstalled", () => {
  eventoInstalacion = null;
  btnInstalarEl.hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(new URL("sw.js", import.meta.url))
    .then((registro) => console.log("Service Worker registrado:", registro.scope))
    .catch((error) => console.error("No se pudo registrar el Service Worker:", error));
}

async function actualizarControlesAvisos() {
  const permiso = estadoNotificaciones();
  if (permiso === "no-soportado") {
    estadoAvisosEl.textContent = "Avisos no disponibles";
    btnAvisosEl.disabled = true;
    btnPushEl.disabled = true;
    return;
  }
  const suscripcion = permiso === "granted" ? await suscripcionActual().catch(() => null) : null;
  estadoAvisosEl.textContent = permiso === "granted" ? "Avisos permitidos" : permiso === "denied" ? "Avisos bloqueados" : "Avisos desactivados";
  btnAvisosEl.disabled = permiso === "denied";
  btnAvisosEl.textContent = permiso === "granted" ? "Mostrar aviso local" : "Activar avisos";
  btnPushEl.disabled = permiso !== "granted";
  btnPushEl.textContent = suscripcion ? "Desactivar mensajes push" : "Activar mensajes push";
  btnPushPruebaEl.disabled = !suscripcion;
}

btnAvisosEl.addEventListener("click", async () => {
  let permiso = estadoNotificaciones();
  if (permiso === "default") permiso = await pedirPermisoNotificaciones();
  if (permiso === "granted") {
    await mostrarAvisoLocal("Avisos activados", "El gestor puede recordarte tus tareas pendientes.");
  }
  await actualizarControlesAvisos();
});

btnPushEl.addEventListener("click", async () => {
  try {
    const actual = await suscripcionActual();
    if (actual) {
      await cancelarSuscripcion();
      mostrarMensajeDispositivo("Los mensajes push quedaron desactivados.");
    } else {
      await suscribirAPush();
      mostrarMensajeDispositivo("Los mensajes push quedaron activados.");
    }
  } catch (error) {
    mostrarMensajeDispositivo(describirErrorPush(error), "error");
  }
  await actualizarControlesAvisos();
});

btnPushPruebaEl.addEventListener("click", async () => {
  try {
    const respuesta = await fetch(`${API_URL}/api/enviar-prueba`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: "Gestor de Tareas",
        cuerpo: "Este mensaje llegó desde el servidor.",
        url: "/index.html",
      }),
    });
    if (!respuesta.ok) throw new Error(`El servidor respondió ${respuesta.status}`);
    mostrarMensajeDispositivo("El mensaje de prueba fue enviado.");
  } catch (error) {
    mostrarMensajeDispositivo(`No se pudo enviar el mensaje de prueba: ${error.message}`, "error");
  }
});
