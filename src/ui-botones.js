
import { rand, sanitizar, verificarRateLimit, ajustarSilabas, idsVistos, lexicoActivo } from './utils.js';
import { 
  ESTADO, 
  cambiarVida, 
  revivirOráculo, 
  avisoTemporal, 
  guardarEstado,
  actualizarUI 
} from './estado-jardin.js';
import { 
  datosColumna, 
  LEXICO_INICIAL,
  CONFIG 
} from './datos.js';
import { 
  crearVerso, 
  crearMensaje
} from './flotantes.js';
import { db } from './main.js';
import { ref, get, set, push } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';
import { playPageTurn } from './sonido.js';

const REDES = [
  { id:'twitter', label:'X', estilo:'background:#1DA1F2;color:#fff;' },
  { id:'bluesky', label:'Bluesky', estilo:'background:#1185FE;color:#fff;' },
  { id:'linkedin', label:'LinkedIn', estilo:'background:#0A66C2;color:#fff;' },
  { id:'whatsapp', label:'WhatsApp', estilo:'background:#25D366;color:#fff;' },
  { id:'facebook', label:'Facebook', estilo:'background:#1877F2;color:#fff;' },
  { id:'reddit', label:'Reddit', estilo:'background:#FF4500;color:#fff;' },
  { id:'instagram', label:'Instagram', estilo:'background:#E1306C;color:#fff;' },
  { id:'substack', label:'Substack', estilo:'background:#FF6719;color:#fff;' }
];

let LEXICO_APROBADO = { señal:[], resonancia:[], fractura:[], deriva:[] };

async function sembrar() {
  if (!verificarRateLimit()) return;

  if (ESTADO.muerto) {
    await revivirOráculo('semilla');
    return;
  }

  ESTADO.vecesCompartido += 1;
  await guardarEstado();
  actualizarUI();
  avisoTemporal(`Semilla sembrada (${ESTADO.vecesCompartido})`);
}

export function generarBotonesCompartir(texto, autor, esSemilla = true) {
  const msg = esSemilla ? `"Sembrar una semilla en el Jardín" — ${autor}` : `"${texto}" — ${autor}`;
  const url = window.location.href;
  const cont = document.getElementById('botones-compartir');
  if (!cont) return;
  cont.innerHTML = '';

  REDES.forEach(r => {
    const a = document.createElement('a');
    a.setAttribute('style', r.estilo + 'padding:6px 12px;border-radius:20px;text-decoration:none;font-size:10px;font-weight:bold;display:inline-flex;align-items:center;gap:4px;font-family:inherit;');
    let href;
    if (r.id === 'instagram') {
      href = `https://www.instagram.com/39913em/`;
    } else if (r.id === 'substack') {
      href = `https://substack.com/`;
    } else {
      href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(url)}`;
      if (r.id === 'bluesky') href = `https://bsky.app/intent/compose?text=${encodeURIComponent(msg)}%20${encodeURIComponent(url)}`;
      else if (r.id === 'linkedin') href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
      else if (r.id === 'whatsapp') href = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}%20${encodeURIComponent(url)}`;
      else if (r.id === 'facebook') href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(msg)}`;
      else if (r.id === 'reddit') href = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(msg)}`;
    }
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = r.label;
    a.addEventListener('click', (e) => {
      if (r.id !== 'instagram' && r.id !== 'substack') {
        e.preventDefault();
        window.open(a.href, '_blank');
      }
      sembrar();
    });
    cont.appendChild(a);
  });

  const copiar = document.createElement('button');
  copiar.textContent = 'Copiar';
  copiar.setAttribute('style', 'padding:6px 12px;border-radius:20px;border:1px solid #555;background:#333;color:#fff;font-size:10px;font-weight:bold;cursor:pointer;font-family:inherit;');
  copiar.addEventListener('click', () => {
    navigator.clipboard.writeText(`${msg}\n\n${url}`).then(() => {
      copiar.textContent = '✅ Copiado';
      setTimeout(()=> copiar.textContent='Copiar', 2000);
      sembrar();
    });
  });
  cont.appendChild(copiar);

  const textoEl = document.getElementById('verso-compartir-texto');
  const autorEl = document.getElementById('verso-compartir-autor');
  if (textoEl) textoEl.textContent = esSemilla ? '"Sembrar una semilla en el Jardín"' : `"${texto}"`;
  if (autorEl) autorEl.textContent = `— ${autor}`;
  
  const panel = document.getElementById('panel-compartir');
  if (panel) panel.classList.add('visible');
}

async function guardarLexicoAprobado(categoria, palabra) {
  try {
    const key = Date.now()+'_'+Math.floor(Math.random()*1000);
    const refNodo = ref(db, `lexico_aprobado/${categoria}/${key}`);
    await set(refNodo, palabra);
    LEXICO_APROBADO[categoria].push(palabra);
  } catch(e) { console.warn('No se pudo guardar palabra en léxico:', e); }
}

async function haiku() {
  if (ESTADO.muerto) {
    ESTADO.haikusParaRevivir = (ESTADO.haikusParaRevivir || 0) + 1;
    if (ESTADO.haikusParaRevivir >= CONFIG.HAUKUS_PARA_REVIVIR) {
      await revivirOráculo('haikus');
    } else {
      avisoTemporal(`💀 ${CONFIG.HAUKUS_PARA_REVIVIR} haikus reviven (${ESTADO.haikusParaRevivir}/${CONFIG.HAUKUS_PARA_REVIVIR})`);
    }
    return;
  }

  function generarHaiku(label) {
    let v1 = rand(lexicoActivo('señal', LEXICO_INICIAL, LEXICO_APROBADO));
    v1 = ajustarSilabas(v1, 5);

    let v2 = rand(lexicoActivo('resonancia', LEXICO_INICIAL, LEXICO_APROBADO));
    v2 = ajustarSilabas(v2, 7);

    let v3 = rand(lexicoActivo('fractura', LEXICO_INICIAL, LEXICO_APROBADO));
    v3 = ajustarSilabas(v3, 5);

    return { texto: `${v1} / ${v2} / ${v3}`, autor: 'ORÁCULO', columna: label, cat: 'haiku' };
  }

  const col = datosColumna[Math.floor(Math.random() * datosColumna.length)];
  let verso = generarHaiku(col.label);
  let intentos = 0;

  while (idsVistos.has(verso.texto) && intentos < 50) {
    verso = generarHaiku(col.label);
    intentos++;
  }

  if (intentos >= 50) {
    idsVistos.clear();
    verso = generarHaiku(col.label);
  }

  crearVerso(verso.texto, verso.autor, col.label);

  try {
    const nuevoVerso = {
      texto: verso.texto, autor: verso.autor,
      columna: col.label, ts: Date.now()
    };
    const refPush = push(ref(db, 'versos'), nuevoVerso);
    idsVistos.add(verso.texto);
  } catch(e) { console.warn('No se pudo sincronizar:', e); }

  cambiarVida(1);
  playPageTurn();
}

export function configurarBotones() {
  const btnSembrar = document.getElementById('btn-sembrar');
  if (btnSembrar) {
    btnSembrar.addEventListener('click', () => {
      generarBotonesCompartir('', 'ORÁCULO', true);
    });
  }

  const btnPoesia = document.getElementById('btn-poesia');
  if (btnPoesia) {
    btnPoesia.addEventListener('click', haiku);
  }

  const btnRayar = document.getElementById('btn-rayar');
  const inputRayar = document.getElementById('input-rayar');
  const cerrarRayar = document.getElementById('cerrar-rayar');
  const enviarRayar = document.getElementById('enviar-rayar');
  const mensajeRayar = document.getElementById('mensaje-rayar');

  if (btnRayar) {
    btnRayar.addEventListener('click', () => {
      if (ESTADO.muerto) {
        avisoTemporal('El jardín está muerto.');
        return;
      }
      if (inputRayar) inputRayar.classList.toggle('visible');
    });
  }

  if (cerrarRayar) {
    cerrarRayar.addEventListener('click', () => {
      if (inputRayar) inputRayar.classList.remove('visible');
    });
  }

  if (enviarRayar && mensajeRayar) {
    enviarRayar.addEventListener('click', async () => {
      const t = sanitizar(mensajeRayar.value.trim());
      if (!t) return;

      const cat = ['señal', 'resonancia', 'fractura', 'deriva'][Math.floor(Math.random() * 4)];
      await guardarLexicoAprobado(cat, t);
      ESTADO.mensajes = [...ESTADO.mensajes, t];
      await guardarEstado();
      crearMensaje(t);

      mensajeRayar.value = '';
      if (inputRayar) inputRayar.classList.remove('visible');
      
      playPageTurn();
      avisoTemporal('Palabra añadida al oráculo');
    });
  }

  const btnInstrucciones = document.getElementById('btn-instrucciones');
  const panelInstrucciones = document.getElementById('panel-instrucciones');
  if (btnInstrucciones && panelInstrucciones) {
    btnInstrucciones.addEventListener('click', () => {
      panelInstrucciones.classList.add('visible');
    });
  }

  const cerrarCompartir = document.querySelector('#panel-compartir .btn-cerrar-panel');
  if (cerrarCompartir) {
    cerrarCompartir.addEventListener('click', () => {
      document.getElementById('panel-compartir')?.classList.remove('visible');
    });
  }

  console.log('🖱️ BotonesUI OK.');
}