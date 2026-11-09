const NOMBRE_DB = "gestor-tareas-db";
const VERSION_DB = 2;

export function abrirBaseDeDatos() {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(NOMBRE_DB, VERSION_DB);

    peticion.onupgradeneeded = (event) => {
      const db = event.target.result;
      const transaccion = event.target.transaction;
      let store;

      if (event.oldVersion < 1) {
        store = db.createObjectStore("tareas", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("porPrioridad", "prioridad", { unique: false });
      } else {
        store = transaccion.objectStore("tareas");
      }

      if (event.oldVersion < 2) {
        store.createIndex("porTitulo", "titulo", { unique: true });
      }
    };

    peticion.onsuccess = (event) => resolve(event.target.result);
    peticion.onerror = (event) => reject(event.target.error);
  });
}

function ejecutarPeticion(db, modo, operacion) {
  return new Promise((resolve, reject) => {
    const transaccion = db.transaction("tareas", modo);
    const peticion = operacion(transaccion.objectStore("tareas"));
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
    transaccion.onabort = () => reject(transaccion.error);
  });
}

export function agregarTarea(db, tarea) {
  return ejecutarPeticion(db, "readwrite", (store) => store.add(tarea));
}

export function actualizarTarea(db, tarea) {
  return ejecutarPeticion(db, "readwrite", (store) => store.put(tarea));
}

export function obtenerTarea(db, id) {
  return ejecutarPeticion(db, "readonly", (store) => store.get(id));
}

export function eliminarTareaDB(db, id) {
  return ejecutarPeticion(db, "readwrite", (store) => store.delete(id));
}

export function obtenerTodasLasTareas(db) {
  return ejecutarPeticion(db, "readonly", (store) => store.getAll());
}

export function contarTareas(db) {
  return ejecutarPeticion(db, "readonly", (store) => store.count());
}

export function tareasPorPrioridad(db, prioridad) {
  return new Promise((resolve, reject) => {
    const resultado = [];
    const transaccion = db.transaction("tareas", "readonly");
    const indice = transaccion.objectStore("tareas").index("porPrioridad");
    const peticion = indice.openCursor(IDBKeyRange.only(prioridad));

    peticion.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) {
        resolve(resultado);
        return;
      }
      resultado.push(cursor.value);
      cursor.continue();
    };
    peticion.onerror = () => reject(peticion.error);
  });
}

export function completarTareasPorPrioridad(db, prioridad) {
  return new Promise((resolve, reject) => {
    const transaccion = db.transaction("tareas", "readwrite");
    const indice = transaccion.objectStore("tareas").index("porPrioridad");
    const peticion = indice.openCursor(IDBKeyRange.only(prioridad));
    let actualizadas = 0;

    peticion.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) {
        resolve(actualizadas);
        return;
      }
      const tarea = cursor.value;
      tarea.completada = true;
      cursor.update(tarea);
      actualizadas += 1;
      cursor.continue();
    };
    peticion.onerror = () => reject(peticion.error);
  });
}
