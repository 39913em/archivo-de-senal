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

// ============================================================
// MAPA CONCEPTUAL - Force-Directed Graph con D3.js
// ============================================================

function generarMapaConceptual(entradas) {
  const container = document.getElementById('mapa-container');
  if (!container) return;
  
  // --- 1. Procesar tags ---
  const tagCount = {};
  const tagEntries = {};
  
  entradas.forEach(entrada => {
    (entrada.tags || []).forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
      if (!tagEntries[tag]) tagEntries[tag] = [];
      tagEntries[tag].push(entrada.titulo || entrada.id);
    });
  });
  
  const tags = Object.keys(tagCount);
  
  if (tags.length < 2) {
    container.innerHTML = `
      <div class="mapa-empty">
        <span>🌱</span>
        <p>Agrega más entradas con tags para ver el mapa conceptual.</p>
        <p style="font-size:0.7rem; opacity:0.6;">Necesitas al menos 2 tags diferentes.</p>
      </div>
    `;
    return;
  }
  
  // --- 2. Crear nodos ---
  const maxCount = Math.max(...Object.values(tagCount));
  
  const nodes = tags.map(tag => ({
    id: tag,
    group: 1,
    size: 8 + (tagCount[tag] / maxCount) * 28,
    count: tagCount[tag],
    entries: tagEntries[tag] || []
  }));
  
  // --- 3. Crear conexiones ---
  const links = [];
  const linkSet = new Set();
  
  entradas.forEach(entrada => {
    const entryTags = entrada.tags || [];
    for (let i = 0; i < entryTags.length; i++) {
      for (let j = i + 1; j < entryTags.length; j++) {
        const a = entryTags[i];
        const b = entryTags[j];
        const key = [a, b].sort().join('|');
        if (!linkSet.has(key)) {
          linkSet.add(key);
          links.push({ source: a, target: b, value: 1 });
        } else {
          const existing = links.find(l => 
            (l.source === a && l.target === b) || 
            (l.source === b && l.target === a)
          );
          if (existing) existing.value += 1;
        }
      }
    }
  });
  
  // --- 4. Configurar D3 ---
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;
  
  container.innerHTML = '';
  
  const tooltip = document.createElement('div');
  tooltip.className = 'mapa-tooltip';
  container.appendChild(tooltip);
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', 'transparent');
  
  const gLinks = svg.append('g').attr('class', 'links-group');
  const gNodes = svg.append('g').attr('class', 'nodes-group');
  
  // --- 5. Colores ---
  const colors = [
    '#0EA5A4', '#F2545B', '#E8EDF3', '#9BA8BC', 
    '#5B6679', '#34D399', '#FBBF24', '#F472B6',
    '#60A5FA', '#A78BFA', '#FB923C', '#22D3EE'
  ];
  
  function getColor(index) {
    return colors[index % colors.length];
  }
  
  // --- 6. Simulación ---
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links)
      .id(d => d.id)
      .distance(d => 80 + (d.value * 10))
    )
    .force('charge', d3.forceManyBody()
      .strength(d => -200 - (d.count * 10))
    )
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide()
      .radius(d => d.size + 8)
      .iterations(2)
    )
    .force('x', d3.forceX(width / 2).strength(0.02))
    .force('y', d3.forceY(height / 2).strength(0.02));
  
  // --- 7. Dibujar links ---
  const link = gLinks
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('stroke', 'var(--line)')
    .attr('stroke-opacity', 0.3)
    .attr('stroke-width', d => 0.8 + (d.value * 0.5));
  
  // --- 8. Dibujar nodos ---
  const node = gNodes
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
    );
  
  node.append('circle')
    .attr('r', d => d.size)
    .attr('fill', (d, i) => getColor(i))
    .attr('opacity', 0.85)
    .style('cursor', 'pointer')
    .style('stroke', 'var(--bg)')
    .style('stroke-width', '2px');
  
  node.append('text')
    .text(d => d.id)
    .style('font-size', d => d.size > 20 ? '11px' : '8px')
    .style('fill', d => d.size > 22 ? '#0B1320' : 'var(--text)')
    .style('font-weight', d => d.size > 22 ? '700' : '500')
    .style('text-shadow', d => d.size > 22 ? 'none' : '0 1px 4px rgba(0,0,0,0.8)')
    .style('pointer-events', 'none')
    .style('user-select', 'none');
  
  // --- 9. Eventos ---
  node.on('mouseenter', function(event, d) {
    d3.select(this).select('circle')
      .transition()
      .duration(200)
      .attr('r', d.size * 1.2)
      .attr('opacity', 1);
    
    d3.select(this).select('text')
      .style('font-size', d.size > 20 ? '13px' : '10px')
      .style('fill', '#fff');
    
    link
      .transition()
      .duration(200)
      .attr('stroke-opacity', l => {
        return (l.source.id === d.id || l.target.id === d.id) ? 0.9 : 0.1;
      })
      .attr('stroke-width', l => {
        return (l.source.id === d.id || l.target.id === d.id) ? 3 : 0.5;
      })
      .attr('stroke', l => {
        return (l.source.id === d.id || l.target.id === d.id) ? 'var(--teal)' : 'var(--line)';
      });
    
    const entriesList = d.entries.slice(0, 5).join(', ');
    const more = d.entries.length > 5 ? ` +${d.entries.length - 5} más` : '';
    tooltip.innerHTML = `
      <strong>#${d.id}</strong>
      <span class="tooltip-count">${d.count} entrada(s)</span>
      <span class="tooltip-entries">${entriesList}${more}</span>
    `;
    tooltip.classList.add('visible');
    
    const rect = container.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    tooltip.style.left = Math.min(mouseX + 12, width - 200) + 'px';
    tooltip.style.top = Math.min(mouseY - 10, height - 80) + 'px';
  });
  
  node.on('mousemove', function(event) {
    const rect = container.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    tooltip.style.left = Math.min(mouseX + 12, width - 200) + 'px';
    tooltip.style.top = Math.min(mouseY - 10, height - 80) + 'px';
  });
  
  node.on('mouseleave', function() {
    d3.select(this).select('circle')
      .transition()
      .duration(200)
      .attr('r', d => d.size)
      .attr('opacity', 0.85);
    
    d3.select(this).select('text')
      .style('font-size', d => d.size > 20 ? '11px' : '8px')
      .style('fill', d => d.size > 22 ? '#0B1320' : 'var(--text)');
    
    link
      .transition()
      .duration(200)
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', d => 0.8 + (d.value * 0.5))
      .attr('stroke', 'var(--line)');
    
    tooltip.classList.remove('visible');
  });
  
  node.on('click', function(event, d) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = d.id;
      searchInput.dispatchEvent(new Event('input'));
      document.querySelector('.archive')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
  
  // --- 10. Tick ---
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    
    node
      .attr('transform', d => `translate(${d.x},${d.y})`);
  });
  
  // --- 11. Drag ---
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  
  // --- 12. Redimensionar ---
  const resizeObserver = new ResizeObserver(() => {
    const newWidth = container.clientWidth || 800;
    const newHeight = container.clientHeight || 500;
    svg.attr('width', newWidth).attr('height', newHeight);
    simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
    simulation.alpha(0.3).restart();
  });
  
  resizeObserver.observe(container);
}

// --- Inicialización principal ---
async function init() {
  const archive = document.getElementById('archive-list');
  
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
    
    // --- Generar mapa conceptual ---
    generarMapaConceptual(entradas);
    
  } catch (err) {
    console.error("ERROR REAL:", err);
    const skeletons = archive.querySelectorAll('.skeleton-entry');
    skeletons.forEach(el => el.remove());
    archive.innerHTML = `<p class="empty-state">Error cargando archivo</p>`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
