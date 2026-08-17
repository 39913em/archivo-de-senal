// lectura.js

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

function procesarWikilinks(texto) {
  return texto.replace(/\[\[([^\|]+)\|([^\]]+)\]\]/g, (match, label, url) => {
    const safeLabel = escapeHtml(label);
    const safeUrl = escapeHtml(url);
    return `<a class="wikilink" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
  });
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

// --- Actualizar meta tags para compartir ---
function actualizarMetaTags(entrada) {
  const titulo = entrada.titulo || 'Archivo de Señal';
  const descripcion = entrada.extracto || entrada.subtitulo || 'Cultura, arte digital y electrónico';
  const imagen = entrada.portada || 'https://39913em.github.io/archivo-de-senal/assets/img/logo.png';
  const url = window.location.href;
  const sitio = 'Archivo de Señal';
  
  // Actualizar og:title
  let meta = document.querySelector('meta[property="og:title"]');
  if (meta) meta.content = `${titulo} — ${sitio}`;
  
  // Actualizar og:description
  meta = document.querySelector('meta[property="og:description"]');
  if (meta) meta.content = descripcion;
  
  // Actualizar og:image
  meta = document.querySelector('meta[property="og:image"]');
  if (meta) meta.content = imagen;
  
  // Actualizar og:url
  meta = document.querySelector('meta[property="og:url"]');
  if (meta) meta.content = url;
  
  // Actualizar twitter:title
  meta = document.querySelector('meta[name="twitter:title"]');
  if (meta) meta.content = `${titulo} — ${sitio}`;
  
  // Actualizar twitter:description
  meta = document.querySelector('meta[name="twitter:description"]');
  if (meta) meta.content = descripcion;
  
  // Actualizar twitter:image
  meta = document.querySelector('meta[name="twitter:image"]');
  if (meta) meta.content = imagen;
  
  // Actualizar título de la pestaña
  document.title = `${titulo} — ${sitio}`;
}

// --- Compartir en redes ---
function getShareUrls(titulo, url) {
  const encodedTitle = encodeURIComponent(titulo);
  const encodedUrl = encodeURIComponent(url);
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodedTitle}%20${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    instagram: `https://www.instagram.com/`, // Redirige a la app de Instagram (no se puede compartir directamente)
    substack: `https://substack.com/` // Redirige a Substack
  };
}

// --- Calcular tiempo de lectura ---
function calcularTiempoLectura(texto) {
  const palabras = texto.split(/\s+/).filter(p => p.length > 0).length;
  const minutos = Math.ceil(palabras / 200);
  return { palabras, minutos };
}

function renderEntrada(entrada) {
  const contenedor = document.getElementById('contenido');
  
  // Eliminar skeleton
  const skeleton = contenedor.querySelector('.skeleton-reading');
  if (skeleton) skeleton.remove();
  
  // Actualizar meta tags para compartir
  actualizarMetaTags(entrada);
  
  let html = '';
  
  // --- Imagen de portada ---
  if (entrada.portada && entrada.portada !== '') {
    html += `<img src="${escapeHtml(entrada.portada)}" alt="${escapeHtml(entrada.titulo || 'Portada')}" class="portada" loading="lazy">`;
  }
  
  // --- Título y subtítulo ---
  html += `<h1>${escapeHtml(entrada.titulo)}</h1>`;
  if (entrada.subtitulo) {
    html += `<h2>${escapeHtml(entrada.subtitulo)}</h2>`;
  }
  
  // --- Fecha y categoría ---
  let fecha = entrada.fecha || '';
  if (fecha.length === 7) {
    const [year, month] = fecha.split('-');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    fecha = `${meses[parseInt(month)-1]} de ${year}`;
  } else if (fecha.length === 10) {
    const parts = fecha.split('-');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    fecha = `${parseInt(parts[2])} de ${meses[parseInt(parts[1])-1]} de ${parts[0]}`;
  }
  html += `<p class="meta-fecha">${fecha} · ${escapeHtml(entrada.categoria)}</p>`;
  
  // --- Tiempo de lectura ---
  const textoCompleto = entrada.cuerpo.map(b => b.texto || '').join(' ');
  const { palabras, minutos } = calcularTiempoLectura(textoCompleto);
  html += `<p class="meta-lectura">📖 ${palabras} palabras · ${minutos} min de lectura</p>`;
  
  // --- Tags ---
  if (entrada.tags && entrada.tags.length > 0) {
    html += `<div class="tags">${entrada.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join(' ')}</div>`;
  }
  
  // --- Cuerpo ---
  entrada.cuerpo.forEach(bloque => {
    let texto = bloque.texto || '';
    let contenidoProcesado = procesarWikilinks(texto);
    
    if (bloque.tipo === 'parrafo') {
      html += `<p>${contenidoProcesado}</p>`;
    } else if (bloque.tipo === 'subtitulo') {
      html += `<h3>${contenidoProcesado}</h3>`;
    } else if (bloque.tipo === 'cita') {
      html += `<blockquote>${contenidoProcesado}</blockquote>`;
    } else if (bloque.tipo === 'destacado') {
      html += `<div class="destacado">${contenidoProcesado}</div>`;
    } else if (bloque.tipo === 'imagen') {
      let imgHtml = `<figure class="imagen-ensayo">`;
      imgHtml += `<img src="${escapeHtml(bloque.src)}" alt="${escapeHtml(bloque.alt || '')}" loading="lazy">`;
      if (bloque.pie) {
        imgHtml += `<figcaption>${escapeHtml(bloque.pie)}</figcaption>`;
      }
      imgHtml += `</figure>`;
      html += imgHtml;
    }
  });
  
  // --- Botones de compartir ---
  const url = window.location.href;
  const titulo = entrada.titulo || 'Archivo de Señal';
  const shares = getShareUrls(titulo, url);
  
  html += `<div class="share-section">`;
  html += `<p class="share-label">📤 Compartir esta pieza</p>`;
  html += `<div class="share-buttons">`;
  html += `<a href="${shares.twitter}" target="_blank" rel="noopener noreferrer" class="share-btn twitter">🐦 X</a>`;
  html += `<a href="${shares.bluesky}" target="_blank" rel="noopener noreferrer" class="share-btn bluesky">🦋 Bluesky</a>`;
  html += `<a href="${shares.linkedin}" target="_blank" rel="noopener noreferrer" class="share-btn linkedin">🔗 LinkedIn</a>`;
  html += `<a href="${shares.whatsapp}" target="_blank" rel="noopener noreferrer" class="share-btn whatsapp">📱 WhatsApp</a>`;
  html += `<a href="${shares.facebook}" target="_blank" rel="noopener noreferrer" class="share-btn facebook">📘 Facebook</a>`;
  html += `<a href="${shares.reddit}" target="_blank" rel="noopener noreferrer" class="share-btn reddit">🤖 Reddit</a>`;
  html += `<a href="${shares.instagram}" target="_blank" rel="noopener noreferrer" class="share-btn instagram">📷 Instagram</a>`;
  html += `<a href="${shares.substack}" target="_blank" rel="noopener noreferrer" class="share-btn substack">📬 Substack</a>`;
  html += `</div>`;
  html += `</div>`;
  
  contenedor.innerHTML = html;
  
  // Re-aplicar filtro de tags después de renderizar
  document.querySelectorAll('#contenido .tag').forEach(tag => {
    tag.style.cursor = 'pointer';
    tag.addEventListener('click', function() {
      const tagName = this.textContent.replace('#', '');
      window.location.href = `index.html?tag=${encodeURIComponent(tagName)}`;
    });
  });
}

// --- Cargar entrada ---
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar funciones de UI
  initThemeToggle();
  initBackToTop();
  
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  
  if (!id) {
    document.getElementById('contenido').innerHTML = '<p>No se especificó ID.</p>';
    return;
  }

  fetch('entradas.json')
    .then(res => res.json())
    .then(data => {
      const entradaMeta = data.entradas.find(e => e.id === id);
      if (!entradaMeta) {
        document.getElementById('contenido').innerHTML = '<p>Entrada no encontrada.</p>';
        return;
      }
      return fetch(`contenido/${entradaMeta.archivo}`)
        .then(res => {
          if (!res.ok) throw new Error('No se pudo cargar el contenido');
          return res.json();
        })
        .then(entradaCompleta => {
          const entrada = { ...entradaMeta, ...entradaCompleta };
          renderEntrada(entrada);
        });
    })
    .catch(err => {
      const contenedor = document.getElementById('contenido');
      const skeleton = contenedor.querySelector('.skeleton-reading');
      if (skeleton) skeleton.remove();
      contenedor.innerHTML = '<p>Error cargando el archivo.</p>';
      console.error(err);
    });
});
