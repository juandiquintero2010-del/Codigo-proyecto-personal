import { supabase } from "./supabaseClient.js";
import { estadoAutenticacion } from "./auth.js";

// Webhook de n8n para el bot
const URL_N8N =
  "https://jdql.app.n8n.cloud/webhook/c181524e-a770-4792-92dc-27a88c414ac4/chat";

function obtenerIdSesion() {
  let id = localStorage.getItem("mechatricks_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("mechatricks_session_id", id);
  }
  return id;
}

// conexión con el flujo de n8n
async function enviarAN8N(mensaje, idSesion) {
  let respuesta = await fetch(URL_N8N, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify({
      chatInput: mensaje,
      message: mensaje,
      sessionId: idSesion,
      session_id: idSesion,
    }),
  });

  let textoPlano = await respuesta.text();
  if (!respuesta.ok) {
    throw new Error(`n8n error ${respuesta.status}: ${textoPlano || respuesta.statusText}`);
  }

  let contentType = respuesta.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      let datos = JSON.parse(textoPlano);
      // console.log("n8n response:", datos);
      // probé varios formatos porque n8n a veces cambia la respuesta
      return (
        datos.output ||
        datos.text ||
        datos.response ||
        datos.message ||
        datos?.choices?.[0]?.message?.content ||
        textoPlano ||
        "No se obtuvo respuesta del asistente."
      );
    } catch {
      return textoPlano || "No se obtuvo respuesta del asistente.";
    }
  }

  return textoPlano || "No se obtuvo respuesta del asistente.";
}

function escaparHtml(txt) {
  let temp = document.createElement("div");
  temp.textContent = txt;
  return temp.innerHTML;
}

export async function montarWidgetChat(contenedor, opciones = {}) {
  const { contexto, idSesionPersonalizado, claseExtra } = opciones;
  const usuario = estadoAutenticacion.usuario;
  const rutaActiva = estadoAutenticacion.rutaAprendizajeActiva;
  const idSesion = idSesionPersonalizado || obtenerIdSesion();

  contenedor.className = `panel-chat${claseExtra ? " " + claseExtra : ""}`;
  contenedor.innerHTML = `
    <div class="encabezado-chat">
      <span class="estado-chat">● En línea</span>
    </div>
    <div class="mensajes-chat" id="mensajes-chat"></div>
    <div class="fila-entrada-chat">
      <input class="entrada-chat" id="entrada-chat" placeholder="Escribe tu pregunta..." />
      <button class="boton boton-principal boton-enviar-chat" id="boton-enviar-chat" disabled>Enviar</button>
    </div>
  `;

  let elementoMensajes = contenedor.querySelector("#mensajes-chat");
  let inputMensaje = contenedor.querySelector("#entrada-chat");
  let botonEnviar = contenedor.querySelector("#boton-enviar-chat");

  let mensajes = [];
  let cargando = false;

  // cargo el historial de mensajes de la base de datos si está logueado
  if (usuario && rutaActiva) {
    let { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", usuario.id)
      .eq("learning_path_id", rutaActiva.id)
      .order("created_at", { ascending: true });
    if (data) mensajes = data;
  }

  function renderizar() {
    if (mensajes.length === 0 && !cargando) {
      elementoMensajes.innerHTML = `<p class="chat-vacio">Escribe una pregunta sobre Arduino, sensores, motores...</p>`;
    } else {
      elementoMensajes.innerHTML = mensajes
        .map(
          (m) =>
            `<div class="mensaje-chat ${
              m.role === "user" ? "mensaje-usuario" : "mensaje-asistente"
            }">${escaparHtml(m.content)}</div>`
        )
        .join("");
      if (cargando) {
        elementoMensajes.innerHTML += `
          <div class="escribiendo-chat">
            <span class="punto-escritura"></span>
            <span class="punto-escritura"></span>
            <span class="punto-escritura"></span>
          </div>`;
      }
    }
    // auto-scroll al último mensaje
    elementoMensajes.scrollTo({ top: elementoMensajes.scrollHeight, behavior: "smooth" });
  }

  function actualizarEstadoEnvio() {
    botonEnviar.disabled = !inputMensaje.value.trim() || cargando;
  }

  renderizar();
  actualizarEstadoEnvio();

  async function enviar() {
    let texto = inputMensaje.value.trim();
    if (!texto || cargando) return;

    inputMensaje.value = "";
    actualizarEstadoEnvio();
    mensajes = [...mensajes, { role: "user", content: texto }];
    cargando = true;
    renderizar();

    if (usuario && rutaActiva) {
      await supabase.from("chat_messages").insert({
        user_id: usuario.id,
        learning_path_id: rutaActiva.id,
        role: "user",
        content: texto,
      });
    }

    let textoRespuesta;
    try {
      let prompt = contexto ? `[Contexto: ${contexto}]\n\n${texto}` : texto;
      textoRespuesta = await enviarAN8N(prompt, idSesion);
    } catch (err) {
      let razon = err instanceof Error ? err.message : String(err);
      textoRespuesta = `Error al conectar con el asistente: ${razon}`;
    }

    mensajes = [...mensajes, { role: "assistant", content: textoRespuesta }];
    cargando = false;
    renderizar();

    if (usuario && rutaActiva) {
      await supabase.from("chat_messages").insert({
        user_id: usuario.id,
        learning_path_id: rutaActiva.id,
        role: "assistant",
        content: textoRespuesta,
      });
    }
  }

  inputMensaje.addEventListener("input", actualizarEstadoEnvio);
  inputMensaje.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  });
  botonEnviar.addEventListener("click", enviar);
}

