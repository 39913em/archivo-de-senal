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

function initAboutB() {
  const footerImg = document.getElementById('aboutB');
  if (!footerImg) return;

  const destino = footerImg.dataset.destino || 'about.html';
  footerImg.addEventListener('click', function() {
    window.location.href = destino;
  });
}

function incluirParcial(idPlaceholder, url, reemplazos = {}) {
  const contenedor = document.getElementById(idPlaceholder);
  if (!contenedor) return Promise.resolve();

  return fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`No se pudo cargar ${url}`);
      return res.text();
    })
    .then(html => {
      for (const [marcador, valor] of Object.entries(reemplazos)) {
        html = html.split(marcador).join(valor);
      }
      contenedor.outerHTML = html;
    })
    .catch(err => {
      console.error('Error incluyendo', url, err);
    });
}

document.addEventListener('DOMContentLoaded', function() {
  const destinoAboutB =
    document.getElementById('footer-placeholder')?.dataset.destino || 'about.html';

  Promise.all([
    incluirParcial('header-placeholder', 'header.html'),
    incluirParcial('footer-placeholder', 'footer.html', { '__DESTINO__': destinoAboutB })
  ]).then(() => {
    initThemeToggle();
    initBackToTop();
    initAboutB();
  });
});
