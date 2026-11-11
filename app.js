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
let streamCamara = null;
let tareaDeFoto = null;

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

async function eliminarTarea(id) {
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

  const tareaNueva = crearTarea(titulo, inputPrioridadEl.value);
  const id = await agregarTarea(db, tareaNueva);
  tareaNueva.id = id;
  tareas.push(tareaNueva);
  pintarTodo();
  formEl.reset();
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
    .register("/sw.js")
    .then((registro) => console.log("Service Worker registrado:", registro.scope))
    .catch((error) => console.error("No se pudo registrar el Service Worker:", error));
}
