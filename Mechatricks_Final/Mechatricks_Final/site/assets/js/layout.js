import { inicializarAutenticacion, alCambiarEstadoAutenticacion, cerrarSesion } from "./auth.js";

const ENLACES_NAV = [
  { href: "modulos.html", label: "MÓDULOS" },
  { href: "recursos.html", label: "RECURSOS" },
  { href: "diagnostico.html", label: "DIAGNÓSTICO" },
  { href: "ruta.html", label: "RUTA DE APRENDIZAJE" },
];

// función rápida para sanitizar strings en el html
function escaparHtml(texto) {
  let div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

export function inicializarDiseno(hrefActivo) {
  let encabezado = document.getElementById("encabezado-diseno");
  if (!encabezado) return;

  let links = ENLACES_NAV.map(
    (enlace) =>
      `<a href="${enlace.href}" class="enlace-nav${
        enlace.href === hrefActivo ? " enlace-nav-activo" : ""
      }">${enlace.label}</a>`
  ).join("");

  encabezado.innerHTML = `
    <div class="interior-diseno">
      <a href="index.html" class="enlace-marca">MECHATRICKS</a>
      <button class="boton-menu-nav" type="button" aria-expanded="false" aria-controls="navegacion-principal" aria-label="Abrir menú de navegación">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <nav class="enlaces-nav" id="navegacion-principal">${links}</nav>
      <div class="acciones-usuario" id="acciones-usuario"></div>
    </div>
  `;

  let botonMenu = encabezado.querySelector(".boton-menu-nav");
  botonMenu.addEventListener("click", () => {
    let abierto = botonMenu.getAttribute("aria-expanded") === "true";
    botonMenu.setAttribute("aria-expanded", String(!abierto));
    botonMenu.setAttribute("aria-label", abierto ? "Abrir menú de navegación" : "Cerrar menú de navegación");
    encabezado.querySelector(".interior-diseno").classList.toggle("menu-nav-abierto", !abierto);
  });

  let contenedorAcciones = document.getElementById("acciones-usuario");

  alCambiarEstadoAutenticacion((estado) => {
    if (estado.usuario) {
      contenedorAcciones.innerHTML = `
        <span class="correo-usuario">${escaparHtml(estado.usuario.email ?? "")}</span>
        <button class="boton boton-secundario boton-acceso" id="boton-salir">Salir</button>
      `;
      document.getElementById("boton-salir").addEventListener("click", async () => {
        await cerrarSesion();
        window.location.href = "index.html";
      });
    } else {
      contenedorAcciones.innerHTML = `<a href="auth.html" class="boton boton-principal boton-acceso">Iniciar sesión</a>`;
    }
  });

  inicializarAutenticacion();
}

