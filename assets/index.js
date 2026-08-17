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
  
  // Determinar si tiene portada
  const tienePortada = entrada.portada && entrada.portada !== "";
  
  const tagsHtml = (entrada.tags || [])
    .slice(0, 4)
    .map(t => `<span class="tag">#${escapeHtml(t)}</span
