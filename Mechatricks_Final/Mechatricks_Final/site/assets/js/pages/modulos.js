// Importa la protección del acceso y la data de módulos disponibles.
import { montarPaginaProtegida } from "../protected-page.js";
import { MODULOS_STEM } from "../modules-data.js";

// Asegura que solo usuarios autenticados puedan entrar a esta ruta.
let principal = await montarPaginaProtegida("modulos.html");
if (!principal) throw new Error("redirecting to auth");

// Definición de los pilares disponibles en los filtros de módulos.
const PILARES = ["Todos", "Entradas", "Procesos", "Salidas"];
let filtro = "Todos";
let disponibles = MODULOS_STEM.filter((m) => m.status === "disponible").length;

// Construye la estructura base de la página con encabezado, tarjeta informativa y lista de módulos.
principal.innerHTML = `
  <section class="seccion">
    <div class="encabezado-seccion">
      <div>
        <h1 class="titulo">Módulos disponibles</h1>
        <p class="descripcion-pagina">${disponibles} de ${MODULOS_STEM.length} módulos publicados.</p>
      </div>
    </div>

    <div class="tarjeta-info">
      <p>Explora los módulos disponibles y filtra por área.</p>
    </div>

    <div class="fila-filtro" id="fila-filtro"></div>

    <ul class="lista-modulos" id="lista-modulos"></ul>
  </section>
`;

// Obtiene los contenedores donde se renderizan los filtros y la lista de módulos.
let filaFiltro = document.getElementById("fila-filtro");
let listaModulos = document.getElementById("lista-modulos");

// Render inicial de filtros y contenido.
renderizarFiltros();
renderizarLista();

// Genera los botones de filtro según los pilares definidos.
function renderizarFiltros() {
  filaFiltro.innerHTML = PILARES.map(
    (pilar) =>
      `<button class="boton-pastilla ${filtro === pilar ? "boton-pastilla-activo" : ""}" data-pillar="${pilar}">${pilar}</button>`
  ).join("");

  // Asigna eventos para cambiar el filtro activo y volver a renderizar la lista.
  filaFiltro.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      filtro = btn.dataset.pillar;
      renderizarFiltros();
      renderizarLista();
    });
  });
}

// Muestra solo los módulos que coinciden con el filtro actual.
function renderizarLista() {
  let modulosFiltrados = filtro === "Todos" ? MODULOS_STEM : MODULOS_STEM.filter((m) => m.pillar === filtro);
  listaModulos.innerHTML = modulosFiltrados
    .map(
      (mod, idx) => `
      <li class="elemento-modulo ${idx % 2 === 1 ? "elemento-modulo-alternado" : ""}">
        <div class="fila-modulo">
          <div class="info-modulo">
            <span class="id-modulo">${mod.id}</span>
            <div class="meta-modulo">
              <p class="titulo-modulo">${mod.title}</p>
              <p class="subtitulo-modulo">${mod.pillar} · ${mod.stem_area} · ${mod.estimated_time_min} min</p>
            </div>
          </div>
          <div class="etiquetas-modulo">
            <span class="insignia-estado insignia-dificultad ${claseDificultad(mod.difficulty)}">${mod.difficulty}</span>
            <span class="insignia-estado ${mod.status === "disponible" ? "estado-disponible" : "estado-proximo"}">
              ${mod.status === "disponible" ? "Disponible" : "Próximo"}
            </span>
            ${
              mod.arduino_reference
                ? `<a href="${mod.arduino_reference}" target="_blank" rel="noopener noreferrer" class="enlace-modulo">docs ↗</a>`
                : ""
            }
          </div>
        </div>
      </li>`
    )
    .join("");
}

// Define la clase visual de la dificultad para dar estilo al módulo.
function claseDificultad(dif) {
  if (dif === "Básico") return "dificultad-basica";
  if (dif === "Intermedio") return "dificultad-intermedia";
  return "dificultad-avanzada";
}


