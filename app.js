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

let db;
let tareas = [];
let claveSesion = null;

const listaEl = document.getElementById("lista-tareas");
const formEl = document.getElementById("form-tarea");
const inputTituloEl = document.getElementById("input-titulo");
const inputPrioridadEl = document.getElementById("input-prioridad");

const pintarTodo = () => {
  listaEl.innerHTML = "";
  tareas.forEach((tarea) =>
    renderizarTarea(tarea, listaEl, {
      onToggle: alternarCompletada,
      onEliminar: eliminarTarea,
      onGuardarNota: guardarNotaPrivada,
      onVerNota: verNotaPrivada,
    })
  );
};

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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then((registro) => console.log("Service Worker registrado:", registro.scope))
    .catch((error) => console.error("No se pudo registrar el Service Worker:", error));
}
