const ETIQUETA_SYNC = "sync-tareas";

export function encolarCambio(db, tipo, datos) {
  const cambio = {
    idCambio: crypto.randomUUID(),
    tipo,
    datos,
    creadoEn: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const transaccion = db.transaction("outbox", "readwrite");
    transaccion.objectStore("outbox").add(cambio);
    transaccion.oncomplete = () => resolve(cambio.idCambio);
    transaccion.onerror = () => reject(transaccion.error);
  });
}

export function contarPendientes(db) {
  return new Promise((resolve, reject) => {
    const peticion = db.transaction("outbox").objectStore("outbox").count();
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
}

export function haySyncEnSegundoPlano() {
  return "serviceWorker" in navigator && "SyncManager" in window;
}

export async function pedirSincronizacion(db) {
  if (haySyncEnSegundoPlano()) {
    try {
      const registro = await navigator.serviceWorker.ready;
      await registro.sync.register(ETIQUETA_SYNC);
      return "segundo-plano";
    } catch {
      return vaciarDesdeLaPagina(db);
    }
  }
  await vaciarDesdeLaPagina(db);
  return "desde-la-pagina";
}

export async function vaciarDesdeLaPagina(db) {
  const pendientes = await new Promise((resolve, reject) => {
    const peticion = db.transaction("outbox").objectStore("outbox").getAll();
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
  let enviados = 0;
  for (const cambio of pendientes) {
    const respuesta = await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambio),
    });
    if (!respuesta.ok) {
      throw new Error(`El servidor respondió ${respuesta.status}`);
    }
    await new Promise((resolve, reject) => {
      const transaccion = db.transaction("outbox", "readwrite");
      transaccion.objectStore("outbox").delete(cambio.idCambio);
      transaccion.oncomplete = resolve;
      transaccion.onerror = () => reject(transaccion.error);
    });
    enviados += 1;
  }
  return enviados;
}
