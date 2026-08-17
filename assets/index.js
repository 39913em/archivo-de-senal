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

// --- Toggle tema oscuro/claro ---
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  
  // Cargar preferencia guardada
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    toggle.textContent = '☀️';
  }
  
  toggle.addEventListener('click', function() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    this.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });
}

// --- Búsqueda en tiempo real ---
function initSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;
  
  searchInput.addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('.entry-row');
    let visibleCount = 0;
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (query === '' || text.includes(query)) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });
    
    // Mostrar mensaje si no hay resultados
    const archiveList = document.getElementById('archive-list');
    let emptyMsg = archiveList.querySelector('.search-empty');
    if (visibleCount === 0 && query !== '') {
      if (!emptyMsg) {
        emptyMsg = document.createElement('p');
        emptyMsg.className = 'empty-state search-empty';
        emptyMsg.textContent = 'No se encontraron piezas que coincidan con tu búsqueda.';
        archiveList.appendChild(emptyMsg);
      }
    } else {
      if (emptyMsg) emptyMsg.remove();
    }
  });
}

// --- Tags clickeables ---
function initTagFilter() {
  document.addEventListener('click', function(e) {
    const tag = e.target.closest('.tag');
    if (!tag) return;
    const tagName = tag.textContent.replace('#', '');
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = tagName;
      searchInput.dispatchEvent(new Event('input'));
    }
  });
}

// --- Vista grid / lista ---
function initViewToggle() {
  const toggle = document.getElementById('view-toggle');
  const archive = document.querySelector('.archive');
  if (!toggle || !archive) return;
  
  // Cargar preferencia guardada
  const savedView = localStorage.getItem('view');
  if (savedView === 'grid') {
    archive.classList.add('grid');
    toggle.textContent = '☰';
  }
  
  toggle.addEventListener('click', function() {
    archive.classList.toggle('grid');
    const isGrid = archive.classList.contains('grid');
    this.textContent = isGrid ? '☰' : '⊞';
    localStorage.setItem('view', isGrid ? 'grid' : 'list');
  });
}

// --- Volver arriba ---
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  
  window.addEventListener('scroll', function() {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });
  
  btn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// --- Inicialización principal ---
async function init() {
  const archive = document.getElementById('archive-list');
  
  // Inicializar funciones de UI
  initThemeToggle();
  initSearch();
  initTagFilter();
  initViewToggle();
  initBackToTop();
  
  try {
    const data = await cargarDatos();
    const lista = data.entradas || data;
    if (!Array.isArray(lista)) {
      throw new Error("El JSON no contiene un array válido de entradas");
    }
    const entradas = [...lista].sort((a, b) => a.fecha < b.fecha ? 1 : -1);
    
    // Eliminar skeletons
    const skeletons = archive.querySelectorAll('.skeleton-entry');
    skeletons.forEach(el => el.remove());
    
    if (entradas.length === 0) {
      archive.innerHTML = `<p class="empty-state">Todavía no hay piezas publicadas. Vuelve pronto.</p>`;
      return;
    }
    
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
    // Eliminar skeletons en caso de error
    const skeletons = archive.querySelectorAll('.skeleton-entry');
    skeletons.forEach(el => el.remove());
    archive.innerHTML = `<p class="empty-state">Error cargando archivo</p>`;
  }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
