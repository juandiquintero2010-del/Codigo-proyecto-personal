// Importa las funciones necesarias para proteger la página y cargar el estado de autenticación.
import { montarPaginaProtegida } from "../protected-page.js";
import { estadoAutenticacion } from "../auth.js";
import { montarWidgetChat } from "../chat-widget.js";

// Obtiene el contenedor principal de la página protegida.
// Si no existe, redirige a la autenticación para evitar mostrar contenido sin sesión.
let principal = await montarPaginaProtegida(null);
if (!principal) throw new Error("redirecting to auth");

// Lee la ruta de aprendizaje activa desde el estado global del usuario.
// Esta información sirve para personalizar el asistente con el contenido correcto.
let rutaActiva = estadoAutenticacion.rutaAprendizajeActiva;

// Si el usuario no tiene una ruta activa, muestra un mensaje invitándolo a completar el diagnóstico.
if (!rutaActiva) {
  principal.innerHTML = `
    <section class="seccion">
      <p class="meta-pagina">// asistente</p>
      <h1 class="titulo">Sin ruta activa</h1>
      <p class="descripcion-pagina">Completa el diagnóstico para personalizar el chat.</p>
      <a href="diagnostico.html" class="boton boton-principal accion-pagina">Hacer diagnóstico</a>
    </section>
  `;
} else {
  // Si hay una ruta activa, renderiza la interfaz del asistente técnico con el nombre y nivel de la ruta.
  principal.innerHTML = `
    <section class="seccion">
      <p class="meta-pagina">// asistente</p>
      <h1 class="titulo">Asistente técnico</h1>
      <p class="descripcion-pagina">
        ruta: ${rutaActiva.name}${rutaActiva.level ? ` · nivel ${rutaActiva.level}` : ""}
      </p>

      <div id="contenedor-chat"></div>
    </section>
  `;

  // Carga el widget del chat dentro del contenedor creado, usando la ruta actual como contexto de sesión.
  await montarWidgetChat(document.getElementById("contenedor-chat"), {
    idSesionPersonalizado: rutaActiva.id,
    claseExtra: "sesion-chat",
  });
}

