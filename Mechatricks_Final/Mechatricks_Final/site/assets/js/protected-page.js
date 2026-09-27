import { requerirAutenticacion } from "./auth.js";
import { inicializarDiseno } from "./layout.js";

// helper para no repetir el header y el chequeo de login en cada página
export async function montarPaginaProtegida(hrefActivo) {
  let valido = await requerirAutenticacion();
  if (!valido) return null; 

  let app = document.getElementById("aplicacion");
  if (app) {
    app.innerHTML = `
      <div class="raiz-diseno">
        <header class="encabezado-diseno" id="encabezado-diseno"></header>
        <main class="principal" id="principal-pagina"></main>
      </div>
    `;
  }
  inicializarDiseno(hrefActivo);
  return document.getElementById("principal-pagina");
}

