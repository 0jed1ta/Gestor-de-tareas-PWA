export async function estadoPermiso(nombre) {
  try {
    const resultado = await navigator.permissions.query({ name: nombre });
    return resultado.state;
  } catch {
    return "desconocido";
  }
}

export function abrirCamara(facingMode = "environment") {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new TypeError("getUserMedia no disponible"));
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });
}

export function abrirMicrofono() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new TypeError("getUserMedia no disponible"));
  }

  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: false,
  });
}

export function crearMedidorDeNivel(stream) {
  const contexto = new AudioContext();
  contexto.resume();
  const analizador = contexto.createAnalyser();
  analizador.fftSize = 512;
  contexto.createMediaStreamSource(stream).connect(analizador);
  const datos = new Uint8Array(analizador.fftSize);

  return {
    leer() {
      analizador.getByteTimeDomainData(datos);
      let pico = 0;
      for (const valor of datos) {
        pico = Math.max(pico, Math.abs(valor - 128));
      }
      return pico / 128;
    },
    cerrar() {
      stream.getTracks().forEach((pista) => pista.stop());
      contexto.close();
    },
  };
}

export function detenerCamara(stream) {
  stream?.getTracks().forEach((pista) => pista.stop());
}

export function capturarFoto(video, anchoMax = 640) {
  const escala = Math.min(1, anchoMax / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * escala);
  canvas.height = Math.round(video.videoHeight * escala);
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
}

export function describirErrorCamara(error) {
  switch (error?.name) {
    case "NotAllowedError":
      return "Bloqueaste el permiso de cámara. Habilítalo desde el candado de la barra de direcciones.";
    case "NotFoundError":
      return "Este dispositivo no tiene cámara disponible.";
    case "NotReadableError":
      return "La cámara está siendo usada por otra aplicación.";
    case "OverconstrainedError":
      return "La cámara no admite la configuración solicitada.";
    case "TypeError":
      return "La cámara solo funciona mediante HTTPS o localhost.";
    case "SecurityError":
      return "El navegador deshabilitó la cámara para esta página.";
    default:
      return `No se pudo abrir la cámara (${error?.name ?? "error desconocido"}).`;
  }
}

export function obtenerUbicacion({ altaPrecision = false, timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject({ code: 0 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) =>
        resolve({
          lat: posicion.coords.latitude,
          lon: posicion.coords.longitude,
          precision: Math.round(posicion.coords.accuracy),
          momento: new Date(posicion.timestamp).toISOString(),
        }),
      reject,
      {
        enableHighAccuracy: altaPrecision,
        timeout: timeoutMs,
        maximumAge: 60000,
      }
    );
  });
}

export function describirErrorUbicacion(error) {
  switch (error?.code) {
    case 1:
      return "El permiso de ubicación fue denegado. La tarea seguirá funcionando sin este dato.";
    case 2:
      return "No se pudo determinar la ubicación actual.";
    case 3:
      return "La ubicación tardó demasiado en responder. Intenta nuevamente.";
    default:
      return "La ubicación no está disponible en este navegador.";
  }
}
