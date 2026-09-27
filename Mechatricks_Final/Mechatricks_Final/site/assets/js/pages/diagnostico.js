// Importa las dependencias para proteger la página, leer el estado del usuario y guardar la ruta resultante.
import { montarPaginaProtegida } from "../protected-page.js";
import { estadoAutenticacion, actualizarRutas, establecerRutaAprendizajeActiva } from "../auth.js";
import { supabase } from "../supabaseClient.js";

// Protege la página y asegura que el usuario haya iniciado sesión antes de continuar.
let principal = await montarPaginaProtegida("diagnostico.html");
if (!principal) throw new Error("redirecting to auth");

// Define la secuencia de preguntas del diagnóstico y sus opciones.
const PASOS = [
  {
    key: "arduino",
    question: "¿Cuánta experiencia tienes con Arduino?",
    scored: true,
    options: [
      { label: "Nunca lo he usado", points: 0, value: "none" },
      { label: "He hecho algunos tutoriales básicos", points: 1, value: "basic" },
      { label: "He construido proyectos propios", points: 2, value: "proyectos" },
      { label: "Domino protocolos y librerías avanzadas", points: 3, value: "avanzado" },
    ],
  },
  {
    key: "interests",
    question: "Áreas de la mecatrónica que te interesan (puedes elegir varias)",
    scored: false,
    multi: true,
    options: [
      { label: "Sensores y medición", value: "Sensores" },
      { label: "Motores y movimiento", value: "Motores" },
      { label: "Programación y control", value: "Programacion" },
      { label: "IoT y conectividad", value: "Iot" },
    ],
  },
  {
    key: "programming",
    question: "¿Cuál es tu nivel de programación?",
    scored: true,
    options: [
      { label: "Nunca he programado", points: 0, value: "none" },
      { label: "Conozco lo básico (variables, condicionales)", points: 1, value: "basic" },
      { label: "He hecho proyectos con funciones y librerías", points: 2, value: "intermediate" },
      { label: "Manejo POO, estructuras y algoritmos", points: 3, value: "advanced" },
    ],
  },
  {
    key: "goal",
    question: "¿Cuál es tu objetivo principal?",
    scored: false,
    options: [
      { label: "Hobby", value: "hobby" },
      { label: "Proyecto escolar o universitario", value: "school" },
      { label: "Carrera profesional", value: "career" },
      { label: "Investigación o emprendimiento", value: "research" },
    ],
  },
  {
    key: "formats",
    question: "Formatos preferidos (puedes elegir varios)",
    scored: false,
    multi: true,
    options: [
      { label: "Videos", value: "video" },
      { label: "Guías interactivas", value: "guia" },
      { label: "PDFs y documentación", value: "pdf" },
    ],
  },
  {
    key: "time",
    question: "¿Cuánto tiempo puedes dedicar por sesión?",
    scored: true,
    options: [
      { label: "30 minutos o menos", points: 0, value: "short" },
      { label: "Entre 30 y 60 minutos", points: 1, value: "mid" },
      { label: "Más de 60 minutos", points: 2, value: "long" },
    ],
  },
];

// Calcula el nivel y el módulo recomendado a partir del puntaje total del diagnóstico.
// TODO: revisar si agregar más rangos de nivel luego.
function calcularResultado(puntos) {
  if (puntos <= 1) return { level: "Principiante", modulo: "Sensores Digitales y Analógicos", id: "MOD-E-01" };
  if (puntos <= 4) return { level: "Básico", modulo: "Botones, Potenciómetros y Teclados", id: "MOD-E-02" };
  if (puntos <= 7) return { level: "Intermedio", modulo: "Estructuras de Control en Arduino C++", id: "MOD-P-01" };
  return { level: "Avanzado", modulo: "Control PID para Sistemas Mecatrónicos", id: "MOD-P-03" };
}

// Estado del diagnóstico actual: paso, respuestas, finalización y guardado.
let paso = 0;
let respuestas = {};
let terminado = false;
let guardando = false;
let errorGuardo = null;

// Verifica si una pregunta ya fue respondida según el tipo de respuesta.
function estaRespondida(pregunta) {
  let r = respuestas[pregunta.key];
  return pregunta.multi ? Array.isArray(r) && r.length > 0 : !!r;
}

// Guarda una opción seleccionada en la estructura del formulario, soportando respuestas múltiples.
function alternarOpcion(pregunta, opcion) {
  if (pregunta.multi) {
    let seleccionadas = Array.isArray(respuestas[pregunta.key]) ? respuestas[pregunta.key] : [];
    let yaEstaba = seleccionadas.find((item) => item.value === opcion.value);
    respuestas[pregunta.key] = yaEstaba
      ? seleccionadas.filter((item) => item.value !== opcion.value)
      : [...seleccionadas, opcion];
  } else {
    respuestas[pregunta.key] = opcion;
  }
}

// Avanza el diagnóstico y guarda el resultado cuando termina la última pregunta.
async function siguiente() {
  let pregunta = PASOS[paso];
  if (paso < PASOS.length - 1) {
    paso += 1;
    renderizar();
    return;
  }

  // Suma solo las preguntas que tienen puntaje para generar un nivel.
  let puntos = 0;
  for (let p of PASOS) {
    if (!p.scored) continue;
    let resp = respuestas[p.key];
    if (resp && !Array.isArray(resp)) {
      puntos += resp.points ?? 0;
    }
  }

  let res = calcularResultado(puntos);
  let intereses = (respuestas["interests"] ?? []).map((o) => o.value);
  let formatos = (respuestas["formats"] ?? []).map((o) => o.value);
  let objetivo = respuestas["goal"]?.value ?? "";

  // Guarda el perfil del usuario en localStorage para reutilizarlo en otras páginas.
  let perfil = {
    level: res.level,
    points: puntos,
    interests: intereses,
    formats: formatos,
    goal: objetivo,
    recommended_module: res.id,
    completed_at: new Date().toISOString(),
  };

  localStorage.setItem("mechatricks_user_profile", JSON.stringify(perfil));

  // Si hay sesión activa, guarda la ruta en Supabase y la convierte en la ruta activa.
  if (estadoAutenticacion.usuario) {
    guardando = true;
    errorGuardo = null;
    renderizar();

    let nombreRuta = `Mi ruta #${estadoAutenticacion.rutas.length + 1}`;
    let { data: nuevaRuta, error: errorBD } = await supabase
      .from("learning_paths")
      .insert({
        user_id: estadoAutenticacion.usuario.id,
        name: nombreRuta,
        diagnostic_result: perfil,
        recommended_module: res.id,
        level: res.level,
        score: puntos,
      })
      .select()
      .single();

    guardando = false;
    if (errorBD) {
      errorGuardo = errorBD.message;
    } else if (nuevaRuta) {
      await actualizarRutas();
      establecerRutaAprendizajeActiva(nuevaRuta);
    }
  }

  terminado = true;
  renderizar();
}

// Muestra la vista final con el resultado del diagnóstico y el módulo recomendado.
function renderizarTerminado() {
  let perfil = JSON.parse(localStorage.getItem("mechatricks_user_profile") || "{}");
  let resultado = calcularResultado(perfil.points ?? 0);

  principal.innerHTML = `
    <section class="seccion">
      <p class="meta-pagina">// resultados</p>
      <h1 class="titulo">Diagnóstico completado</h1>
      <div class="tarjeta-resultado">
        <dl class="resumen-resultado">
          <div class="fila-resultado">
            <dt class="etiqueta-resultado">Nivel</dt>
            <dd class="valor-resultado">${resultado.level}</dd>
          </div>
          <div class="fila-resultado">
            <dt class="etiqueta-resultado">Módulo recomendado</dt>
            <dd class="valor-resultado">${resultado.modulo}</dd>
          </div>
          <div class="fila-resultado">
            <dt class="etiqueta-resultado">Puntaje</dt>
            <dd class="valor-resultado">${perfil.points} pts</dd>
          </div>
          ${
            perfil.interests?.length > 0
              ? `<div class="fila-resultado">
                  <dt class="etiqueta-resultado">Intereses</dt>
                  <dd class="valor-resultado">${perfil.interests.join(", ")}</dd>
                </div>`
              : ""
          }
        </dl>
        ${errorGuardo ? `<p class="mensaje-estado error-estado">No se pudo guardar la ruta: ${errorGuardo}</p>` : ""}
      </div>
      <a href="aprender.html" target="_blank" rel="noopener noreferrer" class="boton boton-principal accion-pagina">
        ${guardando ? "Guardando..." : "Ir a aprender"}
      </a>
    </section>
  `;
}

// Renderiza la pregunta actual con sus opciones y acciones de navegación.
function renderizarPaso() {
  let preguntaActual = PASOS[paso];
  let respuestaActual = respuestas[preguntaActual.key];

  principal.innerHTML = `
    <section class="seccion">
      <p class="meta-pagina">Diagnóstico — PASO ${paso + 1} DE ${PASOS.length}</p>
      <h1 class="titulo">${preguntaActual.question}</h1>
      ${preguntaActual.multi ? `<p class="texto-ayuda">Selecciona una o varias opciones</p>` : ""}

      <div class="tarjeta-pregunta" id="tarjeta-pregunta"></div>

      <div class="acciones-navegacion">
        <button id="boton-atras" class="boton boton-secundario boton-navegacion" ${paso === 0 ? "disabled" : ""}>Atrás</button>
        <button id="boton-siguiente" class="boton boton-principal boton-navegacion" ${
          !estaRespondida(preguntaActual) || guardando ? "disabled" : ""
        }>
          ${paso === PASOS.length - 1 ? (guardando ? "Guardando..." : "Finalizar") : "Siguiente"}
        </button>
      </div>
    </section>
  `;

  // Crea las opciones visuales para la pregunta actual y marca las seleccionadas.
  let tarjetaPregunta = document.getElementById("tarjeta-pregunta");
  tarjetaPregunta.innerHTML = preguntaActual.options
    .map((opcion) => {
      let seleccionada = preguntaActual.multi
        ? Array.isArray(respuestaActual) && respuestaActual.some((item) => item.value === opcion.value)
        : respuestaActual?.value === opcion.value;
      return `
        <label class="opcion-seleccion ${seleccionada ? "opcion-seleccionada" : ""}">
          <input type="${preguntaActual.multi ? "checkbox" : "radio"}" name="${preguntaActual.key}" class="entrada-opcion" data-value="${opcion.value}" ${seleccionada ? "checked" : ""} />
          <span class="etiqueta-opcion">${opcion.label}</span>
        </label>`;
    })
    .join("");

  // Asigna el comportamiento de cada opción para guardar la respuesta y re-renderizar la vista.
  tarjetaPregunta.querySelectorAll(".entrada-opcion").forEach((input) => {
    input.addEventListener("change", () => {
      let opt = preguntaActual.options.find((item) => item.value === input.dataset.value);
      alternarOpcion(preguntaActual, opt);
      renderizarPaso();
    });
  });

  // Navega entre preguntas y regresa al paso anterior cuando el usuario lo pide.
  document.getElementById("boton-atras").addEventListener("click", () => {
    paso = Math.max(0, paso - 1);
    renderizarPaso();
  });
  document.getElementById("boton-siguiente").addEventListener("click", siguiente);
}

// Decide si se muestra el paso actual o el resumen final del diagnóstico.
function renderizar() {
  if (terminado) {
    renderizarTerminado();
  } else {
    renderizarPaso();
  }
}

// Ejecuta la renderización inicial del diagnóstico.
renderizar();

