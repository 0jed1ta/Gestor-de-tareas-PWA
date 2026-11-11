export const crearTarea = (titulo, prioridad = "media") => ({
  titulo,
  prioridad,
  completada: false,
  fechaCreacion: new Date().toISOString(),
  notaCifrada: null,
  notaIv: null,
  foto: null,
  ubicacion: null,
});

export const renderizarTarea = (
  tarea,
  contenedor,
  { onToggle, onEliminar, onGuardarNota, onVerNota, onFoto, onUbicacion }
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

  const adjuntosFila = document.createElement("div");
  adjuntosFila.className = "adjuntos-fila";

  const btnFoto = document.createElement("button");
  btnFoto.type = "button";
  btnFoto.textContent = tarea.foto ? "Cambiar foto" : "Adjuntar foto";
  btnFoto.className = "btn-adjunto";
  btnFoto.addEventListener("click", () => onFoto(tarea.id));

  const btnUbicacion = document.createElement("button");
  btnUbicacion.type = "button";
  btnUbicacion.textContent = tarea.ubicacion
    ? "Actualizar ubicación"
    : "Añadir ubicación";
  btnUbicacion.className = "btn-adjunto";
  btnUbicacion.addEventListener("click", () => onUbicacion(tarea.id));

  adjuntosFila.append(btnFoto, btnUbicacion);

  if (tarea.foto) {
    const miniatura = document.createElement("img");
    miniatura.className = "miniatura";
    miniatura.alt = `Foto adjunta a ${tarea.titulo}`;
    miniatura.src = URL.createObjectURL(tarea.foto);
    adjuntosFila.append(miniatura);
  }

  if (tarea.ubicacion) {
    const ubicacion = document.createElement("span");
    ubicacion.className = "dato-ubicacion";
    ubicacion.textContent = `${tarea.ubicacion.lat.toFixed(4)}, ${tarea.ubicacion.lon.toFixed(4)} · ±${tarea.ubicacion.precision} m`;
    adjuntosFila.append(ubicacion);
  }

  li.append(fila, notaFila, adjuntosFila);
  contenedor.append(li);
};
