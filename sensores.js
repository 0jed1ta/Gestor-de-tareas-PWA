export async function pedirPermisoSensores() {
  if (!("DeviceMotionEvent" in window)) {
    return "no-soportado";
  }

  if (typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      return await DeviceMotionEvent.requestPermission();
    } catch {
      return "denied";
    }
  }

  return "no-necesario";
}

export function hayLecturasReales(timeoutMs = 1000) {
  return new Promise((resolve) => {
    let temporizador;

    const limpiar = () => {
      window.removeEventListener("devicemotion", recibirLectura);
      clearTimeout(temporizador);
    };

    const recibirLectura = (evento) => {
      const aceleracion = evento.accelerationIncludingGravity;
      if (aceleracion && aceleracion.x !== null) {
        limpiar();
        resolve(true);
      }
    };

    temporizador = setTimeout(() => {
      limpiar();
      resolve(false);
    }, timeoutMs);

    window.addEventListener("devicemotion", recibirLectura);
  });
}

export function escucharOrientacion(callback, intervaloMs = 100) {
  let ultimaLectura = 0;

  const recibirOrientacion = (evento) => {
    const ahora = performance.now();
    if (ahora - ultimaLectura < intervaloMs || evento.beta === null) {
      return;
    }

    ultimaLectura = ahora;
    callback({
      alfa: evento.alpha,
      beta: evento.beta,
      gamma: evento.gamma,
    });
  };

  window.addEventListener("deviceorientation", recibirOrientacion);
  return () => window.removeEventListener("deviceorientation", recibirOrientacion);
}

export function detectarSacudida(
  onSacudida,
  { umbral = 12, enfriamientoMs = 1000 } = {}
) {
  const gravedad = 9.81;
  let ultimaSacudida = 0;

  const recibirMovimiento = (evento) => {
    const aceleracion = evento.accelerationIncludingGravity;
    if (!aceleracion || aceleracion.x === null) {
      return;
    }

    const magnitud = Math.hypot(
      aceleracion.x,
      aceleracion.y,
      aceleracion.z
    );
    const desviacion = Math.abs(magnitud - gravedad);
    const ahora = performance.now();

    if (
      desviacion > umbral &&
      ahora - ultimaSacudida > enfriamientoMs
    ) {
      ultimaSacudida = ahora;
      onSacudida(Math.round(desviacion * 10) / 10);
    }
  };

  window.addEventListener("devicemotion", recibirMovimiento);
  return () => window.removeEventListener("devicemotion", recibirMovimiento);
}
