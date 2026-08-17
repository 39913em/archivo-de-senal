// lectura.js

document.addEventListener('DOMContentLoaded', function() {
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
      document.getElementById('contenido').innerHTML = '<p>Error cargando el archivo.</p>';
      console.error(err);
    });
});

function renderEntrada(entrada) {
  const contenedor = document.getElementById('contenido');
  let html = '';
  html += `<h1>${escapeHtml(entrada.titulo)}</h1>`;
  html += `<h2>${escapeHtml(entrada.subtitulo)}</h2>`;
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
  if (entrada.tags && entrada.tags.length > 0) {
    html += `<div class="tags">${entrada.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join(' ')}</div>`;
  }
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
    }
  });
  contenedor.innerHTML = html;
}

function procesarWikilinks(texto) {
  return texto.replace(/\[\[([^\|]+)\|([^\]]+)\]\]/g, (match, label, url) => {
    const safeLabel = escapeHtml(label);
    const safeUrl = escapeHtml(url);
    return `<a class="wikilink" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
  });
}

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
