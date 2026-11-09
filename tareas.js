const CLAVE_ALMACENAMIENTO = "electiva-pwa-tareas";

export const crearTarea = (titulo, prioridad = "media") => ({
  id: crypto.randomUUID(),
  titulo,
  prioridad,
  completada: false,
  fechaCreacion: new Date().toISOString(),
});

export const renderizarTarea = (tarea, contenedor, { onToggle, onEliminar }) => {
  const li = document.createElement("li");
  li.className = `tarea tarea--${tarea.prioridad}` + (tarea.completada ? " tarea--completada" : "");
  li.dataset.id = tarea.id;

  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = tarea.completada;
  check.addEventListener("change", () => onToggle(tarea.id));

  const texto = document.createElement("span");
  texto.textContent = tarea.titulo;

  const borrar = document.createElement("button");
  borrar.textContent = "Eliminar";
  borrar.className = "btn-eliminar";
  borrar.addEventListener("click", () => onEliminar(tarea.id));

  li.append(check, texto, borrar);
  contenedor.append(li);
};

export const cargarTareas = () =>
  new Promise((resolve) => {
    setTimeout(() => {
      const guardadas = localStorage.getItem(CLAVE_ALMACENAMIENTO);
      resolve(guardadas ? JSON.parse(guardadas) : []);
    }, 150);
  });

export const guardarTareas = (tareas) => {
  localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(tareas));
};
