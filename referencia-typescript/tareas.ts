export type Prioridad = "baja" | "media" | "alta";

export interface Tarea {
  id: string;
  titulo: string;
  prioridad: Prioridad;
  completada: boolean;
  fechaCreacion: string;
}

export const crearTarea = (titulo: string, prioridad: Prioridad = "media"): Tarea => ({
  id: crypto.randomUUID(),
  titulo,
  prioridad,
  completada: false,
  fechaCreacion: new Date().toISOString(),
});

export const cargarTareas = (): Promise<Tarea[]> =>
  new Promise((resolve) => {
    const guardadas = localStorage.getItem("electiva-pwa-tareas");
    resolve(guardadas ? (JSON.parse(guardadas) as Tarea[]) : []);
  });

export function iniciar(): void {
  cargarTareas().then((tareas) => console.log(tareas));
}
