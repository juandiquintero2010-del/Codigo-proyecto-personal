// Importa la protección de la página y el cliente de Supabase para consultar los recursos.
import { montarPaginaProtegida } from "../protected-page.js";
import { supabase } from "../supabaseClient.js";

// Verifica que el usuario autenticado tenga acceso a la sección de recursos.
let principal = await montarPaginaProtegida("recursos.html");
if (!principal) throw new Error("redirecting to auth");

// Define las opciones de filtros disponibles para el tipo de recurso y el pilar temático.
const TIPOS = [
  { value: "todos", label: "Todos" },
  { value: "video", label: "Video" },
  { value: "guia", label: "Guía" },
  { value: "pdf", label: "PDF" },
];
const PILARES = ["Todos", "Entradas", "Procesos", "Salidas", "General"];

// Estado central del listado: recursos cargados, carga en progreso y valores de filtro.
let recursos = [];
let cargando = true;
let error = null;
let tipo = "todos";
let pilar = "Todos";
let consulta = "";

// Genera la estructura HTML base de la página con los filtros y la tabla de resultados.
principal.innerHTML = `
  <section class="seccion">
    <div class="encabezado-seccion">
      <div>
        <h1 class="titulo">Recursos de referencia</h1>
        <p class="descripcion-pagina" id="cantidad-recursos"></p>
      </div>
    </div>

    <div class="cuadricula-filtros">
      <div class="campo-filtro">
        <label class="etiqueta-filtro">Tipo</label>
        <select id="filtro-tipo" class="entrada-filtro"></select>
      </div>
      <div class="campo-filtro">
        <label class="etiqueta-filtro">Área</label>
        <select id="filtro-pilar" class="entrada-filtro"></select>
      </div>
      <div class="campo-filtro">
        <label class="etiqueta-filtro">Buscar</label>
        <input type="text" id="filtro-busqueda" class="entrada-filtro" placeholder="Título, etiqueta..." />
      </div>
    </div>

    <p class="resumen-recurso" id="resumen-recurso"></p>

    <div id="area-estado"></div>
    <div id="area-tabla"></div>
  </section>
`;

// Obtiene los nodos del DOM para poder actualizar los filtros y la tabla.
let selectTipo = document.getElementById("filtro-tipo");
let selectPilar = document.getElementById("filtro-pilar");
let inputBusqueda = document.getElementById("filtro-busqueda");

// Configura las opciones de los selectores de tipo y pilar.
selectTipo.innerHTML = TIPOS.map((t) => `<option value="${t.value}">${t.label}</option>`).join("");
selectTipo.value = "todos";
selectPilar.innerHTML = PILARES.map((p) => `<option value="${p}">${p}</option>`).join("");
selectPilar.value = "Todos";

// Escucha cambios en el filtro por tipo y actualiza la vista.
selectTipo.addEventListener("change", () => {
  tipo = selectTipo.value;
  renderizar();
});

// Escucha cambios en el filtro por área y actualiza la vista.
selectPilar.addEventListener("change", () => {
  pilar = selectPilar.value;
  renderizar();
});

// Filtra en vivo mientras el usuario escribe en el campo de búsqueda.
inputBusqueda.addEventListener("input", () => {
  consulta = inputBusqueda.value;
  renderizar();
});

// TODO: agregar más filtros si hace falta.

// Aplica los filtros actuales a la colección de recursos disponibles.
function obtenerFiltrados() {
  let q = consulta.trim().toLowerCase();
  return recursos.filter((item) => {
    if (tipo !== "todos" && String(item.tipo ?? "").trim().toLowerCase() !== tipo) return false;
    if (pilar !== "Todos" && item.pillar !== pilar) return false;
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q) ||
      (item.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
    );
  });
}

// Renderiza el resumen, estados y tabla con los recursos filtrados.
function renderizar() {
  document.getElementById("cantidad-recursos").textContent = `${recursos.length} recursos, videos en YouTube, guías y PDFs en sus sitios oficiales.`;

  let filtrados = obtenerFiltrados();
  document.getElementById("resumen-recurso").textContent = `Mostrando ${filtrados.length} de ${recursos.length}`;

  let areaEstado = document.getElementById("area-estado");
  areaEstado.innerHTML = "";
  if (cargando) areaEstado.innerHTML += `<p class="mensaje-estado">Cargando...</p>`;
  if (error) areaEstado.innerHTML += `<p class="mensaje-estado error-estado">Error cargando recursos. Intenta de nuevo.</p>`;

  let areaTabla = document.getElementById("area-tabla");
  if (cargando || error) {
    areaTabla.innerHTML = "";
    return;
  }

  // Genera cada fila de la tabla de recursos con su tipo, título, nivel y enlace.
  let filas = filtrados
    .map(
      (r, idx) => `
      <tr class="${idx % 2 === 1 ? "fila-recurso-alternada" : "fila-recurso"}">
        <td class="celda-recurso tipo-recurso">${r.tipo}</td>
        <td class="celda-recurso celda-titulo-recurso">
          <div class="titulo-recurso">${r.title}</div>
          ${r.source ? `<div class="fuente-recurso">${r.source}</div>` : ""}
        </td>
        <td class="celda-recurso">
          ${r.level ? `<span class="insignia-recurso">${r.level}</span>` : `<span class="recurso-vacio">—</span>`}
        </td>
        <td class="celda-recurso">${r.pillar}</td>
        <td class="celda-recurso">
          <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="enlace-recurso">Abrir ↗</a>
        </td>
      </tr>`
    )
    .join("");

  // Inserta la tabla completa con los resultados, incluyendo caso sin coincidencias.
  areaTabla.innerHTML = `
    <div class="envoltura-tabla-recursos">
      <table class="tabla-recursos">
        <thead>
          <tr class="fila-recurso fila-encabezado-recurso">
            <th class="celda-recurso">Tipo</th>
            <th class="celda-recurso">Título</th>
            <th class="celda-recurso">Nivel</th>
            <th class="celda-recurso">Pilar</th>
            <th class="celda-recurso">Acción</th>
          </tr>
        </thead>
        <tbody>
          ${
            filtrados.length > 0
              ? filas
              : `<tr><td colspan="5" class="fila-vacia-recursos">No se encontraron recursos con estos filtros.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

// Render inicial vacío antes de cargar los recursos desde la base de datos.
renderizar();

// Consulta la tabla de recursos en Supabase y ordena la salida por fecha.
let res = await supabase
  .from("recursos")
  .select("*")
  .order("created_at", { ascending: true });

// Maneja el resultado de la consulta y activa la renderización final.
if (res.error) {
  error = res.error.message;
} else {
  recursos = res.data ?? [];
}
cargando = false;
renderizar();

