const CLAVE_SAL = "gestor-tareas-sal";

export async function derivarClaveDesdeContrasena(contrasena, sal) {
  const materialBase = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(contrasena),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: sal,
      iterations: 100000,
      hash: "SHA-256",
    },
    materialBase,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function cifrarTexto(clave, texto) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const datos = new TextEncoder().encode(texto);
  const cifrado = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    clave,
    datos
  );
  return { cifrado, iv };
}

export async function descifrarTexto(clave, { cifrado, iv }) {
  const datos = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    clave,
    cifrado
  );
  return new TextDecoder().decode(datos);
}

export async function calcularHash(texto) {
  const datos = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function obtenerOCrearSal() {
  const guardada = localStorage.getItem(CLAVE_SAL);
  if (guardada) {
    return Uint8Array.from(atob(guardada), (caracter) =>
      caracter.charCodeAt(0)
    );
  }

  const sal = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(CLAVE_SAL, btoa(String.fromCharCode(...sal)));
  return sal;
}
