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

function normalizarTag(tag = "") {
  return tag
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function crearFilaEntrada(entrada) {
  const a = document.createElement("a");
  a.className = "entry-row";
  a.href = `lectura.html?id=${encodeURIComponent(entrada.id || "")}`;

  const tagsList = (entrada.tags || []);
  a.dataset.tags = tagsList.map(normalizarTag).join('|');

  const tagsHtml = tagsList
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

function aplicarFiltroTag(tag) {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  const tagNorm = normalizarTag(tag);
  searchInput.value = tag;

  const rows = document.querySelectorAll('.entry-row');
  let visibleCount = 0;

  rows.forEach(row => {
    const tagsArray = (row.dataset.tags || '').split('|').filter(Boolean);
    const found = tagsArray.some(t => t === tagNorm);
    if (found) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });

  const archiveList = document.getElementById('archive-list');
  if (archiveList) {
    let emptyMsg = archiveList.querySelector('.search-empty');
    if (visibleCount === 0) {
      if (!emptyMsg) {
        emptyMsg = document.createElement('p');
        emptyMsg.className = 'empty-state search-empty';
        emptyMsg.textContent = 'No se encontraron piezas con este tag.';
        archiveList.appendChild(emptyMsg);
      }
    } else if (emptyMsg) {
      emptyMsg.remove();
    }
  }

  actualizarBotonLimpiar(true);

  document.querySelector('.archive')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

function limpiarFiltro() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  actualizarBotonLimpiar(false);
}

function actualizarBotonLimpiar(visible) {
  let btn = document.getElementById('limpiar-filtro');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'limpiar-filtro';
    btn.type = 'button';
    btn.textContent = '✕ limpiar';
    btn.style.display = 'none';
    btn.addEventListener('click', limpiarFiltro);
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.parentNode) {
      searchInput.parentNode.insertBefore(btn, searchInput.nextSibling);
    }
  }
  btn.style.display = visible ? 'inline-block' : 'none';
}

function initSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', function(e) {
    const query = normalizarTag(e.target.value);
    const rows = document.querySelectorAll('.entry-row');
    let visibleCount = 0;

    rows.forEach(row => {
      const tagsArray = (row.dataset.tags || '').split('|').filter(Boolean);
      let found = false;

      if (query === '') {
        found = true;
      } else {
        const text = normalizarTag(row.textContent);
        if (text.includes(query)) found = true;
        if (!found && tagsArray.some(tag => tag.includes(query))) found = true;
      }

      if (found) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    const archiveList = document.getElementById('archive-list');
    if (archiveList) {
      let emptyMsg = archiveList.querySelector('.search-empty');
      if (visibleCount === 0 && query !== '') {
        if (!emptyMsg) {
          emptyMsg = document.createElement('p');
          emptyMsg.className = 'empty-state search-empty';
          emptyMsg.textContent = 'No se encontraron piezas que coincidan con tu búsqueda.';
          archiveList.appendChild(emptyMsg);
        }
      } else if (emptyMsg) {
        emptyMsg.remove();
      }
    }

    actualizarBotonLimpiar(query !== '');
  });
}

function initTagFilter() {
  document.addEventListener('click', function(e) {
    const tag = e.target.closest('.tag');
    if (!tag) return;
    const tagName = tag.textContent.replace('#', '').trim();
    aplicarFiltroTag(tagName);
  });
}

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

function generarMapaConceptual(entradas, matrizConceptos) {
  const container = document.getElementById('mapa-container');
  if (!container) return;
  if (!matrizConceptos || !matrizConceptos.conceptos || !matrizConceptos.matriz) {
    container.innerHTML = `<div class="mapa-empty"><p>Falta conceptos.json o está mal formado.</p></div>`;
    return;
  }

  const CONCEPTOS = matrizConceptos.conceptos;
  const MATRIZ = matrizConceptos.matriz;
  const ids = entradas.map(e => e.id);

  const vectores = {};
  CONCEPTOS.forEach(c => {
    vectores[c] = ids.map(id => (MATRIZ[c] && MATRIZ[c][id]) || 0);
  });

  function correlacion(a, b) {
    const n = a.length;
    const ma = a.reduce((s, v) => s + v, 0) / n;
    const mb = b.reduce((s, v) => s + v, 0) / n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) {
      const xa = a[i] - ma;
      const xb = b[i] - mb;
      num += xa * xb;
      da += xa * xa;
      db += xb * xb;
    }
    if (da === 0 || db === 0) return 0;
    return num / Math.sqrt(da * db);
  }

  const CORRELACION_MINIMA = 0.45;

  const pesoTotal = {};
  CONCEPTOS.forEach(c => {
    pesoTotal[c] = vectores[c].reduce((s, v) => s + v, 0);
  });

  const ejes = CONCEPTOS.filter(c => pesoTotal[c] >= 20).sort((a, b) => pesoTotal[b] - pesoTotal[a]);
  const conexion = CONCEPTOS.filter(c => pesoTotal[c] >= 8 && pesoTotal[c] < 20).sort((a, b) => pesoTotal[b] - pesoTotal[a]);
  const perifericos = CONCEPTOS.filter(c => pesoTotal[c] > 0 && pesoTotal[c] < 8).sort((a, b) => pesoTotal[b] - pesoTotal[a]);

  if (ejes.length + conexion.length + perifericos.length === 0) {
    container.innerHTML = `<div class="mapa-empty"><p>Todavía no hay suficientes conexiones entre temas.</p></div>`;
    return;
  }

  container.innerHTML = '';

  const width = container.clientWidth || 900;
  const height = 600;
  const cx = width / 2;
  const cy = height / 2;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("class", "neurona-svg");
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";
  container.appendChild(svg);

  const gDendritas = document.createElementNS(svgNS, "g");
  gDendritas.setAttribute("class", "neurona-dendritas");
  svg.appendChild(gDendritas);

  const gLinks = document.createElementNS(svgNS, "g");
  gLinks.setAttribute("class", "neurona-links");
  svg.appendChild(gLinks);

  const gNodes = document.createElementNS(svgNS, "g");
  gNodes.setAttribute("class", "neurona-nodes");
  svg.appendChild(gNodes);

  const posiciones = {};

  function posicionarEnAnillo(lista, radio, offsetAngulo) {
    const n = lista.length;
    lista.forEach((c, i) => {
      const angulo = offsetAngulo + (i / Math.max(1, n)) * Math.PI * 2;
      const x = cx + Math.cos(angulo) * radio;
      const y = cy + Math.sin(angulo) * radio;
      posiciones[c] = { x, y, angulo };
    });
  }

  posicionarEnAnillo(ejes, 130, -Math.PI / 2);
  posicionarEnAnillo(conexion, 230, -Math.PI / 2 + Math.PI / Math.max(1, conexion.length));
  posicionarEnAnillo(perifericos, 290, -Math.PI / 2 + Math.PI / Math.max(1, perifericos.length));

  const yaDibujado = new Set();
  for (let i = 0; i < CONCEPTOS.length; i++) {
    for (let j = i + 1; j < CONCEPTOS.length; j++) {
      const a = CONCEPTOS[i], b = CONCEPTOS[j];
      if (!posiciones[a] || !posiciones[b]) continue;
      const key = [a, b].sort().join('|');
      if (yaDibujado.has(key)) continue;
      yaDibujado.add(key);
      const corr = correlacion(vectores[a], vectores[b]);
      if (corr < CORRELACION_MINIMA) continue;
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", posiciones[a].x);
      line.setAttribute("y1", posiciones[a].y);
      line.setAttribute("x2", posiciones[b].x);
      line.setAttribute("y2", posiciones[b].y);
      line.setAttribute("class", "neurona-link");
      line.setAttribute("stroke-width", 0.6 + corr * 3);
      line.setAttribute("stroke-opacity", 0.1 + corr * 0.55);
      line.dataset.a = a;
      line.dataset.b = b;
      gLinks.appendChild(line);
    }
  }

  const soma = document.createElementNS(svgNS, "g");
  soma.setAttribute("class", "neurona-soma");
  const somaCircle = document.createElementNS(svgNS, "circle");
  somaCircle.setAttribute("cx", cx);
  somaCircle.setAttribute("cy", cy);
  somaCircle.setAttribute("r", 40);
  soma.appendChild(somaCircle);
  const somaText = document.createElementNS(svgNS, "text");
  somaText.setAttribute("x", cx);
  somaText.setAttribute("y", cy + 4);
  somaText.setAttribute("text-anchor", "middle");
  somaText.setAttribute("class", "neurona-soma-text");
  somaText.textContent = "archivo";
  soma.appendChild(somaText);
  gNodes.appendChild(soma);

  ejes.forEach(c => {
    if (!posiciones[c]) return;
    const d = document.createElementNS(svgNS, "line");
    d.setAttribute("x1", cx);
    d.setAttribute("y1", cy);
    d.setAttribute("x2", posiciones[c].x);
    d.setAttribute("y2", posiciones[c].y);
    d.setAttribute("class", "neurona-dendrita");
    d.dataset.tag = c;
    gDendritas.appendChild(d);
  });

  CONCEPTOS.forEach(c => {
    const pos = posiciones[c];
    if (!pos) return;
    const total = pesoTotal[c];
    const nivel = total >= 20 ? 'eje' : total >= 8 ? 'conexion' : 'periferico';
    const radio = nivel === 'eje' ? 8 + Math.min(12, total * 0.2) : nivel === 'conexion' ? 6 + Math.min(8, total * 0.3) : 5;

    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("class", `neurona-node nivel-${nivel}`);
    g.dataset.tag = c;
    g.setAttribute("transform", `translate(${pos.x},${pos.y})`);
    g.style.cursor = 'pointer';

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("r", radio);
    circle.setAttribute("class", "neurona-node-circle");
    g.appendChild(circle);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("y", radio + 12);
    label.setAttribute("class", "neurona-node-label");
    label.textContent = c;
    g.appendChild(label);

    const countText = document.createElementNS(svgNS, "text");
    countText.setAttribute("text-anchor", "middle");
    countText.setAttribute("y", 4);
    countText.setAttribute("class", "neurona-node-count");
    countText.textContent = total;
    g.appendChild(countText);

    g.addEventListener('mouseenter', () => {
      svg.classList.add('hover-activo');
      gNodes.querySelectorAll('.neurona-node').forEach(n => {
        if (n.dataset.tag === c) {
          n.classList.add('activo');
          n.classList.remove('atenuado');
        } else {
          n.classList.add('atenuado');
          n.classList.remove('activo');
        }
      });
      gLinks.querySelectorAll('.neurona-link').forEach(l => {
        if (l.dataset.a === c || l.dataset.b === c) {
          l.classList.add('activo');
          l.classList.remove('atenuado');
        } else {
          l.classList.add('atenuado');
          l.classList.remove('activo');
        }
      });
      gDendritas.querySelectorAll('.neurona-dendrita').forEach(d => {
        if (d.dataset.tag === c) {
          d.classList.add('activo');
          d.classList.remove('atenuado');
        } else {
          d.classList.add('atenuado');
          d.classList.remove('activo');
        }
      });
    });

    g.addEventListener('mouseleave', () => {
      svg.classList.remove('hover-activo');
      gNodes.querySelectorAll('.neurona-node').forEach(n => n.classList.remove('activo', 'atenuado'));
      gLinks.querySelectorAll('.neurona-link').forEach(l => l.classList.remove('activo', 'atenuado'));
      gDendritas.querySelectorAll('.neurona-dendrita').forEach(d => d.classList.remove('activo', 'atenuado'));
    });

    g.addEventListener('click', () => aplicarFiltroTag(c));

    gNodes.appendChild(g);
  });

  const leyenda = document.createElement('p');
  leyenda.className = 'mapa-leyenda';
  container.appendChild(leyenda);
}

async function init() {
  const archive = document.getElementById('archive-list');

  initSearch();
  initTagFilter();
  initViewToggle();

  try {
    const [data, matrizConceptos] = await Promise.all([
      cargarDatos(),
      fetch('conceptos.json').then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    const lista = data.entradas || data;
    if (!Array.isArray(lista)) {
      throw new Error("El JSON no contiene un array válido de entradas");
    }
    const entradas = [...lista].sort((a, b) => a.fecha < b.fecha ? 1 : -1);

    if (archive) {
      const skeletons = archive.querySelectorAll('.skeleton-entry');
      skeletons.forEach(el => el.remove());

      if (entradas.length === 0) {
        archive.innerHTML = `<p class="empty-state">Todavía no hay piezas publicadas. Vuelve pronto.</p>`;
      } else {
        entradas.forEach(entrada => archive.appendChild(crearFilaEntrada(entrada)));
      }
    }

    document.title = `${data.sitio?.titulo || "Archivo de Señal"} --- ${data.sitio?.subtitulo || ""}`;
    const h1 = document.getElementById("site-h1");
    if (h1 && data.sitio?.subtitulo) {
      h1.textContent = data.sitio.subtitulo;
    }
    const count = document.getElementById("entry-count");
    if (count) {
      count.textContent = String(entradas.length).padStart(2, "0");
    }

    generarMapaConceptual(entradas, matrizConceptos);

  } catch (err) {
    console.error("ERROR REAL:", err);
    if (archive) {
      const skeletons = archive.querySelectorAll('.skeleton-entry');
      skeletons.forEach(el => el.remove());
      archive.innerHTML = `<p class="empty-state">Error cargando archivo</p>`;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}