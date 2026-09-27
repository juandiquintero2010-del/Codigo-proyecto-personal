// Importa la protección de la ruta y las funciones relacionadas con la gestión de rutas de aprendizaje.
import { montarPaginaProtegida } from "../protected-page.js";
import { estadoAutenticacion, establecerRutaAprendizajeActiva, eliminarRuta } from "../auth.js";
import { MODULOS_STEM } from "../modules-data.js";

// Protege la página para que solo usuarios autenticados puedan verla.
let principal = await montarPaginaProtegida("ruta.html");
if (!principal) throw new Error("redirecting to auth");

// Estado para controlar si la ruta está siendo eliminada.
let eliminando = false;

// Muestra la vista cuando no existe una ruta de aprendizaje activa.
function renderizarVacia() {
  principal.innerHTML = `
    <section class="seccion estado-pagina-vacia">
      <h1 class="titulo">No tienes una ruta activa</h1>
      <p class="descripcion-pagina">
        Realiza el diagnóstico para generar tu ruta de aprendizaje personalizada.
      </p>
      <a href="diagnostico.html" class="boton boton-principal accion-pagina">Iniciar diagnóstico</a>
    </section>
  `;
}

// Renderiza la ruta activa, los datos del perfil y los módulos sugeridos.
function renderizar() {
  let rutaActiva = estadoAutenticacion.rutaAprendizajeActiva;
  if (!rutaActiva) {
    renderizarVacia();
    return;
  }

  // Obtiene la lista completa de rutas y el módulo recomendado según el identificador guardado.
  let rutas = estadoAutenticacion.rutas;
  let moduloRecomendado = MODULOS_STEM.find((m) => m.id === rutaActiva.recommended_module);
  let modulosNivel = MODULOS_STEM.filter(
    (m) => m.difficulty === rutaActiva.level || m.status === "disponible"
  ).slice(0, 4);

  // Crea el HTML principal con la información de la ruta y sugerencias de módulos.
  principal.innerHTML = `
    <section class="seccion">
      <h1 class="titulo">Ruta de Aprendizaje</h1>
      <p class="descripcion-pagina">Personalizada según tu diagnóstico</p>

      ${
        rutas.length > 1
          ? `<div class="fila-formulario">
              <span class="etiqueta-formulario">Ruta activa:</span>
              <select id="seleccionar-ruta" class="entrada-filtro">
                ${rutas
                  .map((r) => `<option value="${r.id}" ${r.id === rutaActiva.id ? "selected" : ""}>${r.name}</option>`)
                  .join("")}
              </select>
            </div>`
          : ""
      }

      <div class="tarjeta-perfil">
        <div class="cuadricula-perfil">
          <div class="estadistica-perfil">
            <p class="etiqueta-estadistica">Ruta</p>
            <p class="valor-estadistica">${rutaActiva.name}</p>
          </div>
          <div class="estadistica-perfil">
            <p class="etiqueta-estadistica">Nivel</p>
            <p class="valor-estadistica">${rutaActiva.level ?? "—"}</p>
          </div>
          <div class="estadistica-perfil">
            <p class="etiqueta-estadistica">Puntaje</p>
            <p class="valor-estadistica">${rutaActiva.score ?? "—"} pts</p>
          </div>
          <div class="estadistica-perfil">
            <p class="etiqueta-estadistica">Módulo recomendado</p>
            <p class="valor-estadistica">${rutaActiva.recommended_module ?? "—"}</p>
          </div>
        </div>
      </div>

      ${
        moduloRecomendado
          ? `<div class="seccion-recomendada">
              <h2 class="subtitulo-seccion">Módulo recomendado para ti</h2>
              <div class="tarjeta-recomendada">
                <div class="contenido-recomendado">
                  <div>
                    <span class="id-modulo">${moduloRecomendado.id}</span>
                    <p class="titulo-modulo">${moduloRecomendado.title}</p>
                    <p class="detalle-modulo">${moduloRecomendado.pillar} · ${moduloRecomendado.stem_area} · ${moduloRecomendado.estimated_time_min} min</p>
                    <p class="descripcion-modulo">${moduloRecomendado.description}</p>
                  </div>
                  ${
                    moduloRecomendado.arduino_reference
                      ? `<a href="${moduloRecomendado.arduino_reference}" target="_blank" rel="noopener noreferrer" class="boton boton-principal accion-recomendada">Ver docs</a>`
                      : ""
                  }
                </div>
              </div>
            </div>`
          : ""
      }

      <div class="seccion-sugerida">
        <h2 class="subtitulo-seccion">Módulos sugeridos según tu nivel</h2>
        <ul class="lista-sugerida">
          ${modulosNivel
            .map(
              (m) => `
            <li class="elemento-sugerido">
              <div class="fila-sugerida">
                <div class="info-sugerida">
                  <span class="id-modulo">${m.id}</span>
                  <div>
                    <p class="titulo-modulo">${m.title}</p>
                    <p class="detalle-modulo">${m.pillar} · ${m.stem_area} · ${m.estimated_time_min} min</p>
                  </div>
                </div>
                <div class="acciones-sugeridas">
                  <span class="insignia-estado insignia-contorno">${m.difficulty}</span>
                  ${
                    m.arduino_reference
                      ? `<a href="${m.arduino_reference}" target="_blank" rel="noopener noreferrer" class="enlace-recurso">docs ↗</a>`
                      : ""
                  }
                </div>
              </div>
            </li>`
            )
            .join("")}
        </ul>
      </div>

      <div class="fila-accion">
        <a href="modulos.html" class="boton boton-secundario">Ver todos los módulos</a>
        <a href="diagnostico.html" class="boton boton-principal">Nuevo diagnóstico</a>
        <button type="button" id="boton-eliminar-ruta" class="boton boton-peligro" ${eliminando ? "disabled" : ""}>
          ${eliminando ? "Eliminando..." : "Eliminar ruta"}
        </button>
      </div>
    </section>
  `;

  // Permite cambiar la ruta activa desde el selector si existen varias rutas.
  let selectRuta = document.getElementById("seleccionar-ruta");
  if (selectRuta) {
    selectRuta.addEventListener("change", () => {
      let encontrada = rutas.find((r) => r.id === selectRuta.value);
      if (encontrada) {
        establecerRutaAprendizajeActiva(encontrada);
        renderizar();
      }
    });
  }

  // Botón para borrar la ruta de aprendizaje activa y confirmar la acción.
  document.getElementById("boton-eliminar-ruta").addEventListener("click", async () => {
    if (!rutaActiva) return;
    let confirmado = window.confirm(`¿Eliminar la ruta "${rutaActiva.name}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;
    eliminando = true;
    renderizar();
    try {
      await eliminarRuta(rutaActiva.id);
    } finally {
      eliminando = false;
      renderizar();
    }
  });
}

// Ejecuta el render inicial de la ruta según el estado autenticado.
renderizar();

