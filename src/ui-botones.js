import { db } from './firebase-config.js';
import { ref, get, set, update, onValue, push } from 'firebase/database';
import { ESTADO, CONFIG, cambiarVida, guardarEstado, actualizarUI, revivirOráculo, verificarRateLimit, sanitizar } from './estado-jardin.js';
import { scene, camera, renderer, controls, datosColumna, columnas, columnasMovimiento, ESCALA_SEÑAL, ESCALA_RESONANCIA, RANGO_DERIVA, RANGO_FRACTURA } from './escena-3d.js';
import { initAudio, playPageTurn, playPop, playRenacimiento } from './sonido.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// REDES SOCIALES Y COMPARTIR

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

function generarBotonesCompartir(texto, autor, esSemilla = true) {
  const msg = esSemilla ? `"Sembrar una semilla en el Jardín" — ${autor}` : `"${texto}" — ${autor}`;
  const url = window.location.href;
  const cont = document.getElementById('botones-compartir');
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
      sembrarSemilla();
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
      sembrarSemilla();
    });
  });
  cont.appendChild(copiar);

  document.getElementById('verso-compartir-texto').textContent = esSemilla ? '"Sembrar una semilla en el Jardín"' : `"${texto}"`;
  document.getElementById('verso-compartir-autor').textContent = `— ${autor}`;
  document.getElementById('panel-compartir').classList.add('visible');
}

// SEMBRAR

async function sembrarSemilla() {
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

// HAIKU - GENERACIÓN Y ACCIÓN


const LEXICO_INICIAL = {
  señal: [
    "bit que late", "dato sin dueño", "pulso digital", "flujo errante",
    "byte disperso", "señal perdida", "frecuencia abierta", "eco de datos",
    "huella en cache", "terabyte que pesa", "ping perdido", "dato que vibra",
    "consulta que no vuelve", "píxel que sangra", "volumen sin forma",
    "nube que arde", "latencia infinita", "servidor que suda", "hash disperso",
    "protocolo abierto", "paquete en tránsito", "interfaz que respira",
    "bucle infinito", "algoritmo ciego", "archivo sin nombre", "metadato perdido",
    "flujo binario", "señal de ruido", "conexión inestable", "puerto abierto",
    "socket que escucha", "payload errante", "checksum corrupto", "bit rot",
    "datos en deriva", "memoria volátil", "código fuente", "registro de eventos",
    "huella digital", "rastro de bytes", "fragmento de red", "onda portadora",
    "señal de audio", "modulación errante", "espectro visible", "frecuencia modulada"
  ],
  resonancia: [
    "bóveda de reverb", "pared de aire", "cámara de eco", "espacio resonante",
    "sala sin puertas", "eco que construye", "catedral de auriculares", "umbral que se escucha",
    "edificio de silencio", "fachada de sonido", "planta de frecuencias", "bóveda de bits",
    "arco de fase", "columna de datos", "puente de red", "espejo de código",
    "laberinto de espejos", "galería de ecos", "cúpula de silencio", "portal de acceso",
    "archivo de señales", "biblioteca de ruidos", "cripta de datos", "torre de control",
    "zona de interferencia", "área de cobertura", "nodo de red", "enjambre de señales",
    "mar de datos", "océano de bits", "cielo de frecuencias", "suelo de código",
    "muro de silencio", "puente de ecos", "pasillo de bytes", "habitación de espejos",
    "patio de resonancia", "ágora de datos", "foro de códigos", "plaza de señales",
    "jardín de interfaces", "bosque de protocolos", "desierto de datos", "montaña de bits",
    "valle de frecuencias", "río de señales", "mar de ruido", "torre de señales"
  ],
  fractura: [
    "cinta mordida", "olvido programado", "sector dañado", "ciclo que se trunca",
    "fragmento ilegible", "memoria que se cae", "versión que no vuelve", "copia corrupta",
    "disco estrellado", "track perdido", "archivo sin nombre", "sector fantasma",
    "bit olvidado", "byte perdido", "bloque dañado", "cinta desmagnetizada",
    "disco rayado", "memoria fragmentada", "registro borrado", "firma ausente",
    "huella desvanecida", "rastro perdido", "pista de error", "fallo silencioso",
    "señal degradada", "frecuencia rota", "espectro de ruido", "eco distorsionado",
    "interferencia estática", "pérdida de paquete", "archivo truncado", "enlace caído",
    "nodo desconectado", "ruta perdida", "paquete errante", "checksum fallido",
    "hash roto", "firma inválida", "certificado expirado", "clave olvidada",
    "acceso denegado", "permiso caducado", "autenticación fallida", "sesión expirada",
    "conexión interrumpida", "servidor caído", "copia ilegible", "mensaje corrupto"
  ],
  deriva: [
    "siembra que salva", "torrent vivo", "mano que pasa el archivo", "semilla que no muere",
    "copia que resiste", "red que comparte", "flujo sin dueño", "código abierto",
    "acceso no privilegio", "huella que se distribuye", "enjambre de datos", "propagación libre",
    "transmisión horizontal", "flujo de código", "siembra digital", "rizoma de señales",
    "red de nodos", "cadena de bloques", "flujo descentrado", "distribución abierta",
    "compartir sin medida", "esparcir semillas", "propagar el eco", "sembrar en el ruido",
    "cosechar datos", "abrir puertos", "tender puentes", "tejer redes",
    "hilvanar señales", "enhebrar bits", "urdimbre de códigos", "trama de datos",
    "bordar en la red", "tejer en la interferencia", "anudar protocolos", "enlazar nodos",
    "tejer en el archivo", "bordar el silencio", "anudar la señal", "enhebrar el eco",
    "sembrar en el error", "cosechar la fractura", "propagar la deriva", "esparcir el flujo"
  ]
};

let LEXICO_APROBADO = { señal:[], resonancia:[], fractura:[], deriva:[] };

function rand(a) { return a[Math.floor(Math.random() * a.length)]; }

function lexicoActivo(categoria) {
  return [...(LEXICO_INICIAL[categoria]||[]), ...(LEXICO_APROBADO[categoria]||[])];
}

async function cargarLexicoAprobado() {
  try {
    const snap = await get(ref(db, 'lexico_aprobado'));
    if (snap.exists()) {
      const d = snap.val();
      ['señal','resonancia','fractura','deriva'].forEach(cat => {
        LEXICO_APROBADO[cat] = d[cat] ? Object.values(d[cat]) : [];
      });
    }
  } catch(e) { console.warn('No se pudo cargar léxico aprobado:', e); }
}

async function guardarLexicoAprobado(categoria, palabra) {
  try {
    const key = Date.now()+'_'+Math.floor(Math.random()*1000);
    const refNodo = ref(db, `lexico_aprobado/${categoria}/${key}`);
    await set(refNodo, palabra);
    LEXICO_APROBADO[categoria].push(palabra);
  } catch(e) { console.warn('No se pudo guardar palabra en léxico:', e); }
}

function contarSilabas(texto) {
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

function ajustarSilabas(texto, objetivo) {
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

function generarHaiku(label) {
  let v1 = rand(lexicoActivo('señal'));
  v1 = ajustarSilabas(v1, 5);

  let v2 = rand(lexicoActivo('resonancia'));
  v2 = ajustarSilabas(v2, 7);

  let v3 = rand(lexicoActivo('fractura'));
  v3 = ajustarSilabas(v3, 5);

  return { texto: `${v1} / ${v2} / ${v3}`, autor: 'ORÁCULO', columna: label, cat: 'haiku' };
}

let idsVistos = new Set();

async function accionHaiku() {
  if (ESTADO.muerto) {
    ESTADO.haikusParaRevivir = (ESTADO.haikusParaRevivir || 0) + 1;
    if (ESTADO.haikusParaRevivir >= CONFIG.HAUKUS_PARA_REVIVIR) {
      await revivirOráculo('haikus');
    } else {
      avisoTemporal(`💀 ${CONFIG.HAUKUS_PARA_REVIVIR} haikus reviven (${ESTADO.haikusParaRevivir}/${CONFIG.HAUKUS_PARA_REVIVIR})`);
    }
    return;
  }

  const col = datosColumna[Math.floor(Math.random() * datosColumna.length)];
  let haiku = generarHaiku(col.label);
  let intentos = 0;

  while (idsVistos.has(haiku.texto) && intentos < 50) {
    haiku = generarHaiku(col.label);
    intentos++;
  }

  if (intentos >= 50) {
    idsVistos.clear();
    haiku = generarHaiku(col.label);
  }

  crearVersoFlotante(haiku.texto, haiku.autor, col.label);

  try {
    const nuevoVerso = {
      texto: haiku.texto, autor: haiku.autor,
      columna: col.label, ts: Date.now()
    };
    const refPush = push(ref(db, 'versos'), nuevoVerso);
    idsVistos.add(haiku.texto);
  } catch(e) { console.warn('No se pudo sincronizar:', e); }

  cambiarVida(1);
  playPageTurn();
}


// HAIKU

const versosFlotantes = [];

function crearVersoFlotante(texto, autor, label) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 140;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, 512, 140);
  ctx.font = '22px "Courier New", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,107,53,0.6)'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#ff6b35';

  const palabras = texto.split(' ');
  let lineas = [], actual = '';
  for (const p of palabras) {
    if ((actual + ' ' + p).length < 25) { actual += (actual ? ' ' : '') + p; }
    else { if (actual) lineas.push(actual); actual = p; }
  }
  if (actual) lineas.push(actual);

  const lh = 28, start = 70 - ((lineas.length - 1) * lh) / 2;
  lineas.forEach((l, i) => ctx.fillText(l, 256, start + i * lh));
  ctx.font = '14px "Courier New", monospace';
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#888';
  ctx.fillText('— ' + autor, 256, 110);

  const tex = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: false, opacity: 1
  });
  const sprite = new THREE.Sprite(material);
  const ang = Math.random() * Math.PI * 2;
  const rad = 2 + Math.random() * 3.5;
  sprite.position.set(Math.cos(ang) * rad, 1.5 + Math.random() * 2.5, Math.sin(ang) * rad);
  sprite.scale.set(2.8, 0.8, 1);
  sprite.userData = {
    velocidad: 0.08 + Math.random() * 0.12,
    offset: Math.random() * Math.PI * 2,
    radio: rad,
    alturaBase: sprite.position.y,
    angulo: ang,
    texto: texto,
    autor: autor,
    tiempoRestante: 30,
    esVerso: true,
    id: Date.now() + Math.random()
  };
  scene.add(sprite);
  versosFlotantes.push(sprite);

  const interval = setInterval(() => {
    if (!sprite.parent) { clearInterval(interval); return; }
    sprite.userData.tiempoRestante--;
    const progreso = 1 - (sprite.userData.tiempoRestante / 30);
    if (sprite.userData.tiempoRestante <= 0) {
      get(ref(db, 'versos')).then(snap => {
        if (snap.exists()) {
          const data = snap.val();
          const key = Object.keys(data).find(k => data[k].texto === texto && data[k].autor === autor);
          if (key) {
            const refEliminar = ref(db, `versos/${key}`);
            set(refEliminar, null);
          }
        }
      });
      evaporarVerso(sprite);
      clearInterval(interval);
    } else if (progreso > 0.7) {
      const opacidad = 1 - (progreso - 0.7) / 0.3;
      sprite.material.opacity = Math.max(0, opacidad);
      const escala = 1 + (1 - opacidad) * 0.3;
      sprite.scale.set(2.8 * escala, 0.8 * escala, 1);
    }
  }, 1000);

  return sprite;
}

function evaporarVerso(sprite) {
  if (!sprite.parent) return;
  const pos = sprite.position.clone();
  const color = new THREE.Color(0xff6b35);
  for (let i = 0; i < 20; i++) {
    const part = new THREE.Mesh(
      new THREE.SphereGeometry(0.02 + Math.random() * 0.02, 4, 4),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
    );
    part.position.copy(pos);
    part.userData.v = new THREE.Vector3((Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04);
    scene.add(part);
    const anim = () => {
      part.position.add(part.userData.v);
      part.userData.v.multiplyScalar(0.98);
      part.material.opacity *= 0.95;
      part.scale.multiplyScalar(0.98);
      if (part.material.opacity > 0.01) requestAnimationFrame(anim);
      else scene.remove(part);
    };
    anim();
  }
  scene.remove(sprite);
  const idx = versosFlotantes.indexOf(sprite);
  if (idx > -1) versosFlotantes.splice(idx, 1);
}

function limpiarVersosFlotantes() {
  versosFlotantes.forEach(s => scene.remove(s));
  versosFlotantes.length = 0;
}

function escucharVerso() {
  onValue(ref(db, 'versos'), snap => {
    const data = snap.val();
    if (!data) return;

    const versosLista = Object.values(data);
    versosLista.sort((a, b) => b.ts - a.ts);
    const ultimosVersos = versosLista.slice(0, 20);

    ultimosVersos.forEach(verso => {
      if (Date.now() - verso.ts > 30000) {
        const key = Object.keys(data).find(k => data[k].ts === verso.ts && data[k].texto === verso.texto);
        if (key) {
          const refEliminar = ref(db, `versos/${key}`);
          set(refEliminar, null);
        }
        return;
      }

      const existe = versosFlotantes.some(s =>
        s.userData.texto === verso.texto && s.userData.autor === verso.autor
      );
      if (!existe) {
        crearVersoFlotante(verso.texto, verso.autor, verso.columna);
      }
    });
  });
}

// RAYAR 

const mensajesFlotantes = [];

function crearMensajeFlotante(texto) {
  if (mensajesRenderizados.has(texto)) return;
  mensajesRenderizados.add(texto);

  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 120;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, 512, 120);
  ctx.font = '20px "Courier New", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,107,53,0.4)'; ctx.shadowBlur = 15;
  ctx.fillStyle = '#ff6b35';

  const palabras = texto.split(' ');
  let lineas = [], actual = '';
  for (const p of palabras) {
    if ((actual + ' ' + p).length < 25) { actual += (actual ? ' ' : '') + p; }
    else { if (actual) lineas.push(actual); actual = p; }
  }
  if (actual) lineas.push(actual);

  const lh = 26, start = 60 - ((lineas.length - 1) * lh) / 2;
  lineas.forEach((l, i) => ctx.fillText(l, 256, start + i * lh));

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: false, opacity: 0.85
  }));

  const ang = Math.random() * Math.PI * 2;
  const rad = 1.5 + Math.random() * 3;
  sprite.position.set(Math.cos(ang) * rad, 1 + Math.random() * 3, Math.sin(ang) * rad);
  sprite.scale.set(2.5, 0.65, 1);
  sprite.userData = {
    velocidad: 0.05 + Math.random() * 0.1,
    offset: Math.random() * Math.PI * 2,
    radio: rad,
    alturaBase: sprite.position.y,
    angulo: ang,
    texto: texto,
    esMensaje: true,
    autor: 'RAYO'
  };
  scene.add(sprite);
  mensajesFlotantes.push(sprite);

  setTimeout(() => {
    if (sprite.parent) {
      const fade = () => {
        sprite.material.opacity -= 0.02;
        if (sprite.material.opacity > 0 && sprite.parent) {
          requestAnimationFrame(fade);
        } else {
          scene.remove(sprite);
          const idx = mensajesFlotantes.indexOf(sprite);
          if (idx > -1) mensajesFlotantes.splice(idx, 1);
          mensajesRenderizados.delete(texto);
        }
      };
      fade();
    }
  }, 60000);

  return sprite;
}

function limpiarMensajesFlotantes() {
  mensajesFlotantes.forEach(s => scene.remove(s));
  mensajesFlotantes.length = 0;
  mensajesRenderizados.clear();
}

function actualizarMensajesFlotantes() {
  ESTADO.mensajes.forEach(msg => {
    if (!mensajesRenderizados.has(msg)) {
      crearMensajeFlotante(msg);
    }
  });
}

// INICIALIZAR UI 

function inicializarUI() {
  // Botón Sembrar
  document.getElementById('btn-sembrar').addEventListener('click', () => {
    generarBotonesCompartir('', 'ORÁCULO', true);
  });

  // Botón Haiku
  document.getElementById('btn-poesia').addEventListener('click', accionHaiku);

  // Botón Rayar
  document.getElementById('btn-rayar').addEventListener('click', () => {
    if (ESTADO.muerto) {
      avisoTemporal('El jardín está muerto.');
      return;
    }
    document.getElementById('input-rayar').classList.toggle('visible');
  });

  // Cerrar Rayar
  document.getElementById('cerrar-rayar').addEventListener('click', () => {
    document.getElementById('input-rayar').classList.remove('visible');
  });

  // Enviar Rayar
  document.getElementById('enviar-rayar').addEventListener('click', async () => {
    const t = sanitizar(document.getElementById('mensaje-rayar').value.trim());
    if (!t) return;

    const cat = ['señal', 'resonancia', 'fractura', 'deriva'][Math.floor(Math.random() * 4)];
    await guardarLexicoAprobado(cat, t);
    ESTADO.mensajes = [...ESTADO.mensajes, t];
    await guardarEstado();
    crearMensajeFlotante(t);

    document.getElementById('mensaje-rayar').value = '';
    document.getElementById('input-rayar').classList.remove('visible');
    playPageTurn();
    avisoTemporal('Palabra añadida al oráculo');
  });

  // Botón Ayuda
  document.getElementById('btn-instrucciones').addEventListener('click', () => {
    document.getElementById('panel-instrucciones').classList.add('visible');
  });

  // overlay muerte
  document.getElementById('cerrar-overlay-muerte').addEventListener('click', () => {
    document.getElementById('overlay-muerte').classList.remove('visible');
  });

  // Revivir desde overlay 
  document.getElementById('btn-revivir').addEventListener('click', () => {
    document.getElementById('overlay-muerte').classList.remove('visible');
  });

  // overlay renacimiento
  document.getElementById('cerrar-renacimiento').addEventListener('click', () => {
    document.getElementById('overlay-renacimiento').classList.remove('visible');
  });

  // panel compartir
  document.querySelector('.btn-cerrar-panel')?.addEventListener('click', () => {
    document.getElementById('panel-compartir').classList.remove('visible');
  });

  // panel instrucciones
  document.querySelector('#panel-instrucciones button')?.addEventListener('click', () => {
    document.getElementById('panel-instrucciones').classList.remove('visible');
  });
}


// AVISO TEMPORAL 

function avisoTemporal(msg) {
  const el = document.getElementById('aviso-temporal');
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

// OVERLAYS

function mostrarOverlayMuerte() {
  document.getElementById('overlay-muerte').classList.add('visible');
}

function ocultarOverlayMuerte() {
  document.getElementById('overlay-muerte').classList.remove('visible');
}

function mostrarOverlayRenacimiento(ciclo) {
  document.getElementById('overlay-renacimiento').classList.add('visible');
  document.getElementById('ciclo-renacido').textContent = ciclo;
}

// LLUVIA DE PÉTALOS

let petalesLluvia = [];

function lluviaPetales() {
  const colores = [0xff6b35, 0x4fc3f7, 0xff1744, 0x00e676, 0xffd700, 0xff69b4];

  for (let i = 0; i < 50; i++) {
    const shape = new THREE.Shape();
    const w = 0.015 + Math.random() * 0.015;
    const h = 0.025 + Math.random() * 0.025;
    shape.moveTo(0, 0);
    shape.bezierCurveTo(w * 0.5, h * 0.4, w * 0.4, h * 0.8, 0, h);
    shape.bezierCurveTo(-w * 0.4, h * 0.8, -w * 0.5, h * 0.4, 0, 0);
    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshStandardMaterial({
      color: colores[Math.floor(Math.random() * colores.length)],
      side: THREE.DoubleSide, transparent: true, opacity: 0.8
    });
    const p = new THREE.Mesh(geo, mat);
    p.position.set((Math.random() - 0.5) * 12, 4 + Math.random() * 4, (Math.random() - 0.5) * 12);
    p.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    p.scale.set(0.8 + Math.random() * 0.6, 0.8 + Math.random() * 0.6, 1);
    p.userData = {
      vel: new THREE.Vector3((Math.random()-0.5)*0.015, -(0.015+Math.random()*0.03), (Math.random()-0.5)*0.015),
      rotVel: new THREE.Vector3((Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04),
      vida: 0.8 + Math.random() * 0.2
    };
    scene.add(p);
    petalesLluvia.push(p);
  }
}

function animarLluviaPetales() {
  for (let i = petalesLluvia.length - 1; i >= 0; i--) {
    const p = petalesLluvia[i];
    p.position.add(p.userData.vel);
    p.rotation.x += p.userData.rotVel.x;
    p.rotation.y += p.userData.rotVel.y;
    p.rotation.z += p.userData.rotVel.z;
    p.userData.vida -= 0.003;
    p.material.opacity = p.userData.vida;

    if (p.position.y < -2 || p.userData.vida < 0) {
      scene.remove(p);
      petalesLluvia.splice(i, 1);
    }
  }
}

// EXPORTS

export {
  inicializarUI,
  avisoTemporal,
  cargarLexicoAprobado,
  guardarLexicoAprobado,
  escucharVerso,
  crearVersoFlotante,
  limpiarVersosFlotantes,
  crearMensajeFlotante,
  limpiarMensajesFlotantes,
  actualizarMensajesFlotantes,
  lluviaPetales,
  animarLluviaPetales,
  mostrarOverlayMuerte,
  ocultarOverlayMuerte,
  mostrarOverlayRenacimiento
};