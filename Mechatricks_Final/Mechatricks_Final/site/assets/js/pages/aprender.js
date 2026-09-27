// Importa los módulos necesarios para la página de aprendizaje: diseño, sesión y widget del chat.
import { inicializarDiseno } from "../layout.js";
import { inicializarAutenticacion } from "../auth.js";
import { supabase } from "../supabaseClient.js";
import { montarWidgetChat } from "../chat-widget.js";

// Inicializa el layout común y la autenticación antes de mostrar contenido protegido.
inicializarDiseno("aprender.html");
await inicializarAutenticacion();

// Mapea los intereses del usuario a sus pilares principales para filtrar recursos.
const INTERES_A_PILAR = {
  sensores: "Entradas",
  programacion: "Procesos",
  motores: "Salidas",
  iot: "General",
};

// Lee el perfil del usuario guardado en localStorage para personalizar la vista.
let perfil = null;
try {
  let perfilGuardado = localStorage.getItem("mechatricks_user_profile");
  if (perfilGuardado) perfil = JSON.parse(perfilGuardado);
} catch (e) {
  // Si el JSON está corrupto, evita romper la página y registra la advertencia.
  console.warn("No se pudo leer el perfil", e);
}

// Estado para cargar y filtrar recursos obtenidos desde Supabase.
let recursos = [];
let cargando = true;
let error = null;

// Contenedor principal donde se renderiza el contenido de la página.
const principal = document.getElementById("principal-pagina");

// Devuelve la lista de recursos que cumplen con los filtros del perfil del usuario.
function obtenerFiltrados() {
  if (!perfil) return recursos;
  let intereses = perfil.interests ?? [];
  let formatos = perfil.formats ?? [];
  let pilaresPermitidos = new Set(intereses.map((item) => INTERES_A_PILAR[item]).filter(Boolean));
  pilaresPermitidos.add("General");

  return recursos.filter((r) => {
    if (formatos.length > 0 && !formatos.includes(r.tipo)) return false;
    if (pilaresPermitidos.size > 0 && !pilaresPermitidos.has(r.pillar)) return false;
    return true;
  });
}

// Traduce las claves de intereses a etiquetas legibles para la interfaz.
const ETIQUETAS_INTERES = {
  sensores: "Sensores",
  motores: "Motores",
  programacion: "Programación",
  iot: "IoT",
};

// Renderiza la página con los recursos filtrados y el asistente contextualizado.
function renderizar() {
  let etiquetasInteres = (perfil?.interests ?? []).map((i) => ETIQUETAS_INTERES[i] ?? i);
  let contextoChat = perfil
    ? `Nivel: ${perfil.level ?? "?"}. Intereses: ${etiquetasInteres.join(", ") || "varios"}. Objetivo: ${
        perfil.goal ?? "no indicado"
      }.`
    : undefined;

  // Agrupa los recursos por tipo para mostrarlos en secciones separadas.
  let grupos = [
    { clave: "video", etiqueta: "Videos" },
    { clave: "guia", etiqueta: "Guías" },
    { clave: "pdf", etiqueta: "PDFs" },
  ];

  let filtrados = obtenerFiltrados();

  // Genera el HTML para cada grupo de recursos que coincida con los filtros.
  let htmlGrupos = "";
  for (let grupo of grupos) {
    let items = filtrados.filter((r) => r.tipo === grupo.clave);
    if (items.length === 0) continue;
    htmlGrupos += `
      <section class="grupo-recurso">
        <h2 class="subtitulo-seccion">${grupo.etiqueta}</h2>
        <ul class="lista-recursos">
          ${items
            .map(
              (rec, idx) => `
            <li class="elemento-recurso ${idx % 2 === 1 ? "elemento-recurso-alternado" : ""}">
              <div class="contenido-elemento-recurso">
                <p class="titulo-recurso">${rec.title}</p>
                <p class="meta-recurso">${rec.pillar}${rec.level ? ` · ${rec.level}` : ""}${
                rec.duration_min ? ` · ${rec.duration_min} min` : ""
              }</p>
              </div>
              <a href="${rec.url}" target="_blank" rel="noopener noreferrer" class="enlace-recurso accion-pagina">Abrir ↗</a>
            </li>`
            )
            .join("")}
        </ul>
      </section>`;
  }
  if (!htmlGrupos) {
    htmlGrupos = `<p class="mensaje-recursos-vacios">No se encontraron recursos para tus selecciones.</p>`;
  }

  // Inserta el contenido principal en la página con los recursos y el asistente.
  principal.innerHTML = `
    <section class="seccion">
      <div class="encabezado-pagina">
        <h1 class="titulo">Tu ruta de aprendizaje</h1>
        <p class="descripcion-pagina">
          ${perfil ? `Recursos seleccionados según tu nivel ${perfil.level ?? ""}.` : "Completa el diagnóstico para personalizar tus recursos."}
        </p>
        ${etiquetasInteres.length > 0 ? `<p class="nota-pagina">Intereses: ${etiquetasInteres.join(", ")}</p>` : ""}
      </div>

      ${cargando ? `<p class="mensaje-estado">Cargando recursos...</p>` : ""}
      ${error ? `<p class="mensaje-estado error-estado">Error cargando recursos.</p>` : ""}
      ${!cargando && !error ? `<div class="grupos-recursos">${htmlGrupos}</div>` : ""}

      <div class="seccion-asistente">
        <h2 class="subtitulo-seccion">Asistente 🤖</h2>
        <div id="contenedor-chat"></div>
      </div>
    </section>
  `;

  // Monta el widget de chat con contexto personalizado del perfil del usuario.
  montarWidgetChat(document.getElementById("contenedor-chat"), { contexto: contextoChat });
}

// Render inicial antes de cargar los datos desde la base de datos.
renderizar();

// Consulta los recursos desde Supabase y los ordena por fecha de creación.
let { data: itemsRecursos, error: errCarga } = await supabase
  .from("recursos")
  .select("*")
  .order("created_at", { ascending: true });

// Maneja la respuesta de la base de datos y actualiza la vista con los resultados.
if (errCarga) {
  error = errCarga.message;
} else {
  recursos = itemsRecursos ?? [];
}
cargando = false;
renderizar();

