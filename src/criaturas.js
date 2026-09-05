

import * as THREE from 'three';
import { scene } from './escena-3d.js';
import { versosFlotantes } from './flotantes.js';
import { ESTADO } from './estado-jardin.js';
import { ref, push, onValue } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';

console.log('🔄 Cargando criaturas.js (xilófono armónico + especies diferenciadas)...');

var CONFIG = {
  MAX_MUSHIS: 10,
  MAX_KAKUS: 12,
  INTERVALO_MUSHI: 18000,
  VIDA_MUSHI: 500,
  VIDA_KAKU: 420,
  RADIO_JARDIN: 7,
  VOLUMEN_CRIATURA: 0.18,
  TAMANO_BASE: 0.2,
};

var mushis = [];
var kakus = [];
var ultimoMushi = Date.now();
var tiempoGlobal = 0;

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = import('./main.js').then(module => module.db);
  }
  return dbPromise;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function semillaAleatoria() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function generarSemillaDesdeTexto(texto) {
  return hashString(texto) + Date.now() % 1000;
}

const ESCALA_CRIATURAS = [
  32.70, 36.71, 38.89, 43.65, 48.99, 51.91,
  65.41, 73.42, 77.78, 87.31, 97.99, 103.83,
  130.81, 146.83, 155.56, 174.61, 195.99, 207.65,
  261.63, 293.66, 311.13, 349.23, 392.00, 415.30,
];

function generarIdentidad(seed, tipo) {
  const s = (n) => {
    const x = Math.sin(seed + n * 127.1 + n * 311.7) * 43758.5453123;
    return x - Math.floor(x);
  };

  const rango = (min, max, n) => min + s(n) * (max - min);

  const mode = s(25) < 0.5 ? 'air' : 'ground';

  const morphology = {
    segments: Math.floor(rango(3, 7, 1)),
    limbs: Math.floor(rango(4, 7, 2)),
    limbLength: rango(0.5, 1.6, 3),
    asymmetry: rango(0.3, 0.9, 4),
    bodyScale: rango(0.6, 1.3, 5),
    appendages: Math.floor(rango(2, 5, 6)),
    colorHue: rango(0, 1, 7),
    colorSat: rango(0.7, 0.95, 8),
    colorLight: rango(0.7, 0.95, 9),
    opacity: rango(0.8, 1.0, 10),
    colorShift: mode === 'ground' ? 0.05 : -0.05,
  };

  const movement = {
    speed: rango(0.4, 1.4, 11),
    hesitation: rango(0.3, 1.8, 12),
    directionality: rango(0.2, 0.9, 13),
    reaction: rango(0.3, 0.9, 14),
    wanderRadius: rango(2, 6, 15),
    flotationAmp: rango(0.1, 0.4, 16),
    flotationFreq: rango(0.2, 0.8, 17),
    mode: mode,
    groundHeight: rango(0.05, 0.4, 18),
    airHeightMin: rango(0.8, 2.0, 19),
    airHeightMax: rango(2.5, 4.5, 20),
  };

  const roles = ['campana', 'rasguido', 'percusión', 'vibrato', 'glitch', 'armónico'];
  const rol = roles[Math.floor(rango(0, roles.length, 21))];
  const escalaIndex = Math.floor(rango(0, ESCALA_CRIATURAS.length - 1, 22));
  const freqBase = ESCALA_CRIATURAS[escalaIndex] * (1 + (tipo === 'kaku' ? 2 : 1));

  const sound = {
    freqBase: freqBase,
    rol: rol,
    decay: rango(0.1, 0.6, 23),
    interval: rango(1.2, 4.5, 24),
    volume: rango(0.08, 0.18, 25),
  };

  const angulo = Math.random() * Math.PI * 2;
  const radio = 1.5 + Math.random() * (CONFIG.RADIO_JARDIN - 1.5);
  const yBase = mode === 'ground' 
    ? 0.1 + Math.random() * 0.4 
    : 0.8 + Math.random() * 3.0;
  const posicion = new THREE.Vector3(
    Math.cos(angulo) * radio,
    yBase,
    Math.sin(angulo) * radio
  );

  return {
    seed,
    tipo,
    morphology,
    movement,
    sound,
    posicion,
  };
}

function construirCriatura(identidad) {
  const { morphology, movement, sound, posicion, seed, tipo } = identidad;
  const group = new THREE.Group();
  group.position.copy(posicion);

  const hue = (morphology.colorHue + morphology.colorShift) % 1;
  const color = new THREE.Color().setHSL(
    hue,
    morphology.colorSat,
    morphology.colorLight
  );
  const colorSec = new THREE.Color().setHSL(
    (hue + 0.2) % 1,
    morphology.colorSat * 0.9,
    morphology.colorLight * 0.8
  );

  const matCuerpo = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.15,
    roughness: 0.5,
    metalness: 0.1,
    transparent: true,
    opacity: morphology.opacity,
    depthWrite: false,
  });

  const matExtremidad = new THREE.MeshStandardMaterial({
    color: colorSec,
    emissive: colorSec,
    emissiveIntensity: 0.1,
    roughness: 0.6,
    metalness: 0.0,
    transparent: true,
    opacity: morphology.opacity * 0.9,
    depthWrite: false,
  });

  const baseSize = CONFIG.TAMANO_BASE;
  const bodyScale = morphology.bodyScale * baseSize * 0.15;

  const bodyGeo = new THREE.SphereGeometry(bodyScale, 6, 6);
  bodyGeo.scale(
    1 + (morphology.asymmetry - 0.5) * 0.5,
    1 + (morphology.asymmetry - 0.5) * 0.4,
    1 + (morphology.asymmetry - 0.5) * 0.6
  );
  const body = new THREE.Mesh(bodyGeo, matCuerpo);
  body.castShadow = false;
  group.add(body);

  const numSegments = morphology.segments;
  for (let i = 0; i < numSegments; i++) {
    const segScale = bodyScale * (0.4 + Math.sin(i * 1.7 + seed) * 0.25);
    const segGeo = new THREE.SphereGeometry(segScale, 5, 5);
    const seg = new THREE.Mesh(segGeo, matCuerpo);
    const ang = (i / numSegments) * Math.PI * 2 + seed * 0.1;
    const rad = bodyScale * (0.7 + Math.sin(i * 2.3 + seed) * 0.4);
    seg.position.set(
      Math.cos(ang) * rad * (0.8 + morphology.asymmetry * 0.3),
      Math.sin(ang * 1.3) * rad * 0.6,
      Math.sin(ang) * rad * (0.8 + morphology.asymmetry * 0.3)
    );
    seg.rotation.set(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5);
    group.add(seg);
  }

  const numLimbs = morphology.limbs;
  const limbLength = morphology.limbLength * baseSize * 0.4;
  for (let i = 0; i < numLimbs; i++) {
    const ang = (i / numLimbs) * Math.PI * 2 + seed * 0.3;
    const rad = bodyScale * (1.3 + Math.sin(i * 1.1 + seed) * 0.4);

    const segments = 2 + Math.floor(Math.sin(i * 2.7 + seed) * 1.5);
    let currentPos = new THREE.Vector3(
      Math.cos(ang) * rad,
      Math.sin(ang * 1.7) * rad * 0.4,
      Math.sin(ang) * rad
    );
    let currentDir = new THREE.Vector3(
      Math.cos(ang),
      Math.sin(ang * 1.3) * 0.4,
      Math.sin(ang)
    ).normalize();

    for (let s = 0; s < segments; s++) {
      const segLen = limbLength * (0.5 + Math.sin(s * 2.1 + i + seed) * 0.4);
      const segRad = bodyScale * 0.08 * (1 - s * 0.15);

      const cylGeo = new THREE.CylinderGeometry(segRad, segRad * 0.8, segLen, 5);
      const cyl = new THREE.Mesh(cylGeo, matExtremidad);
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, currentDir);
      cyl.quaternion.copy(quat);
      cyl.position.copy(currentPos.clone().add(currentDir.clone().multiplyScalar(segLen * 0.5)));

      cyl.userData = {
        esExtremidad: true,
        fase: (s + i) * 1.7 + seed,
        amplitud: 0.3 + Math.sin(i * 2.3 + seed) * 0.2,
        velocidad: 0.8 + Math.sin(i * 1.1 + seed) * 0.5,
        tipo: 'segmento'
      };
      group.add(cyl);

      const nodeGeo = new THREE.SphereGeometry(segRad * 2, 4, 4);
      const node = new THREE.Mesh(nodeGeo, matCuerpo);
      node.position.copy(currentPos.clone().add(currentDir.clone().multiplyScalar(segLen)));
      group.add(node);

      currentPos.add(currentDir.clone().multiplyScalar(segLen));
      const newAng = ang + (s + 1) * 0.6 + seed * 0.1;
      const newDir = new THREE.Vector3(
        Math.cos(newAng),
        Math.sin(newAng * 1.3) * 0.4,
        Math.sin(newAng)
      ).normalize();
      currentDir.lerp(newDir, 0.4 + morphology.asymmetry * 0.4);
      currentDir.normalize();
    }
  }

  const numAppendages = morphology.appendages;
  for (let i = 0; i < numAppendages; i++) {
    const ang = (i / numAppendages) * Math.PI * 2 + seed * 0.7;
    const rad = bodyScale * (1.4 + Math.sin(i * 1.3 + seed) * 0.4);
    const len = limbLength * (0.6 + Math.sin(i * 2.1 + seed) * 0.4);

    const pts = [];
    for (let t = 0; t <= 1; t += 0.2) {
      const p = new THREE.Vector3(
        Math.cos(ang + t * 0.8) * (rad + t * len),
        Math.sin(ang * 1.3 + t * 0.5) * (rad + t * len) * 0.4,
        Math.sin(ang + t * 0.8) * (rad + t * len)
      );
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 8, bodyScale * 0.04, 5, false);
    const tube = new THREE.Mesh(tubeGeo, matExtremidad);
    tube.userData = {
      esExtremidad: true,
      fase: (i * 0.9 + seed) * 2.1,
      amplitud: 0.35 + Math.sin(i * 1.7 + seed) * 0.2,
      velocidad: 0.6 + Math.sin(i * 1.3 + seed) * 0.4,
      tipo: 'tubo'
    };
    group.add(tube);
  }

  group.userData = {
    identidad,
    movimiento: {
      objetivo: posicion.clone(),
      tiempoCambio: 0,
      fase: Math.random() * Math.PI * 2,
      velocidadActual: 0,
    },
    sonido: null,
  };

  return group;
}

function crearSonidoCriatura(identidad, audioContext) {
  if (!audioContext) return null;
  const { sound } = identidad;

  const freqBase = sound.freqBase;
  const rol = sound.rol;
  const decay = sound.decay;
  const interval = sound.interval;
  const volume = sound.volume * CONFIG.VOLUMEN_CRIATURA;

  let nextSoundTime = audioContext.currentTime + Math.random() * interval;

  const panner = audioContext.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 1.0;
  panner.maxDistance = 20;
  panner.rolloffFactor = 1.0;
  panner.connect(audioContext.destination);

  function playNote(now, pos) {
    let oscType = 'sine';
    let filterType = 'lowpass';
    let filterFreq = freqBase * 2.5;
    let filterQ = 1;

    switch (rol) {
      case 'campana':
        oscType = 'sine';
        filterFreq = freqBase * 3;
        filterQ = 0.8;
        break;
      case 'rasguido':
        oscType = 'sawtooth';
        filterFreq = freqBase * 1.2;
        filterQ = 1.5;
        break;
      case 'percusión':
        oscType = 'square';
        filterFreq = freqBase * 1.0;
        filterQ = 2;
        break;
      case 'vibrato':
        oscType = 'triangle';
        filterFreq = freqBase * 2;
        filterQ = 1;
        break;
      case 'glitch':
        oscType = 'square';
        filterFreq = freqBase * 0.8;
        filterQ = 3;
        break;
      case 'armónico':
        oscType = 'sine';
        filterFreq = freqBase * 4;
        filterQ = 0.6;
        break;
      default:
        oscType = 'sine';
        filterFreq = freqBase * 2;
        filterQ = 1;
    }

    const osc = audioContext.createOscillator();
    osc.type = oscType;
    osc.frequency.setValueAtTime(freqBase * (0.99 + Math.random() * 0.02), now);

    const gain = audioContext.createGain();
    const duration = decay * (0.7 + Math.random() * 0.6);
    const vol = volume * (0.7 + Math.random() * 0.6);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(vol * 0.6, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const filter = audioContext.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(filterQ, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);

    if (pos) {
      panner.positionX.value = pos.x;
      panner.positionY.value = pos.y + 0.5;
      panner.positionZ.value = pos.z;
    }

    osc.start(now);
    osc.stop(now + duration);

    if (Math.random() < 0.3) {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.type = oscType;
      osc2.frequency.setValueAtTime(freqBase * (1.5 + Math.random() * 0.5), now);
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.exponentialRampToValueAtTime(vol * 0.3, now + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.5);
      osc2.connect(gain2);
      gain2.connect(panner);
      osc2.start(now);
      osc2.stop(now + duration * 0.5);
    }

    setTimeout(() => {
      try {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch(e) {}
    }, duration * 1000 + 50);
  }

  function scheduleNext(now) {
    const intervalVar = interval * (0.7 + Math.random() * 0.6);
    nextSoundTime = now + intervalVar;
  }

  function update(time, pos, velocidad, vidaRestante) {
    if (!audioContext) return;
    const ahora = audioContext.currentTime;

    const velocidadNorm = Math.min(1, velocidad * 2);
    const probExtra = velocidadNorm * 0.3;

    if (ahora >= nextSoundTime || (velocidadNorm > 0.3 && Math.random() < 0.05)) {
      playNote(ahora, pos);
      scheduleNext(ahora);
    }

    panner.positionX.value = pos.x;
    panner.positionY.value = pos.y + 0.5;
    panner.positionZ.value = pos.z;
  }

  return {
    panner,
    update,
    detener: () => {
      try {
        panner.disconnect();
      } catch(e) {}
    }
  };
}

function crearMushi() {
  if (mushis.length >= CONFIG.MAX_MUSHIS) return;
  if (ESTADO.muerto) return;
  if (ESTADO.vida < 10) return;

  const cantidad = Math.random() < 0.1 ? 2 : 1;
  const cantidadReal = Math.min(cantidad, CONFIG.MAX_MUSHIS - mushis.length);

  for (let i = 0; i < cantidadReal; i++) {
    const seed = semillaAleatoria();
    const identidad = generarIdentidad(seed, 'mushi');
    const grupo = construirCriatura(identidad);
    scene.add(grupo);

    let sonido = null;
    if (window.audioContext) {
      try {
        sonido = crearSonidoCriatura(identidad, window.audioContext);
      } catch (e) {
        console.warn('Error al crear sonido para Mushi:', e);
      }
    }

    const entry = {
      grupo,
      identidad,
      sonido,
      vida: CONFIG.VIDA_MUSHI * (0.7 + Math.random() * 0.6),
      objetivo: grupo.position.clone(),
      tiempoCambio: 0,
    };
    mushis.push(entry);
  }

  ultimoMushi = Date.now();
  console.log(`🐛 ${cantidadReal} Mushi(s) nacido(s)`);
}

function crearKaku(texto) {
  if (kakus.length >= CONFIG.MAX_KAKUS) return;
  if (ESTADO.muerto) return;

  const cantidad = 1;
  const cantidadReal = Math.min(cantidad, CONFIG.MAX_KAKUS - kakus.length);

  for (let i = 0; i < cantidadReal; i++) {
    const seed = generarSemillaDesdeTexto(texto + i);
    const identidad = generarIdentidad(seed, 'kaku');
    const grupo = construirCriatura(identidad);

    const verso = versosFlotantes[versosFlotantes.length - 1];
    if (verso) {
      grupo.position.copy(verso.position);
      grupo.position.x += (Math.random() - 0.5) * 0.8;
      grupo.position.z += (Math.random() - 0.5) * 0.8;
      grupo.position.y += 0.5 + Math.random() * 0.6;
    }

    scene.add(grupo);

    let sonido = null;
    if (window.audioContext) {
      try {
        sonido = crearSonidoCriatura(identidad, window.audioContext);
      } catch (e) {
        console.warn('Error al crear sonido para Kaku:', e);
      }
    }

    const entry = {
      grupo,
      identidad,
      sonido,
      texto,
      vida: CONFIG.VIDA_KAKU * (0.7 + Math.random() * 0.6),
      objetivo: grupo.position.clone(),
      tiempoCambio: 0,
    };
    kakus.push(entry);

    getDb().then(db => {
      const kakuData = {
        texto: texto,
        semilla: seed,
        posicion: grupo.position.toArray(),
        timestamp: Date.now(),
      };
      push(ref(db, 'poesia/kakus'), kakuData).catch(err => {
        console.warn('Error al guardar Kaku en Firebase:', err);
      });
    });
  }

  console.log(`✍️ ${cantidadReal} Kaku(s) nacido(s) desde: "${texto}"`);
}

export function escucharKakus() {
  getDb().then(db => {
    const dbKakus = ref(db, 'poesia/kakus');
    onValue(dbKakus, snap => {
      const data = snap.val();
      if (!data) return;

      const kakusLista = Object.values(data);
      kakusLista.sort((a, b) => a.timestamp - b.timestamp);
      const ultimos = kakusLista.slice(-CONFIG.MAX_KAKUS);

      ultimos.forEach(kakuData => {
        const existe = kakus.some(k => k.identidad.seed === kakuData.semilla);
        if (!existe && kakuData.semilla) {
          const identidad = generarIdentidad(kakuData.semilla, 'kaku');
          const grupo = construirCriatura(identidad);
          if (kakuData.posicion && kakuData.posicion.length === 3) {
            grupo.position.fromArray(kakuData.posicion);
          }
          scene.add(grupo);

          let sonido = null;
          if (window.audioContext) {
            try {
              sonido = crearSonidoCriatura(identidad, window.audioContext);
            } catch (e) { /* ignorar */ }
          }

          kakus.push({
            grupo,
            identidad,
            sonido,
            texto: kakuData.texto || 'desconocido',
            vida: CONFIG.VIDA_KAKU * (0.7 + Math.random() * 0.6),
            objetivo: grupo.position.clone(),
            tiempoCambio: 0,
          });
          console.log('🔄 Kaku sincronizado desde Firebase');
        }
      });

      const semillasRemotas = new Set(ultimos.map(d => d.semilla));
      for (let i = kakus.length - 1; i >= 0; i--) {
        if (!semillasRemotas.has(kakus[i].identidad.seed)) {
          if (kakus[i].sonido) kakus[i].sonido.detener();
          scene.remove(kakus[i].grupo);
          kakus.splice(i, 1);
        }
      }
    });
  }).catch(err => {
    console.warn('No se pudo conectar a Firebase para escuchar kakus:', err);
  });
}

export function actualizarCriaturas(time) {
  if (typeof CONFIG === 'undefined') return;

  tiempoGlobal = time;

  if (ESTADO.muerto) {
    mushis.forEach(m => {
      if (m.sonido) m.sonido.detener();
      scene.remove(m.grupo);
    });
    mushis.length = 0;
    kakus.forEach(k => {
      if (k.sonido) k.sonido.detener();
      scene.remove(k.grupo);
    });
    kakus.length = 0;
    return;
  }

  const ahora = Date.now();
  if (ahora - ultimoMushi > CONFIG.INTERVALO_MUSHI && mushis.length < CONFIG.MAX_MUSHIS) {
    if (ESTADO.vida > 10 && Math.random() < 0.4) {
      crearMushi();
    }
  }

  for (let i = mushis.length - 1; i >= 0; i--) {
    const m = mushis[i];
    m.vida -= 0.008;

    const grupo = m.grupo;
    const pos = grupo.position;
    const ident = m.identidad;
    const mov = ident.movement;

    m.tiempoCambio += 0.016;
    if (m.tiempoCambio > 3 + mov.hesitation * 5) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 1.5 + Math.random() * (CONFIG.RADIO_JARDIN - 1.5);
      const yBase = mov.mode === 'ground' 
        ? mov.groundHeight 
        : mov.airHeightMin + Math.random() * (mov.airHeightMax - mov.airHeightMin);
      m.objetivo.set(
        Math.cos(ang) * rad,
        yBase,
        Math.sin(ang) * rad
      );
      m.tiempoCambio = 0;
    }

    const speed = 0.005 + mov.speed * 0.015;
    pos.x += (m.objetivo.x - pos.x) * speed;
    pos.z += (m.objetivo.z - pos.z) * speed;

    if (mov.mode === 'ground') {
      const targetY = mov.groundHeight + Math.sin(time * mov.flotationFreq + m.tiempoCambio) * mov.flotationAmp * 0.15;
      pos.y += (targetY - pos.y) * 0.02;
    } else {
      const amp = mov.flotationAmp;
      const freq = mov.flotationFreq;
      const baseY = mov.airHeightMin + (mov.airHeightMax - mov.airHeightMin) * (0.5 + 0.5 * Math.sin(time * 0.1 + ident.seed));
      pos.y = baseY + Math.sin(time * freq + m.tiempoCambio) * amp;
    }

    grupo.rotation.x += 0.001 * mov.directionality;
    grupo.rotation.y += 0.002 * mov.directionality;
    grupo.rotation.z += 0.001 * mov.directionality;

    const breath = 1 + Math.sin(time * 0.5 + ident.seed) * 0.03;
    grupo.scale.set(breath, breath, breath);

    grupo.children.forEach(child => {
      if (child.userData && child.userData.esExtremidad) {
        const ud = child.userData;
        const ang = Math.sin(time * ud.velocidad + ud.fase) * ud.amplitud;
        if (ud.tipo === 'segmento') {
          child.rotation.x = ang * 1.0;
          child.rotation.z = Math.cos(time * ud.velocidad * 0.7 + ud.fase) * ud.amplitud * 0.6;
        } else if (ud.tipo === 'tubo') {
          child.rotation.y = ang * 1.5;
          child.rotation.x = Math.sin(time * ud.velocidad * 0.5 + ud.fase) * ud.amplitud * 1.0;
        }
      }
    });

    if (m.sonido) {
      const velocidad = 0.5 + Math.abs(pos.x - m.objetivo.x) * 2 + Math.abs(pos.z - m.objetivo.z) * 2;
      m.sonido.update(time, pos, velocidad, m.vida);
    }

    if (m.vida <= 0) {
      if (m.sonido) {
        m.sonido.detener();
      }
      grupo.children.forEach(child => {
        if (child.material) {
          child.material.opacity *= 0.98;
        }
      });
      if (grupo.children.every(c => !c.material || c.material.opacity < 0.01)) {
        scene.remove(grupo);
        mushis.splice(i, 1);
      }
    }
  }

  if (versosFlotantes.length > 0) {
    const ultimoVerso = versosFlotantes[versosFlotantes.length - 1];
    if (ultimoVerso.userData && ultimoVerso.userData.texto) {
      const texto = ultimoVerso.userData.texto;
      const seed = generarSemillaDesdeTexto(texto);
      const existe = kakus.some(k => k.identidad.seed === seed);
      if (!existe && kakus.length < CONFIG.MAX_KAKUS) {
        crearKaku(texto);
      }
    }
  }

  for (let i = kakus.length - 1; i >= 0; i--) {
    const k = kakus[i];
    k.vida -= 0.008;

    const grupo = k.grupo;
    const pos = grupo.position;
    const ident = k.identidad;
    const mov = ident.movement;

    k.tiempoCambio += 0.016;
    if (k.tiempoCambio > 2 + mov.hesitation * 4) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 1.0 + Math.random() * (CONFIG.RADIO_JARDIN - 1.0);
      const yBase = mov.mode === 'ground' 
        ? mov.groundHeight 
        : mov.airHeightMin + Math.random() * (mov.airHeightMax - mov.airHeightMin);
      k.objetivo.set(
        Math.cos(ang) * rad,
        yBase,
        Math.sin(ang) * rad
      );
      k.tiempoCambio = 0;
    }

    const speed = 0.008 + mov.speed * 0.02;
    pos.x += (k.objetivo.x - pos.x) * speed;
    pos.z += (k.objetivo.z - pos.z) * speed;

    if (mov.mode === 'ground') {
      const targetY = mov.groundHeight + Math.sin(time * mov.flotationFreq + k.tiempoCambio) * mov.flotationAmp * 0.15;
      pos.y += (targetY - pos.y) * 0.02;
    } else {
      const amp = mov.flotationAmp;
      const freq = mov.flotationFreq;
      const baseY = mov.airHeightMin + (mov.airHeightMax - mov.airHeightMin) * (0.5 + 0.5 * Math.sin(time * 0.1 + ident.seed));
      pos.y = baseY + Math.sin(time * freq + k.tiempoCambio) * amp;
    }

    grupo.rotation.x += 0.002 * mov.directionality;
    grupo.rotation.y += 0.003 * mov.directionality;
    grupo.rotation.z += 0.002 * mov.directionality;

    const breath = 1 + Math.sin(time * 0.6 + ident.seed) * 0.03;
    grupo.scale.set(breath, breath, breath);

    grupo.children.forEach(child => {
      if (child.userData && child.userData.esExtremidad) {
        const ud = child.userData;
        const ang = Math.sin(time * ud.velocidad + ud.fase) * ud.amplitud;
        if (ud.tipo === 'segmento') {
          child.rotation.x = ang * 1.0;
          child.rotation.z = Math.cos(time * ud.velocidad * 0.7 + ud.fase) * ud.amplitud * 0.6;
        } else if (ud.tipo === 'tubo') {
          child.rotation.y = ang * 1.5;
          child.rotation.x = Math.sin(time * ud.velocidad * 0.5 + ud.fase) * ud.amplitud * 1.0;
        }
      }
    });

    if (k.sonido) {
      const velocidad = 0.5 + Math.abs(pos.x - k.objetivo.x) * 2 + Math.abs(pos.z - k.objetivo.z) * 2;
      k.sonido.update(time, pos, velocidad, k.vida);
    }

    if (k.vida <= 0) {
      if (k.sonido) {
        k.sonido.detener();
      }
      grupo.children.forEach(child => {
        if (child.material) {
          child.material.opacity *= 0.98;
        }
      });
      if (grupo.children.every(c => !c.material || c.material.opacity < 0.01)) {
        scene.remove(grupo);
        kakus.splice(i, 1);
      }
    }
  }
}

export function iniciarCriaturas() {
  escucharKakus();
  console.log('🦗 Sistema de criaturas iniciado (xilófono armónico + especies diferenciadas)');
}

console.log('✅ criaturas.js cargado correctamente');


(() => {


    function activarMovimientoTentacularMushi() {

        if (typeof criaturas === 'undefined' || !Array.isArray(criaturas)) return;

        criaturas.forEach((mushi, index) => {

            if (!mushi?.userData?.identidad) return;
            if (mushi.userData.identidad.tipo !== 'mushi') return;
            if (mushi.userData.movimientoTentacular) return;

            mushi.userData.movimientoTentacular = true;

            const tentaculos = [];

            mushi.traverse(obj => {

                if (!obj.userData?.esExtremidad) return;

                obj.userData.tentaculoMushi = true;

                const fase =
                    Math.random() * Math.PI * 2 +
                    index * 0.73;

                const amplitud =
                    0.12 + Math.random() * 0.18;

                const velocidad =
                    0.8 + Math.random() * 1.2;

                tentaculos.push({
                    objeto: obj,
                    fase,
                    amplitud,
                    velocidad,
                    eje: Math.floor(Math.random() * 3)
                });
            });

            mushi.userData.tentaculosMushi = tentaculos;
        });
    }



    function crearEstructuraKaku() {

        if (typeof criaturas === 'undefined' || !Array.isArray(criaturas)) return;

        criaturas.forEach((kaku, index) => {

            if (!kaku?.userData?.identidad) return;
            if (kaku.userData.identidad.tipo !== 'kaku') return;
            if (kaku.userData.fragmentosKaku) return;

            kaku.userData.fragmentosKaku = true;

            const fragmentos = new THREE.Group();
            fragmentos.name = 'Kaku_Fragmentos';

            const cantidad = 7 + Math.floor(Math.random() * 4);

            for (let i = 0; i < cantidad; i++) {

                const angulo =
                    (i / cantidad) * Math.PI * 2;

                const radio =
                    1.05 + Math.random() * 0.65;

                const altura =
                    (Math.random() - 0.5) * 1.2;

                const escala =
                    0.12 + Math.random() * 0.16;

                const geometria =
                    new THREE.IcosahedronGeometry(
                        escala,
                        0
                    );

                const material =
                    new THREE.MeshStandardMaterial({
                        color: kaku.userData.identidad.color || 0xffffff,
                        emissive:
                            kaku.userData.identidad.color || 0xffffff,
                        emissiveIntensity: 0.15,
                        roughness: 0.8,
                        metalness: 0.1
                    });

                const fragmento =
                    new THREE.Mesh(
                        geometria,
                        material
                    );

                fragmento.position.set(
                    Math.cos(angulo) * radio,
                    altura,
                    Math.sin(angulo) * radio
                );

                fragmento.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );

                fragmento.userData.fragmentoKaku = true;

                fragmentos.add(fragmento);
            }

            kaku.add(fragmentos);

            kaku.userData.fragmentosKakuData = {
                grupo: fragmentos,
                fase: Math.random() * Math.PI * 2,
                velocidad:
                    0.25 + Math.random() * 0.25,
                fragmentos:
                    fragmentos.children.map((obj, i) => ({
                        objeto: obj,
                        angulo:
                            (i / fragmentos.children.length) *
                            Math.PI * 2,
                        radio:
                            1.05 + Math.random() * 0.65,
                        altura:
                            (Math.random() - 0.5) * 1.2,
                        fase:
                            Math.random() * Math.PI * 2
                    }))
            };
        });
    }



    const ORU = {
        criaturas: [],
        maxCriaturas: 5,
        intervaloGeneracion: 20000, 
        ultimaGeneracion: 0,
    };

    function crearOru() {

        if (ORU.criaturas.length >= ORU.maxCriaturas) return;

        if (ESTADO.muerto) return;
        if (ESTADO.vida < 5) return;

        const grupo = new THREE.Group();

        grupo.name = 'ORU';

        grupo.userData.esOru = true;

        grupo.position.set(
            (Math.random() - 0.5) * 8,
            1.5 + Math.random() * 4,
            (Math.random() - 0.5) * 8
        );

        const nucleo =
            new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.04, 1),
                new THREE.MeshStandardMaterial({
                    color: 0x9dffdb,
                    emissive: 0x46ffc0,
                    emissiveIntensity: 0.8,
                    roughness: 0.5,
                    metalness: 0.2
                })
            );

        nucleo.userData.oruNucleo = true;

        grupo.add(nucleo);

        const anillos = [];

        for (let i = 0; i < 4; i++) {

            const radio = 0.075 + i * 0.03;

            const tubo =
                new THREE.TorusGeometry(
                    radio,
                    0.0075 + i * 0.002,
                    6,
                    16
                );

            const material =
                new THREE.MeshStandardMaterial({
                    color: 0x83e8cf,
                    emissive: 0x3be0b4,
                    emissiveIntensity: 0.25,
                    roughness: 0.7,
                    metalness: 0.25
                });

            const anillo =
                new THREE.Mesh(
                    tubo,
                    material
                );

            anillo.rotation.x =
                Math.PI / 2;

            anillo.userData.oruAnillo = true;

            grupo.add(anillo);

            anillos.push({
                objeto: anillo,
                radioOriginal: radio,
                fase:
                    i * 0.55 +
                    Math.random() * 0.5
            });
        }

        const ramas = [];

        for (let i = 0; i < 10; i++) {

            const angulo =
                (i / 10) *
                Math.PI * 2;

            const radio =
                0.09 + Math.random() * 0.11;

            const altura =
                (Math.random() - 0.5) * 0.175;

            const largo =
                0.03 + Math.random() * 0.05;

            const ramaGrupo =
                new THREE.Group();

            ramaGrupo.position.set(
                Math.cos(angulo) * radio,
                altura,
                Math.sin(angulo) * radio
            );

            ramaGrupo.rotation.z =
                (Math.random() - 0.5) * 0.9;

            ramaGrupo.rotation.y =
                angulo;

            const rama =
                new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        0.005,
                        0.01,
                        largo,
                        5
                    ),
                    new THREE.MeshStandardMaterial({
                        color: 0x6bd7c0,
                        emissive: 0x248c73,
                        emissiveIntensity: 0.25
                    })
                );

            rama.position.y =
                largo / 2;

            ramaGrupo.add(rama);

            const polipo =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        0.0125 +
                        Math.random() * 0.0075,
                        6,
                        6
                    ),
                    new THREE.MeshStandardMaterial({
                        color: 0xb8ffe9,
                        emissive: 0x55ffd0,
                        emissiveIntensity: 0.55
                    })
                );

            polipo.position.y =
                largo;

            ramaGrupo.add(polipo);

            ramaGrupo.userData.oruRama = true;

            grupo.add(ramaGrupo);

            ramas.push({
                objeto: ramaGrupo,
                fase:
                    Math.random() * Math.PI * 2,
                velocidad:
                    0.5 + Math.random() * 0.7,
                radio
            });
        }

        const ejes = [];

        for (let i = 0; i < 3; i++) {

            const eje =
                new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        0.0025,
                        0.0025,
                        0.35,
                        4
                    ),
                    new THREE.MeshStandardMaterial({
                        color: 0x8fffe0,
                        emissive: 0x39d9b2,
                        emissiveIntensity: 0.2
                    })
                );

            eje.rotation.z =
                Math.PI / 2;

            eje.rotation.y =
                i * Math.PI / 3;

            grupo.add(eje);

            ejes.push(eje);
        }

        const satelites = [];

        for (let i = 0; i < 5; i++) {

            const satelite =
                new THREE.Mesh(
                    new THREE.IcosahedronGeometry(
                        0.01,
                        0
                    ),
                    new THREE.MeshStandardMaterial({
                        color: 0xd0fff1,
                        emissive: 0x5fffd4,
                        emissiveIntensity: 0.8
                    })
                );

            satelite.userData.oruSatelite = true;

            grupo.add(satelite);

            satelites.push({
                objeto: satelite,
                angulo:
                    i / 5 * Math.PI * 2,
                radio:
                    0.2 + Math.random() * 0.06,
                altura:
                    (Math.random() - 0.5) * 0.2,
                velocidad:
                    0.25 + Math.random() * 0.3
            });
        }

        grupo.userData.oru = {
            nucleo,
            anillos,
            ramas,
            ejes,
            satelites,
            fase: Math.random() * Math.PI * 2,
            velocidadOrbital:
                0.12 + Math.random() * 0.08,
            velocidadRotacion:
                0.3 + Math.random() * 0.35,
            escala:
                1
        };

        if (typeof escena !== 'undefined') {
            escena.add(grupo);
        } else if (
            typeof scene !== 'undefined'
        ) {
            scene.add(grupo);
        }

        ORU.criaturas.push(grupo);
        ORU.ultimaGeneracion = Date.now();
        console.log(`🪸 ORU creada (${ORU.criaturas.length}/${ORU.maxCriaturas})`);
    }

    function programarOru() {
        setInterval(() => {
            const ahora = Date.now();
            if (ahora - ORU.ultimaGeneracion < ORU.intervaloGeneracion) return;
            if (ORU.criaturas.length >= ORU.maxCriaturas) return;
            if (ESTADO.muerto) return;
            if (ESTADO.vida < 5) return;

            crearOru();
        }, 2000);
    }



    function actualizarEspeciesDiferenciadas() {

        const tiempo =
            performance.now() * 0.001;

        if (
            typeof criaturas !== 'undefined' &&
            Array.isArray(criaturas)
        ) {

            criaturas.forEach(mushi => {

                if (
                    !mushi?.userData?.tentaculosMushi
                ) return;

                mushi.userData.tentaculosMushi.forEach(t => {

                    const onda =
                        tiempo *
                        t.velocidad +
                        t.fase;

                    const movimiento =
                        Math.sin(onda) *
                        t.amplitud;

                    const movimiento2 =
                        Math.cos(onda * 0.73 + t.fase) *
                        t.amplitud *
                        0.65;

                    if (t.eje === 0) {

                        t.objeto.rotation.z =
                            movimiento;

                        t.objeto.rotation.y =
                            movimiento2;

                    } else if (t.eje === 1) {

                        t.objeto.rotation.x =
                            movimiento;

                        t.objeto.rotation.z =
                            movimiento2;

                    } else {

                        t.objeto.rotation.y =
                            movimiento;

                        t.objeto.rotation.x =
                            movimiento2;
                    }
                });
            });
        }

        if (
            typeof criaturas !== 'undefined' &&
            Array.isArray(criaturas)
        ) {

            criaturas.forEach(kaku => {

                const data =
                    kaku?.userData?.fragmentosKakuData;

                if (!data) return;

                data.fase +=
                    data.velocidad * 0.016;

                data.fragmentos.forEach((f, i) => {

                    const onda =
                        tiempo * 0.7 +
                        f.fase;

                    const pulso =
                        Math.sin(onda) * 0.18;

                    const radio =
                        f.radio + pulso;

                    const angulo =
                        f.angulo +
                        tiempo *
                        0.12 +
                        Math.sin(onda * 0.4) *
                        0.12;

                    f.objeto.position.x =
                        Math.cos(angulo) *
                        radio;

                    f.objeto.position.z =
                        Math.sin(angulo) *
                        radio;

                    f.objeto.position.y =
                        f.altura +
                        Math.sin(
                            tiempo * 0.8 +
                            f.fase
                        ) * 0.16;

                    f.objeto.rotation.x +=
                        0.008;

                    f.objeto.rotation.y +=
                        0.011;

                    f.objeto.rotation.z +=
                        0.006;
                });

                kaku.rotation.y +=
                    0.0015;

                kaku.rotation.z =
                    Math.sin(tiempo * 0.35) *
                    0.06;
            });
        }

        ORU.criaturas.forEach(oru => {

            const data =
                oru.userData.oru;

            if (!data) return;

            data.fase +=
                0.016 *
                data.velocidadOrbital;

            const amplitud = 0.015 + Math.sin(data.fase * 0.7) * 0.005;

            oru.position.x +=
                Math.sin(
                    tiempo * 0.23 +
                    data.fase
                ) * amplitud;

            oru.position.y +=
                Math.cos(
                    tiempo * 0.31 +
                    data.fase * 0.9
                ) * (amplitud * 0.7);

            oru.position.z +=
                Math.sin(
                    tiempo * 0.19 +
                    data.fase * 1.4
                ) * (amplitud * 0.9);

            oru.rotation.x +=
                data.velocidadRotacion *
                0.015;

            oru.rotation.y +=
                data.velocidadRotacion *
                0.012;

            oru.rotation.z +=
                data.velocidadRotacion *
                0.020;

            if (Math.random() < 0.005) {
                data.velocidadOrbital = 0.08 + Math.random() * 0.15;
                data.velocidadRotacion = 0.2 + Math.random() * 0.4;
            }

            const ciclo =
                (
                    Math.sin(
                        tiempo * 0.65 +
                        data.fase
                    ) + 1
                ) / 2;

            const contraccion =
                1 - ciclo * 0.52;

            data.anillos.forEach((anillo, i) => {

                const onda =
                    Math.sin(
                        tiempo * 0.9 -
                        i * 0.7 +
                        data.fase
                    );

                const escala =
                    contraccion +
                    onda * 0.045;

                anillo.objeto.scale.set(
                    escala,
                    escala,
                    escala
                );

                anillo.objeto.rotation.x =
                    Math.PI / 2 +
                    Math.sin(
                        tiempo * 0.5 +
                        anillo.fase
                    ) * 0.35;

                anillo.objeto.rotation.z =
                    tiempo *
                    (0.18 + i * 0.035);
            });

            const respiracion =
                1 +
                Math.sin(
                    tiempo * 1.4 +
                    data.fase
                ) * 0.12;

            data.nucleo.scale.setScalar(
                respiracion
            );

            data.ramas.forEach(rama => {

                const onda =
                    Math.sin(
                        tiempo *
                        rama.velocidad +
                        rama.fase
                    );

                rama.objeto.rotation.z =
                    onda * 0.22;

                rama.objeto.rotation.x =
                    Math.cos(
                        tiempo *
                        rama.velocidad *
                        0.8 +
                        rama.fase
                    ) * 0.18;

                rama.objeto.position.y =
                    Math.sin(
                        tiempo * 0.7 +
                        rama.fase
                    ) * 0.08;
            });

            data.ejes.forEach((eje, i) => {

                eje.rotation.x +=
                    0.004 +
                    i * 0.001;

                eje.rotation.y +=
                    0.006;
            });

            data.satelites.forEach(s => {

                const angulo =
                    s.angulo +
                    tiempo *
                    s.velocidad;

                s.objeto.position.x =
                    Math.cos(angulo) *
                    s.radio;

                s.objeto.position.z =
                    Math.sin(angulo) *
                    s.radio;

                s.objeto.position.y =
                    s.altura +
                    Math.sin(
                        tiempo * 0.9 +
                        s.angulo
                    ) * 0.18;

                s.objeto.rotation.x +=
                    0.015;

                s.objeto.rotation.y +=
                    0.02;
            });

            const pulsoGlobal =
                1 +
                Math.sin(
                    tiempo * 0.48 +
                    data.fase
                ) * 0.035;

            oru.scale.setScalar(
                pulsoGlobal
            );
        });

        requestAnimationFrame(
            actualizarEspeciesDiferenciadas
        );
    }



    function iniciarEspeciesDiferenciadas() {

        activarMovimientoTentacularMushi();

        crearEstructuraKaku();

        programarOru();

        setTimeout(() => {
            if (!ESTADO.muerto && ESTADO.vida > 5) {
                crearOru();
            }
        }, 1500);

        requestAnimationFrame(
            actualizarEspeciesDiferenciadas
        );
    }



    let intentosEspecies = 0;

    const esperarCriaturas = setInterval(() => {

        intentosEspecies++;

        if (
            typeof criaturas !== 'undefined' &&
            Array.isArray(criaturas)
        ) {

            activarMovimientoTentacularMushi();
            crearEstructuraKaku();

            if (intentosEspecies > 3) {
                clearInterval(esperarCriaturas);
            }
        }

        if (intentosEspecies > 30) {
            clearInterval(esperarCriaturas);
        }

    }, 500);

    setTimeout(() => {
        iniciarEspeciesDiferenciadas();
    }, 100);

})(); 