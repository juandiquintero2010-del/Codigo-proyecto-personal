import { supabase } from "./supabaseClient.js";

const CLAVE_RUTA_ACTIVA = "mechatricks_active_path_id";

// Estado global de la sesión
export let estadoAutenticacion = {
  usuario: null,
  sesion: null,
  cargando: true,
  rutas: [],
  rutaAprendizajeActiva: null,
};

let oyentes = new Set();

function notificar() {
  oyentes.forEach((fn) => fn(estadoAutenticacion));
}

export function alCambiarEstadoAutenticacion(oyente) {
  oyentes.add(oyente);
  oyente(estadoAutenticacion);
  return () => oyentes.delete(oyente);
}

export async function cargarRutas(userId) {
  let { data } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  let lista = data ?? [];
  estadoAutenticacion.rutas = lista;

  // recargo la última ruta que estaba viendo o la primera de la lista
  let guardada = localStorage.getItem(CLAVE_RUTA_ACTIVA);
  let encontrada = lista.find((r) => r.id === guardada) ?? lista[0] ?? null;
  estadoAutenticacion.rutaAprendizajeActiva = encontrada;

  if (encontrada) {
    localStorage.setItem(CLAVE_RUTA_ACTIVA, encontrada.id);
  }
  notificar();
}

export function establecerRutaAprendizajeActiva(ruta) {
  estadoAutenticacion.rutaAprendizajeActiva = ruta;
  if (ruta) {
    localStorage.setItem(CLAVE_RUTA_ACTIVA, ruta.id);
  } else {
    localStorage.removeItem(CLAVE_RUTA_ACTIVA);
  }
  notificar();
}

export async function actualizarRutas() {
  if (estadoAutenticacion.usuario) {
    await cargarRutas(estadoAutenticacion.usuario.id);
  }
}

export async function eliminarRuta(id) {
  await supabase.from("learning_paths").delete().eq("id", id);
  if (estadoAutenticacion.rutaAprendizajeActiva?.id === id) {
    establecerRutaAprendizajeActiva(null);
  }
  if (estadoAutenticacion.usuario) {
    await cargarRutas(estadoAutenticacion.usuario.id);
  }
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
  establecerRutaAprendizajeActiva(null);
}

let inicializado = false;

export function inicializarAutenticacion() {
  if (inicializado) return Promise.resolve(estadoAutenticacion);
  inicializado = true;

  // listener de Supabase para cuando inicia o cierra sesión
  supabase.auth.onAuthStateChange((_evento, sesion) => {
    estadoAutenticacion.sesion = sesion;
    estadoAutenticacion.usuario = sesion?.user ?? null;
    if (sesion?.user) {
      cargarRutas(sesion.user.id);
    } else {
      estadoAutenticacion.rutas = [];
      estadoAutenticacion.rutaAprendizajeActiva = null;
      notificar();
    }
  });

  return supabase.auth.getSession().then(async ({ data: { session: sesion } }) => {
    estadoAutenticacion.sesion = sesion;
    estadoAutenticacion.usuario = sesion?.user ?? null;
    if (sesion?.user) {
      await cargarRutas(sesion.user.id);
    }
    estadoAutenticacion.cargando = false;
    notificar();
    return estadoAutenticacion;
  });
}

// para proteger las páginas que requieren login
export async function requerirAutenticacion() {
  await inicializarAutenticacion();
  if (!estadoAutenticacion.usuario) {
    window.location.href = "auth.html";
    return false;
  }
  return true;
}

