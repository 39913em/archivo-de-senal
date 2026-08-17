// ============================================================
// ARCHIVO DE SEÑAL --- render del índice
// Lee entradas.json y construye el listado. No requiere backend.
// ============================================================

async function cargarDatos() {
  const res = await fetch("entradas.json");
  if (!res.ok) throw new Error("No se pudo cargar entradas.json");
  return res.json();
}

function formatearFecha(iso) {
  if (!iso) return "";
  const meses = ["ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic"];
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${meses[m - 1]} ${y}`;
}

function escapeHtml(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function crearFilaEntrada(entrada) {
  const a = document.createElement("a");
  a.className = "entry-row";
  a.href = `lectura.html?id=${encodeURIComponent(entrada.id || "")}`;
  const tagsHtml = (entrada.tags || [])
    .slice(0, 4)
    .map(t => `<span class="tag">#${escapeHtml(t)}</span>`)
    .join("");
  a.innerHTML = `
    <div class="entry-piece">#${escapeHtml(entrada.pieza || "")}</div>
    <div class="entry-main">
      <h2 class="entry-title">${escapeHtml(entrada.titulo || "Sin título")}</h2>
      ${entrada.subtitulo ? `<p class="entry-sub">${escapeHtml(entrada.subtitulo)}</p>` : ""}
      <p class="entry-extract">${escapeHtml(entrada.extracto || "")}</p>
      <div class="entry-tags">${tagsHtml}</div>
    </div>
    <div class="entry-meta">
      ${formatearFecha(entrada.fecha)}
      <span class="cat">${escapeHtml(entrada.categoria || "")}</span>
    </div>
  `;
  return a;
}

async function init() {
  const archive = document.getElementById("archive-list");
  try {
    const data = await cargarDatos();
    const lista = data.entradas || data;
    if (!Array.isArray(lista)) {
      throw new Error("El JSON no contiene un array válido de entradas");
    }
    const entradas = [...lista].sort((a, b) => a.fecha < b.fecha ? 1 : -1);
    if (entradas.length === 0) {
      archive.innerHTML = `<p class="empty-state">Todavía no hay piezas publicadas. Vuelve pronto.</p>`;
      return;
    }
    archive.innerHTML = "";
    entradas.forEach(entrada => archive.appendChild(crearFilaEntrada(entrada)));
    document.title = `${data.sitio?.titulo || "Archivo de Señal"} --- ${data.sitio?.subtitulo || ""}`;
    const h1 = document.getElementById("site-h1");
    if (h1 && data.sitio?.subtitulo) {
      h1.textContent = data.sitio.subtitulo;
    }
    const count = document.getElementById("entry-count");
    if (count) {
      count.textContent = String(entradas.length).padStart(2, "0");
    }
  } catch (err) {
    console.error("ERROR REAL:", err);
    archive.innerHTML = `<p class="empty-state">Error cargando archivo</p>`;
  }
}

init();
