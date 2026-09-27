// Importa el diseño comun y la lógica de autenticación, además del cliente de Supabase.
import { inicializarDiseno } from "../layout.js";
import { inicializarAutenticacion, estadoAutenticacion, alCambiarEstadoAutenticacion } from "../auth.js";
import { supabase } from "../supabaseClient.js";

// Aplica el diseño base para la pantalla de autenticación.
inicializarDiseno("auth.html");

// Estado para controlar la pestaña activa y si el formulario está procesando una petición.
let pestanaActiva = "signin";
let cargando = false;

// Selecciona los elementos del formulario para poder manipular su estado y validación.
let pestanaIniciarSesion = document.getElementById("pestaña-iniciar-sesion");
let pestanaRegistrarse = document.getElementById("pestaña-registrarse");
let grupoNombre = document.getElementById("grupo-nombre");
let entradaNombre = document.getElementById("entrada-nombre");
let entradaCorreo = document.getElementById("entrada-correo");
let entradaContrasena = document.getElementById("entrada-contraseña");
let elementoError = document.getElementById("error-formulario");
let botonEnviar = document.getElementById("boton-enviar");
let formulario = document.getElementById("formulario-autenticacion");

// Actualiza la UI del formulario según la pestaña activa y si hay una operación en curso.
function renderPestanas() {
  pestanaIniciarSesion.className = `pestaña ${pestanaActiva === "signin" ? "activa" : ""}`;
  pestanaRegistrarse.className = `pestaña ${pestanaActiva === "signup" ? "activa" : ""}`;
  grupoNombre.style.display = pestanaActiva === "signup" ? "" : "none";
  entradaNombre.required = pestanaActiva === "signup";
  botonEnviar.textContent = cargando ? "Procesando..." : pestanaActiva === "signin" ? "Iniciar sesión" : "Crear cuenta";
  botonEnviar.disabled = cargando;
}

// Cambia al modo de inicio de sesión y limpia el error visible.
pestanaIniciarSesion.addEventListener("click", () => {
  pestanaActiva = "signin";
  elementoError.style.display = "none";
  renderPestanas();
});

// Cambia al modo de registro y limpia el mensaje de error.
pestanaRegistrarse.addEventListener("click", () => {
  pestanaActiva = "signup";
  elementoError.style.display = "none";
  renderPestanas();
});

// Traduce errores comunes de Supabase a mensajes más claros para el usuario.
function traducirError(mensaje) {
  if (/already registered|already exists/i.test(mensaje)) return "Este correo ya está registrado.";
  if (/invalid login|invalid credentials/i.test(mensaje)) return "Correo o contraseña incorrectos.";
  if (/password.*6|at least 6/i.test(mensaje)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/email/i.test(mensaje) && /valid/i.test(mensaje)) return "Correo electrónico inválido.";
  return mensaje;
}

// Maneja el envío del formulario para iniciar sesión o crear una cuenta.
formulario.addEventListener("submit", async (e) => {
  e.preventDefault();
  elementoError.style.display = "none";
  cargando = true;
  renderPestanas();

  try {
    if (pestanaActiva === "signup") {
      // Registro con Supabase: crea usuario, guarda nombre y redirige al módulo principal.
      let { error } = await supabase.auth.signUp({
        email: entradaCorreo.value,
        password: entradaContrasena.value,
        options: {
          emailRedirectTo: new URL("modulos.html", window.location.href).toString(),
          data: { name: entradaNombre.value },
        },
      });
      if (error) throw error;
    } else {
      // Inicio de sesión con correo y contraseña.
      let { error } = await supabase.auth.signInWithPassword({
        email: entradaCorreo.value,
        password: entradaContrasena.value,
      });
      if (error) throw error;
    }
    window.location.href = "modulos.html";
  } catch (err) {
    elementoError.textContent = traducirError(err?.message ?? "Error desconocido");
    elementoError.style.display = "";
  } finally {
    cargando = false;
    renderPestanas();
  }
});

// Render inicial del formulario.
renderPestanas();

// Inicializa la vigilancia del estado de autenticación para redirigir si el usuario ya volvió.
inicializarAutenticacion();
alCambiarEstadoAutenticacion((estado) => {
  // Si ya está autenticado, se envía directo a los módulos.
  if (!estado.cargando && estado.usuario) {
    window.location.href = "modulos.html";
  }
});

