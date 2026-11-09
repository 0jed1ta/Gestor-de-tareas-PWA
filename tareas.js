export const crearTarea = (titulo, prioridad = "media") => ({
  titulo,
  prioridad,
  completada: false,
  fechaCreacion: new Date().toISOString(),
  notaCifrada: null,
  notaIv: null,
});

export const renderizarTarea = (
  tarea,
  contenedor,
  { onToggle, onEliminar, onGuardarNota, onVerNota }
) => {
  const li = document.createElement("li");
  li.className = `tarea tarea--${tarea.prioridad}` + (tarea.completada ? " tarea--completada" : "");
  li.dataset.id = tarea.id;

  const fila = document.createElement("div");
  fila.className = "tarea-fila";

  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = tarea.completada;
  check.addEventListener("change", () => onToggle(tarea.id));

  const texto = document.createElement("span");
  texto.textContent = tarea.titulo;

  const borrar = document.createElement("button");
  borrar.textContent = "Eliminar";
  borrar.type = "button";
  borrar.className = "btn-eliminar";
  borrar.addEventListener("click", () => onEliminar(tarea.id));

  fila.append(check, texto, borrar);

  const notaFila = document.createElement("div");
  notaFila.className = "nota-fila";

  const notaInput = document.createElement("input");
  notaInput.type = "text";
  notaInput.placeholder = "Nota privada...";
  notaInput.className = "nota-input";

  const guardarNota = document.createElement("button");
  guardarNota.textContent = "Guardar nota";
  guardarNota.type = "button";
  guardarNota.className = "btn-nota";
  guardarNota.addEventListener("click", () =>
    onGuardarNota(tarea.id, notaInput.value)
  );

  const verNota = document.createElement("button");
  verNota.textContent = "Ver nota";
  verNota.type = "button";
  verNota.className = "btn-nota";
  verNota.disabled = !tarea.notaCifrada;
  verNota.addEventListener("click", () => onVerNota(tarea.id));

  notaFila.append(notaInput, guardarNota, verNota);
  li.append(fila, notaFila);
  contenedor.append(li);
};
