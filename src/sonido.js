
// IMPORTS //
import { ESTADO } from './estado-jardin.js';
import { columnas, columnasMovimiento, camera } from './escena-3d.js';

// VARIABLES GLOBALES DE AUDIO //
let audioCtx = null;
let masterGain = null;
let vocesColumna = [];
let schedulerId = null;
let listenerFrame = 0;
let ultimaProgresion = -1;
const TODAS_NOTAS = [0,1,2,3,4,5,6,7,8,9,10,11];
let ordenNotas = [...TODAS_NOTAS];

// FUNCIONES AUXILIARES DEL SISTEMA MUSICAL //
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function proximaProgresion() {
  if (ultimaProgresion === -1 || ordenNotas.length < 3) {
    ordenNotas = shuffleArray([...TODAS_NOTAS]);
    ultimaProgresion = 0;
  }
  const num = 3 + Math.floor(Math.random() * 2);
  const inicio = ultimaProgresion % ordenNotas.length;
  const notas = [];
  for (let i = 0; i < num; i++) {
    notas.push(ordenNotas[(inicio + i) % ordenNotas.length]);
  }
  ultimaProgresion = (inicio + num) % ordenNotas.length;
  if (ultimaProgresion + 3 >= ordenNotas.length) {
    ordenNotas = shuffleArray([...TODAS_NOTAS]);
    ultimaProgresion = 0;
  }
  return notas;
}

// FACTOR DE SALUD //
function factorSalud() {
  if (ESTADO.muerto) return 0;
  return Math.max(0.12, Math.min(1, ESTADO.integridad / 100));
}

function evolucionLenta() {
  if (!audioCtx) return 0.5;
  return (Math.sin(audioCtx.currentTime * 0.0075) + 1) / 2;
}

// INICIALIZAR AUDIO //
export function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.0001;
      masterGain.connect(audioCtx.destination);
      crearVocesColumna();
      console.log('🔊 Audio iniciado');
    } catch(e) { console.warn('Error de audio:', e); return; }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => iniciarScheduler()).catch(() => {});
  } else {
    iniciarScheduler();
  }
}

// VOCES CADA COLUMNA //
function crearVocesColumna() {
  if (!audioCtx) return;
  vocesColumna = columnas.map(col => {
    const panner = audioCtx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 2.0;
    panner.maxDistance = 18;
    panner.rolloffFactor = 1.2;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;
    if (panner.positionX) {
      panner.positionX.value = col.position.x;
      panner.positionY.value = 2.5;
      panner.positionZ.value = col.position.z;
    } else if (panner.setPosition) {
      panner.setPosition(col.position.x, 2.5, col.position.z);
    }
    const voiceGain = audioCtx.createGain();
    voiceGain.gain.value = 1;
    panner.connect(voiceGain);
    voiceGain.connect(masterGain);
    return { col, panner, voiceGain, proximoTiempo: audioCtx.currentTime + Math.random() * 2 };
  });
}

// TOCAR NOTA COLUMNA //
function tocarNotaColumna(voz, tiempo) {
  const d = voz.col.userData;
  const escala = d.escala || [220, 246, 293, 329, 392, 440];
  const salud = factorSalud();
  const evo = evolucionLenta();
  const notas = proximaProgresion();
  const notaBase = notas[Math.floor(Math.random() * notas.length)];
  let baseFreq = escala[notaBase % escala.length] || 220;

  const intervalo = [0, 2, 4, 7, 9, 12][Math.floor(Math.random() * 6)];
  const freq = baseFreq * Math.pow(2, intervalo / 12) * (Math.random() < 0.2 ? 2 : 1);
  const dur = 1.3 + evo * 1.8 + Math.random() * 1.2;
  const vol = 0.08 + salud * 0.12;

  const osc = audioCtx.createOscillator();
  osc.type = d.onda || 'sine';
  osc.frequency.setValueAtTime(freq, tiempo);
  const ng = audioCtx.createGain();
  ng.gain.setValueAtTime(0.0001, tiempo);
  ng.gain.exponentialRampToValueAtTime(vol, tiempo + 0.25);
  ng.gain.exponentialRampToValueAtTime(0.0001, tiempo + dur);
  osc.connect(ng);
  ng.connect(voz.panner);
  osc.start(tiempo);
  osc.stop(tiempo + dur + 0.1);

  if (salud > 0.4 && Math.random() < (0.3 + evo * 0.3)) {
    const freq2 = freq * (1 + (Math.random() * 0.05 + 0.03));
    const osc2 = audioCtx.createOscillator();
    osc2.type = d.onda || 'sine';
    osc2.frequency.setValueAtTime(freq2, tiempo + 0.1);
    const g2 = audioCtx.createGain();
    g2.gain.setValueAtTime(0.0001, tiempo + 0.1);
    g2.gain.exponentialRampToValueAtTime(vol * 0.5, tiempo + 0.4);
    g2.gain.exponentialRampToValueAtTime(0.0001, tiempo + dur);
    osc2.connect(g2);
    g2.connect(voz.panner);
    osc2.start(tiempo + 0.1);
    osc2.stop(tiempo + dur + 0.2);
  }
}

const LOOKAHEAD = 0.22;

function scheduleTick() {
  if (!audioCtx || ESTADO.muerto) return;
  const ahora = audioCtx.currentTime;
  vocesColumna.forEach(voz => {
    if (voz.proximoTiempo < ahora + LOOKAHEAD) {
      tocarNotaColumna(voz, Math.max(voz.proximoTiempo, ahora + 0.02));
      const salud = factorSalud();
      const evo = evolucionLenta();
      const base = 3.2 / (0.4 + salud);
      voz.proximoTiempo += base * (0.6 + Math.random() * 0.8 + evo * 0.5);
    }
  });
}

function iniciarScheduler() {
  if (schedulerId) return;
  schedulerId = setInterval(scheduleTick, 120);
  actualizarMasterGain();
}

// VOLUMEN GENERAL //
export function actualizarMasterGain() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const objetivo = ESTADO.muerto ? 0.0001 : 0.35 + factorSalud() * 0.35;
  masterGain.gain.cancelScheduledValues(t);
  masterGain.gain.setValueAtTime(masterGain.gain.value, t);
  masterGain.gain.linearRampToValueAtTime(objetivo, t + 1.5);
  if (ESTADO.muerto) {
    if (schedulerId) { clearInterval(schedulerId); schedulerId = null; }
  } else if (!schedulerId) iniciarScheduler();
}

// SONIDO ELEMENTOS INDIVIDUALES //
export function tocarSonidoElemento(elemento) {
  if (!audioCtx || audioCtx.state === 'closed' || !masterGain) return;
  try {
    const ud = elemento.userData;
    const freq = ud.nota;
    const columna = ud.columna;
    const ahora = audioCtx.currentTime;

    let tipoOnda = 'sine', duracion = 0.3, volumen = 0.06;

    switch(columna) {
      case 'SEÑAL': tipoOnda = 'square'; duracion = 0.25; volumen = 0.05; break;
      case 'RESONANCIA': tipoOnda = 'sawtooth'; duracion = 0.4; volumen = 0.07; break;
      case 'FRACTURA': tipoOnda = 'sine'; duracion = 0.2 + Math.random() * 0.2; volumen = 0.04 + Math.random() * 0.04; break;
      case 'DERIVA': tipoOnda = 'triangle'; duracion = 0.3 + Math.random() * 0.3; volumen = 0.05 + Math.random() * 0.03; break;
      default: tipoOnda = 'sine'; duracion = 0.3; volumen = 0.06;
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tipoOnda;
    osc.frequency.setValueAtTime(freq, ahora);
    gain.gain.setValueAtTime(volumen, ahora);
    gain.gain.exponentialRampToValueAtTime(0.001, ahora + duracion);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ahora);
    osc.stop(ahora + duracion);

    if (Math.random() > 0.3) {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.0, ahora);
      gain2.gain.setValueAtTime(volumen * 0.2, ahora);
      gain2.gain.exponentialRampToValueAtTime(0.001, ahora + duracion * 0.5);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(ahora);
      osc2.stop(ahora + duracion * 0.5);
    }
  } catch(e) { console.warn('Error al tocar sonido:', e); }
}

// FUNCIONES SONIDO EVENTOS //
export function playSound(freqs, dur = 0.3, vol = 0.06) {
  if (!audioCtx || audioCtx.state === 'closed' || !masterGain) return;
  const emitir = () => {
    if (!audioCtx || audioCtx.state !== 'running' || !masterGain) return;
    const nivel = ESTADO.muerto ? vol * 0.1 : vol;
    try {
      const ahora = audioCtx.currentTime;
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * (1 + i * 0.01), ahora);
        g.gain.setValueAtTime(Math.max(0.0001, nivel / freqs.length), ahora);
        g.gain.exponentialRampToValueAtTime(0.001, ahora + dur);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(ahora);
        osc.stop(ahora + dur);
      });
    } catch(e) {}
  };
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => { actualizarMasterGain(); emitir(); }).catch(() => {});
  } else {
    emitir();
  }
}

export function playPageTurn() { playSound([400,500], 0.2, 0.04); }
export function playPop() { playSound([800,1000], 0.15, 0.06); }
export function playRenacimiento() { playSound([300,500,700,900], 1.5, 0.08); }

// POSICIÓN DEL OYENTE //
export function actualizarListener() {
  if (!audioCtx) return;
  const l = audioCtx.listener;
  const p = camera.position;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  try {
    if (l.setPosition) {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(dir.x, dir.y, dir.z, 0, 1, 0);
    } else if (l.positionX) {
      const t = audioCtx.currentTime;
      l.positionX.setValueAtTime(p.x, t);
      l.positionY.setValueAtTime(p.y, t);
      l.positionZ.setValueAtTime(p.z, t);
      l.forwardX.setValueAtTime(dir.x, t);
      l.forwardY.setValueAtTime(dir.y, t);
      l.forwardZ.setValueAtTime(dir.z, t);
      l.upX.setValueAtTime(0, t);
      l.upY.setValueAtTime(1, t);
      l.upZ.setValueAtTime(0, t);
    }
  } catch(e) {}
}

console.log('🎵 Módulo de sonido cargado');