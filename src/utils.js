
export function rand(a) {
  return a[Math.floor(Math.random() * a.length)];
}

export function sanitizar(texto) {
  return texto.replace(/[<>]/g, '').slice(0, 140);
}

export function verificarRateLimit() {
  const ultimaAccion = localStorage.getItem('ultima_siembra');
  const ahora = Date.now();
  if (ultimaAccion && (ahora - ultimaAccion) < 3000) {
    return false;
  }
  localStorage.setItem('ultima_siembra', ahora);
  return true;
}

export function contarSilabas(texto) {
  const vocales = 'aeiouáéíóúü';
  let count = 0, lastWasVowel = false;
  for (let char of texto.toLowerCase()) {
    if (vocales.includes(char)) {
      if (!lastWasVowel) count++;
      lastWasVowel = true;
    } else {
      lastWasVowel = false;
    }
  }
  return Math.max(1, count);
}

export function ajustarSilabas(texto, objetivo) {
  let actual = contarSilabas(texto);
  if (actual === objetivo) return texto;

  while (actual > objetivo) {
    const palabras = texto.split(' ');
    if (palabras.length <= 1) break;
    const idx = Math.floor(Math.random() * (palabras.length - 1)) + 1;
    palabras.splice(idx, 1);
    texto = palabras.join(' ');
    actual = contarSilabas(texto);
  }

  while (actual < objetivo) {
    const articulos = ['el ', 'la ', 'un ', 'una ', 'de ', 'en '];
    texto = rand(articulos) + texto;
    actual = contarSilabas(texto);
    if (actual > objetivo) {
      texto = texto.replace(/^(el |la |un |una |de |en )/, '');
      break;
    }
  }
  return texto;
}

export function probabilidadBloqueo(integridad) {
  if (integridad >= 80) return 0;
  if (integridad >= 40) return 0.3 + (79 - integridad) / 39 * 0.4;
  return 0.85;

}

export const idsVistos = new Set();

export function lexicoActivo(categoria, lexicoInicial, lexicoAprobado) {
  return [...(lexicoInicial[categoria] || []), ...(lexicoAprobado[categoria] || [])];
}