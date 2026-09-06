import * as THREE from 'three';
import { scene } from './escena-3d.js';
import { versosFlotantes } from './flotantes.js';
import { ESTADO } from './estado-jardin.js';
import { ref, push, onValue } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';

console.log('🔄 criaturas OK');

var CONFIG = {
  MAX_MUSHIS: 20,
  MAX_KAKUS: 18,
  INTERVALO_MUSHI: 4000,
  VIDA_MUSHI: 300,
  VIDA_KAKU: 250,
  RADIO_JARDIN: 7,
  VOLUMEN_CRIATURA: 0.35,
  TAMANO_BASE: 0.25,
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
    interval: rango(0.2, 1.2, 24),
    volume: rango(0.15, 0.35, 25),
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

function construirMushi(identidad) {
  const { morphology, movement, seed, posicion } = identidad;

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
    color,
    emissive: color,
    emissiveIntensity: 0.25,
    roughness: 0.5,
    metalness: 0.1,
    transparent: true,
    opacity: morphology.opacity,
    depthWrite: false,
  });

  const matExtremidad = new THREE.MeshStandardMaterial({
    color: colorSec,
    emissive: colorSec,
    emissiveIntensity: 0.2,
    roughness: 0.6,
    metalness: 0,
    transparent: true,
    opacity: morphology.opacity * 0.9,
    depthWrite: false,
  });

  const baseSize = CONFIG.TAMANO_BASE;
  const bodyScale = morphology.bodyScale * baseSize * 0.17;

  const mantleGeo = new THREE.SphereGeometry(bodyScale, 10, 7);
  mantleGeo.scale(
    1.05 + morphology.asymmetry * 0.22,
    0.78 + morphology.asymmetry * 0.10,
    1.00 + morphology.asymmetry * 0.18
  );

  const mantle = new THREE.Mesh(mantleGeo, matCuerpo);
  mantle.userData = { esMantoMushi: true };
  group.add(mantle);

  const coronaGeo = new THREE.SphereGeometry(bodyScale * 0.72, 9, 6);
  coronaGeo.scale(1.0, 0.42, 1.0);

  const corona = new THREE.Mesh(coronaGeo, matCuerpo);
  corona.position.y = -bodyScale * 0.34;
  corona.userData = { esCoronaMushi: true };
  group.add(corona);

  const pliegues = Math.max(3, Math.min(6, morphology.segments));

  for (let i = 0; i < pliegues; i++) {
    const a = (i / pliegues) * Math.PI * 2 + seed * 0.01;

    const pliegue = new THREE.Mesh(
      new THREE.SphereGeometry(
        bodyScale * (0.16 + (i % 2) * 0.025),
        6,
        5
      ),
      matCuerpo
    );

    pliegue.scale.set(1.0, 0.55, 0.7);

    pliegue.position.set(
      Math.cos(a) * bodyScale * 0.72,
      -bodyScale * 0.20 +
        Math.sin(a * 2.0 + seed) * bodyScale * 0.04,
      Math.sin(a) * bodyScale * 0.72
    );

    pliegue.userData = {
      esPliegueMushi: true,
      fase: a + seed,
    };

    group.add(pliegue);
  }

  const numLimbs = Math.max(
    5,
    Math.min(8, morphology.limbs + 1)
  );

  const limbLength =
    morphology.limbLength * baseSize * 0.48;

  const limbData = [];

  for (let i = 0; i < numLimbs; i++) {
    const ang =
      (i / numLimbs) * Math.PI * 2 +
      seed * 0.3;

    const root = new THREE.Vector3(
      Math.cos(ang) * bodyScale * 0.56,
      -bodyScale *
        (0.30 + 0.08 * Math.sin(ang * 2.0 + seed)),
      Math.sin(ang) * bodyScale * 0.56
    );

    const segments = 4;

    const arm = new THREE.Group();

    arm.position.copy(root);

    arm.userData = {
      esBrazoMushi: true,
      mushiLimb: i,
      mushiTotal: segments,
      anguloBase: ang,
      fase: seed * 0.013 + i * 0.83,
    };

    group.add(arm);

    let parent = arm;

    for (let j = 0; j < segments; j++) {
      const t = j / (segments - 1);

      const len =
        limbLength *
        (0.34 - t * 0.045) *
        (0.92 + 0.10 * Math.sin(i * 1.7 + seed));

      const radius =
        bodyScale * (0.095 - t * 0.020);

      const seg = new THREE.Group();

      seg.position.y = 0;

      seg.userData = {
        esExtremidad: true,
        tipo: 'segmento',
        mushiLimb: i,
        mushiSegmento: j,
        mushiTotal: segments,
        fase:
          seed * 0.017 +
          i * 0.83 +
          j * 0.46,
        longitud: len,
        radio: radius,
      };

      const geo = new THREE.CylinderGeometry(
        radius * 0.82,
        radius,
        len,
        7
      );

      const mesh = new THREE.Mesh(
        geo,
        matExtremidad
      );

      mesh.position.y = -len * 0.5;
      mesh.userData = seg.userData;

      seg.add(mesh);
      parent.add(seg);

      const joint = new THREE.Mesh(
        new THREE.SphereGeometry(
          radius * 0.95,
          6,
          5
        ),
        matCuerpo
      );

      joint.position.y = -len;

      joint.userData = {
        esArticulacionMushi: true,
        mushiLimb: i,
        mushiSegmento: j,
      };

      seg.add(joint);

      parent = seg;
    }

    limbData.push({
      arm,
      index: i,
      angle: ang,
      phase: seed * 0.013 + i * 0.83,
    });
  }

  const numAppendages = Math.max(
    2,
    Math.min(4, morphology.appendages)
  );

  for (let i = 0; i < numAppendages; i++) {
    const ang =
      (i / numAppendages) * Math.PI * 2 +
      seed * 0.7 +
      0.4;

    const root = new THREE.Vector3(
      Math.cos(ang) * bodyScale * 0.72,
      -bodyScale * 0.10,
      Math.sin(ang) * bodyScale * 0.72
    );

    const len =
      limbLength *
      (0.62 + 0.12 * Math.sin(i * 2.1 + seed));

    const pts = [];

    for (let t = 0; t <= 1.001; t += 0.2) {
      const rr =
        bodyScale * 0.18 +
        t * len;

      pts.push(
        new THREE.Vector3(
          Math.cos(ang + t * 0.42) * rr -
            Math.cos(ang) * bodyScale * 0.18,

          -t * bodyScale * 0.12 +
            Math.sin(t * Math.PI) *
              bodyScale *
              0.08,

          Math.sin(ang + t * 0.42) * rr -
            Math.sin(ang) * bodyScale * 0.18
        )
      );
    }

    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pts),
        10,
        bodyScale * 0.035,
        6,
        false
      ),
      matExtremidad
    );

    tube.position.copy(root);

    tube.userData = {
      esExtremidad: true,
      tipo: 'tubo',
      mushiLimb: i,
      fase: seed * 0.021 + i * 1.2,
      amplitud: 0.18 + (i % 2) * 0.05,
      velocidad: 0.8 + (i % 3) * 0.12,
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

function construirKaku(identidad) {
  const { morphology, movement, seed, posicion } = identidad;

  const group = new THREE.Group();
  group.position.copy(posicion);

  const hue =
    (morphology.colorHue + morphology.colorShift) % 1;

  const color = new THREE.Color().setHSL(
    hue,
    morphology.colorSat * 0.7,
    morphology.colorLight * 0.9
  );

  const colorSec = new THREE.Color().setHSL(
    (hue + 0.2) % 1,
    morphology.colorSat * 0.6,
    morphology.colorLight * 0.8
  );

  const colorOsc = new THREE.Color().setHSL(
    (hue + 0.5) % 1,
    0.8,
    0.5
  );

  const matCuerpo = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.15,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity: morphology.opacity,
    depthWrite: false,
  });

  const matApéndice = new THREE.MeshStandardMaterial({
    color: colorSec,
    emissive: colorSec,
    emissiveIntensity: 0.1,
    roughness: 0.5,
    metalness: 0,
    transparent: true,
    opacity: morphology.opacity * 0.85,
    depthWrite: false,
  });

  const matOjos = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: 0x220000,
    roughness: 0.1,
    metalness: 0.8,
  });

  const baseSize =
    CONFIG.TAMANO_BASE * 0.3;

  const cuerpoGeo = new THREE.SphereGeometry(
    baseSize * 0.35,
    8,
    8
  );

  cuerpoGeo.scale(1.6, 2.4, 0.6);

  const cuerpo = new THREE.Mesh(
    cuerpoGeo,
    matCuerpo
  );

  cuerpo.position.y = baseSize * 0.2;
  cuerpo.castShadow = false;

  cuerpo.userData = {
    esCuerpoKaku: true,
    idx: 0,
  };

  group.add(cuerpo);

  const numSegCola =
    4 + Math.floor(Math.random() * 2);

  for (let i = 0; i < numSegCola; i++) {
    const t =
      (i + 1) / numSegCola;

    const radio =
      baseSize *
      0.04 *
      (1 - t * 0.7);

    const altura =
      baseSize * 0.3 +
      i * baseSize * 0.12;

    const segGeo = new THREE.SphereGeometry(
      radio,
      5,
      5
    );

    segGeo.scale(
      0.5,
      1.0,
      0.5
    );

    const seg = new THREE.Mesh(
      segGeo,
      matApéndice
    );

    seg.position.set(
      0,
      -altura,
      0
    );

    seg.userData = {
      esCola: true,
      idx: i,
      fase: Math.random() * Math.PI * 2,
    };

    group.add(seg);
  }

  for (let lado = -1; lado <= 1; lado += 2) {
    for (let i = 0; i < 5; i++) {
      const ang = i * 0.4 + 0.2;
      const rad =
        baseSize *
        (0.12 + i * 0.04);

      const altura =
        baseSize * 0.12 +
        i * 0.02;

      const rama = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.003,
          0.006,
          rad * 0.7,
          3
        ),
        matApéndice
      );

      rama.position.set(
        lado * rad * 0.35,
        altura,
        Math.sin(ang) * rad * 0.15
      );

      rama.rotation.z =
        lado * 0.7;

      rama.rotation.x =
        Math.sin(ang) * 0.2;

      rama.userData = {
        esBranquia: true,
        lado,
        i,
        fase: Math.random() * Math.PI * 2,
      };

      group.add(rama);

      if (i % 2 === 0) {
        const sub = new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.002,
            0.004,
            rad * 0.3,
            3
          ),
          matApéndice
        );

        sub.position.set(
          lado * rad * 0.35 +
            lado * 0.02,
          altura + rad * 0.2,
          Math.sin(ang) *
              rad *
              0.15 +
            0.01
        );

        sub.rotation.z =
          lado * 0.4;

        sub.userData = {
          esBranquia: true,
          sub: true,
        };

        group.add(sub);
      }
    }
  }

  for (let lado = -1; lado <= 1; lado += 2) {
    const puntos = [];

    for (let t = 0; t <= 1; t += 0.08) {
      const x =
        lado *
        t *
        baseSize *
        0.9;

      const y =
        baseSize *
        0.5 +
        t *
        baseSize *
        1.0;

      const z =
        Math.sin(t * 4) *
        baseSize *
        0.12;

      puntos.push(
        new THREE.Vector3(
          x,
          y,
          z
        )
      );
    }

    const curva =
      new THREE.CatmullRomCurve3(
        puntos
      );

    const tubo =
      new THREE.Mesh(
        new THREE.TubeGeometry(
          curva,
          10,
          0.005,
          3,
          false
        ),
        matApéndice
      );

    tubo.userData = {
      esAntena: true,
      lado,
      fase: seed * 0.01 + lado,
    };

    group.add(tubo);

    const punta =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.008,
          4,
          4
        ),
        matOjos
      );

    punta.position.copy(
      puntos[puntos.length - 1]
    );

    group.add(punta);
  }

  for (let lado = -1; lado <= 1; lado += 2) {
    const ojo =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.018,
          6,
          6
        ),
        matOjos
      );

    ojo.position.set(
      lado * 0.05,
      baseSize * 0.35,
      baseSize * 0.08
    );

    group.add(ojo);

    const brillo =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.005,
          4,
          4
        ),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
        })
      );

    brillo.position.set(
      lado * 0.06,
      baseSize * 0.37,
      baseSize * 0.1
    );

    group.add(brillo);
  }

  for (let lado = -1; lado <= 1; lado += 2) {
    for (let i = 0; i < 6; i++) {
      const ang =
        i * 0.35 + 0.1;

      const rad =
        baseSize * 0.2;

      const altura =
        baseSize * 0.06 +
        i * 0.03;

      const pata =
        new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.002,
            0.005,
            rad * 0.4,
            3
          ),
          matApéndice
        );

      pata.position.set(
        lado * rad * 0.3,
        altura,
        Math.sin(ang) *
          rad *
          0.15
      );

      pata.rotation.z =
        lado * 0.7 + 0.15;

      pata.rotation.x =
        Math.sin(ang) * 0.1;

      pata.userData = {
        esPata: true,
        lado,
        i,
        segmento: i,
        fase: Math.random() * Math.PI * 2,
      };

      group.add(pata);
    }
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

function construirOru(identidad) {
  const { morphology, movement, seed, posicion } = identidad;

  const group = new THREE.Group();
  group.position.copy(posicion);

  const baseSize =
    CONFIG.TAMANO_BASE * 0.5;

  const matCuerpo =
    new THREE.MeshStandardMaterial({
      color: 0x075a91,
      emissive: 0x063b66,
      emissiveIntensity: 0.35,
      roughness: 0.38,
      metalness: 0.12,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    });

  const matAzul =
    new THREE.MeshStandardMaterial({
      color: 0x128bd0,
      emissive: 0x075b9a,
      emissiveIntensity: 0.35,
      roughness: 0.42,
      metalness: 0.08,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });

  const matClaro =
    new THREE.MeshStandardMaterial({
      color: 0x58c9f4,
      emissive: 0x147fb7,
      emissiveIntensity: 0.3,
      roughness: 0.45,
      metalness: 0.04,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    });

  const matOjo =
    new THREE.MeshStandardMaterial({
      color: 0x02121c,
      emissive: 0x000000,
      roughness: 0.18,
      metalness: 0.35,
    });

  const cuerpoGeo =
    new THREE.SphereGeometry(
      baseSize * 0.27,
      10,
      8
    );

  cuerpoGeo.scale(
    2.35,
    0.48,
    0.68
  );

  const cuerpo =
    new THREE.Mesh(
      cuerpoGeo,
      matCuerpo
    );

  cuerpo.position.x =
    baseSize * 0.05;

  cuerpo.userData = {
    esMantoOru: true,
  };

  group.add(cuerpo);

  const cabeza =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        baseSize * 0.23,
        9,
        7
      ),
      matAzul
    );

  cabeza.scale.set(
    1.15,
    0.72,
    0.78
  );

  cabeza.position.x =
    baseSize * 0.48;

  group.add(cabeza);

  const cola =
    new THREE.Mesh(
      new THREE.ConeGeometry(
        baseSize * 0.15,
        baseSize * 0.7,
        7
      ),
      matCuerpo
    );

  cola.rotation.z =
    -Math.PI / 2;

  cola.position.x =
    -baseSize * 0.58;

  cola.scale.set(
    1.0,
    1.0,
    0.55
  );

  group.add(cola);

  for (let lado = -1; lado <= 1; lado += 2) {
    const ojo =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          baseSize * 0.035,
          6,
          6
        ),
        matOjo
      );

    ojo.position.set(
      baseSize * 0.63,
      baseSize * 0.055,
      lado * baseSize * 0.16
    );

    group.add(ojo);
  }

  for (let lado = -1; lado <= 1; lado += 2) {
    const puntos = [];

    for (let t = 0; t <= 1; t += 0.2) {
      puntos.push(
        new THREE.Vector3(
          baseSize * 0.47 +
            t * baseSize * 0.08,
          baseSize * 0.12 +
            t * baseSize * 0.22,
          lado *
            (baseSize * 0.09 +
              t * baseSize * 0.035)
        )
      );
    }

    const rinoforo =
      new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(puntos),
          8,
          baseSize * 0.025,
          5,
          false
        ),
        matClaro
      );

    rinoforo.userData = {
      esRinoforo: true,
      lado,
    };

    group.add(rinoforo);
  }

  const clusterData = [];

  for (let lado = -1; lado <= 1; lado += 2) {
    for (let i = 0; i < 3; i++) {
      const x =
        baseSize *
        (0.20 - i * 0.25);

      const z =
        lado *
        baseSize *
        (0.16 + i * 0.035);

      const cluster =
        new THREE.Group();

      cluster.position.set(
        x,
        0,
        z
      );

      cluster.userData = {
        esClusterCerata: true,
        lado,
        i,
      };

      group.add(cluster);

      const cantidadRamas =
        3;

      for (let rama = 0; rama < cantidadRamas; rama++) {
        const ang =
          ((rama - 1) * 0.48) +
          lado * 0.05;

        const largo =
          baseSize *
          (0.35 + 0.06 * Math.sin(
            seed +
            i * 1.7 +
            rama
          ));

        const pts = [];

        for (let t = 0; t <= 1; t += 0.2) {
          const curva =
            Math.sin(t * Math.PI) *
            baseSize *
            0.09;

          pts.push(
            new THREE.Vector3(
              t *
                Math.cos(ang) *
                largo,

              t *
                largo *
                0.55 +
                curva,

              t *
                Math.sin(ang) *
                largo
            )
          );
        }

        const cerata =
          new THREE.Mesh(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3(pts),
              8,
              baseSize * 0.027 *
                (1 - tSafe(rama) * 0.15),
              5,
              false
            ),
            rama === 1
              ? matClaro
              : matAzul
          );

        cerata.userData = {
          esCerata: true,
          lado,
          cluster: i,
          rama,
          fase:
            seed * 0.02 +
            i * 0.8 +
            rama * 0.5,
        };

        cluster.add(cerata);
      }

      clusterData.push({
        cluster,
        lado,
        i,
      });
    }
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

function tSafe(n) {
  return Math.max(
    0,
    Math.min(1, n / 3)
  );
}

function crearSonidoCriatura(
  identidad,
  audioContext
) {
  if (!audioContext) return null;

  const { sound } = identidad;

  const freqBase = sound.freqBase;
  const rol = sound.rol;
  const decay = sound.decay;
  const interval = sound.interval;
  const volume =
    sound.volume *
    CONFIG.VOLUMEN_CRIATURA;

  let nextSoundTime =
    audioContext.currentTime +
    Math.random() * interval;

  const panner =
    audioContext.createPanner();

  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 1.0;
  panner.maxDistance = 20;
  panner.rolloffFactor = 1.0;
  panner.connect(
    audioContext.destination
  );

  function playNote(now, pos) {
    let oscType = 'sine';
    let filterType = 'lowpass';
    let filterFreq =
      freqBase * 2.5;
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
        filterFreq = freqBase;
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

    const osc =
      audioContext.createOscillator();

    osc.type = oscType;

    osc.frequency.setValueAtTime(
      freqBase *
        (0.99 +
          Math.random() * 0.02),
      now
    );

    const gain =
      audioContext.createGain();

    const duration =
      decay *
      (0.7 +
        Math.random() * 0.6);

    const vol =
      volume *
      (0.7 +
        Math.random() * 0.6);

    gain.gain.setValueAtTime(
      0.0001,
      now
    );

    gain.gain.exponentialRampToValueAtTime(
      vol,
      now + 0.02
    );

    gain.gain.exponentialRampToValueAtTime(
      vol * 0.6,
      now + duration * 0.3
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration
    );

    const filter =
      audioContext.createBiquadFilter();

    filter.type = filterType;

    filter.frequency.setValueAtTime(
      filterFreq,
      now
    );

    filter.Q.setValueAtTime(
      filterQ,
      now
    );

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);

    if (pos) {
      panner.positionX.value =
        pos.x;

      panner.positionY.value =
        pos.y + 0.5;

      panner.positionZ.value =
        pos.z;
    }

    osc.start(now);
    osc.stop(
      now + duration
    );

    if (Math.random() < 0.5) {
      const osc2 =
        audioContext.createOscillator();

      const gain2 =
        audioContext.createGain();

      osc2.type = oscType;

      osc2.frequency.setValueAtTime(
        freqBase *
          (1.5 +
            Math.random() * 0.5),
        now
      );

      gain2.gain.setValueAtTime(
        0.0001,
        now
      );

      gain2.gain.exponentialRampToValueAtTime(
        vol * 0.3,
        now + 0.01
      );

      gain2.gain.exponentialRampToValueAtTime(
        0.0001,
        now + duration * 0.5
      );

      osc2.connect(gain2);
      gain2.connect(panner);

      osc2.start(now);
      osc2.stop(
        now + duration * 0.5
      );
    }

    setTimeout(() => {
      try {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch (e) {}
    }, duration * 1000 + 50);
  }

  function scheduleNext(now) {
    const intervalVar =
      interval *
      (0.7 +
        Math.random() * 0.6);

    nextSoundTime =
      now + intervalVar;
  }

  function update(
    time,
    pos,
    velocidad,
    vidaRestante
  ) {
    if (!audioContext) return;

    const ahora =
      audioContext.currentTime;

    const velocidadNorm =
      Math.min(
        1,
        velocidad * 2
      );

    if (
      ahora >= nextSoundTime ||
      (
        velocidadNorm > 0.2 &&
        Math.random() < 0.1
      )
    ) {
      playNote(
        ahora,
        pos
      );

      scheduleNext(
        ahora
      );
    }

    panner.positionX.value =
      pos.x;

    panner.positionY.value =
      pos.y + 0.5;

    panner.positionZ.value =
      pos.z;
  }

  return {
    panner,
    update,
    detener: () => {
      try {
        panner.disconnect();
      } catch (e) {}
    },
  };
}

function crearMushi() {
  if (
    mushis.length >=
    CONFIG.MAX_MUSHIS
  ) return;

  if (ESTADO.muerto) return;
  if (ESTADO.vida < 10) return;

  const cantidad =
    Math.random() < 0.3
      ? 3
      : 1;

  const cantidadReal =
    Math.min(
      cantidad,
      CONFIG.MAX_MUSHIS -
        mushis.length
    );

  for (
    let i = 0;
    i < cantidadReal;
    i++
  ) {
    const seed =
      semillaAleatoria();

    const identidad =
      generarIdentidad(
        seed,
        'mushi'
      );

    const grupo =
      construirMushi(
        identidad
      );

    scene.add(grupo);

    let sonido = null;

    if (window.audioContext) {
      try {
        sonido =
          crearSonidoCriatura(
            identidad,
            window.audioContext
          );
      } catch (e) {
        console.warn(
          'Error al crear sonido para Mushi:',
          e
        );
      }
    }

    const entry = {
      grupo,
      identidad,
      sonido,
      vida:
        CONFIG.VIDA_MUSHI *
        (0.7 +
          Math.random() * 0.6),
      objetivo:
        grupo.position.clone(),
      tiempoCambio: 0,
    };

    mushis.push(entry);
  }

  ultimoMushi =
    Date.now();

  console.log(
    `🐛 Mushi ${cantidadReal}`
  );
}

function crearKaku(texto) {
  if (
    kakus.length >=
    CONFIG.MAX_KAKUS
  ) return;

  if (ESTADO.muerto) return;

  const cantidad = 1;

  const cantidadReal =
    Math.min(
      cantidad,
      CONFIG.MAX_KAKUS -
        kakus.length
    );

  for (
    let i = 0;
    i < cantidadReal;
    i++
  ) {
    const seed =
      generarSemillaDesdeTexto(
        texto + i
      );

    const identidad =
      generarIdentidad(
        seed,
        'kaku'
      );

    const grupo =
      construirKaku(
        identidad
      );

    const verso =
      versosFlotantes[
        versosFlotantes.length - 1
      ];

    if (verso) {
      grupo.position.copy(
        verso.position
      );

      grupo.position.x +=
        (Math.random() - 0.5) *
        0.8;

      grupo.position.z +=
        (Math.random() - 0.5) *
        0.8;

      grupo.position.y +=
        0.5 +
        Math.random() * 0.6;
    }

    scene.add(grupo);

    let sonido = null;

    if (window.audioContext) {
      try {
        sonido =
          crearSonidoCriatura(
            identidad,
            window.audioContext
          );
      } catch (e) {
        console.warn(
          'Error al crear sonido para Kaku:',
          e
        );
      }
    }

    const entry = {
      grupo,
      identidad,
      sonido,
      texto,
      vida:
        CONFIG.VIDA_KAKU *
        (0.7 +
          Math.random() * 0.6),
      objetivo:
        grupo.position.clone(),
      tiempoCambio: 0,
    };

    kakus.push(entry);

    getDb().then(db => {
      const kakuData = {
        texto,
        semilla: seed,
        posicion:
          grupo.position.toArray(),
        timestamp: Date.now(),
      };

      push(
        ref(
          db,
          'poesia/kakus'
        ),
        kakuData
      ).catch(err => {
        console.warn(
          'Error al guardar Kaku en Firebase:',
          err
        );
      });
    });
  }

  console.log(
    `✍️ ${cantidadReal} Kaku "${texto}"`
  );
}

function crearOru() {
  if (
    ORU.criaturas.length >=
    ORU.maxCriaturas
  ) return;

  if (ESTADO.muerto) return;
  if (ESTADO.vida < 5) return;

  const seed =
    semillaAleatoria();

  const identidad =
    generarIdentidad(
      seed,
      'kaku'
    );

  identidad.morphology.bodyScale =
    0.7 +
    Math.random() * 0.4;

  const grupo =
    construirOru(
      identidad
    );

  grupo.position.set(
    (Math.random() - 0.5) * 8,
    1.5 +
      Math.random() * 4,
    (Math.random() - 0.5) * 8
  );

  let sonido = null;

  if (window.audioContext) {
    try {
      sonido =
        crearSonidoCriatura(
          identidad,
          window.audioContext
        );
    } catch (e) {}
  }

  scene.add(grupo);

  ORU.criaturas.push({
    grupo,
    identidad,
    sonido,
  });

  ORU.ultimaGeneracion =
    Date.now();

  console.log(
    `🐉 ORU (${ORU.criaturas.length}/${ORU.maxCriaturas})`
  );
}

const ORU = {
  criaturas: [],
  maxCriaturas: 15,
  intervaloGeneracion: 6000,
  ultimaGeneracion: 0,
};

function programarOru() {
  setInterval(() => {
    const ahora =
      Date.now();

    if (
      ahora -
        ORU.ultimaGeneracion <
      ORU.intervaloGeneracion
    ) return;

    if (
      ORU.criaturas.length >=
      ORU.maxCriaturas
    ) return;

    if (ESTADO.muerto) return;
    if (ESTADO.vida < 5) return;

    crearOru();
  }, 1000);
}

export function escucharKakus() {
  getDb().then(db => {
    const dbKakus =
      ref(
        db,
        'poesia/kakus'
      );

    onValue(
      dbKakus,
      snap => {
        const data =
          snap.val();

        if (!data) return;

        const kakusLista =
          Object.values(data);

        kakusLista.sort(
          (a, b) =>
            a.timestamp -
            b.timestamp
        );

        const ultimos =
          kakusLista.slice(
            -CONFIG.MAX_KAKUS
          );

        ultimos.forEach(
          kakuData => {
            const existe =
              kakus.some(
                k =>
                  k.identidad.seed ===
                  kakuData.semilla
              );

            if (
              !existe &&
              kakuData.semilla
            ) {
              const identidad =
                generarIdentidad(
                  kakuData.semilla,
                  'kaku'
                );

              const grupo =
                construirKaku(
                  identidad
                );

              if (
                kakuData.posicion &&
                kakuData.posicion.length === 3
              ) {
                grupo.position.fromArray(
                  kakuData.posicion
                );
              }

              scene.add(grupo);

              let sonido = null;

              if (
                window.audioContext
              ) {
                try {
                  sonido =
                    crearSonidoCriatura(
                      identidad,
                      window.audioContext
                    );
                } catch (e) {}
              }

              kakus.push({
                grupo,
                identidad,
                sonido,
                texto:
                  kakuData.texto ||
                  'desconocido',
                vida:
                  CONFIG.VIDA_KAKU *
                  (0.7 +
                    Math.random() *
                      0.6),
                objetivo:
                  grupo.position.clone(),
                tiempoCambio: 0,
              });

              console.log(
                '🔄 Kaku sincronizado'
              );
            }
          }
        );

        const semillasRemotas =
          new Set(
            ultimos.map(
              d => d.semilla
            )
          );

        for (
          let i =
            kakus.length - 1;
          i >= 0;
          i--
        ) {
          if (
            !semillasRemotas.has(
              kakus[i].identidad.seed
            )
          ) {
            if (
              kakus[i].sonido
            ) {
              kakus[i].sonido.detener();
            }

            scene.remove(
              kakus[i].grupo
            );

            kakus.splice(
              i,
              1
            );
          }
        }
      }
    );
  }).catch(err => {
    console.warn(
      'No se pudo conectar a Firebase para escuchar kakus:',
      err
    );
  });
}

function clamp01(v) {
  return Math.max(
    0,
    Math.min(1, v)
  );
}

function wrapAngle(a) {
  while (a > Math.PI)
    a -= Math.PI * 2;

  while (a < -Math.PI)
    a += Math.PI * 2;

  return a;
}

function nadar(
  entry,
  timeNow,
  tipo
) {
  const grupo =
    entry.grupo;

  const pos =
    grupo.position;

  const ident =
    entry.identidad;

  const mov =
    ident.movement;

  const dt =
    Math.min(
      0.05,
      Math.max(
        0.001,
        entry._lastTime
          ? timeNow -
              entry._lastTime
          : 0.016
      )
    );

  entry._lastTime =
    timeNow;

  if (!entry._fisica) {
    entry._fisica = {
      velocidad:
        new THREE.Vector3(),
      aceleracion:
        new THREE.Vector3(),
      heading:
        Math.atan2(
          -pos.z,
          -pos.x
        ),
      velocidadAngular: 0,
      objetivo:
        new THREE.Vector3(),
      tiempoObjetivo: 0,
      impulso: 0,
    };
  }

  const f =
    entry._fisica;

  entry._objetivoTiempo =
    (entry._objetivoTiempo || 0) +
    dt;

  const cambioObjetivo =
    tipo === 'mushi'
      ? 0.3 +
        mov.hesitation * 0.2
      : tipo === 'kaku'
        ? 0.4 +
          mov.hesitation * 0.2
        : 0.2 +
          mov.hesitation * 0.1;

  if (
    entry._objetivoTiempo >
    cambioObjetivo
  ) {
    const ang =
      Math.random() *
      Math.PI *
      2;

    const radioMin =
      tipo === 'kaku'
        ? 0.5
        : 0.3;

    const radio =
      radioMin +
      Math.random() *
        (CONFIG.RADIO_JARDIN -
          radioMin);

    let yBase;

    if (
      mov.mode ===
      'ground'
    ) {
      yBase =
        mov.groundHeight +
        (Math.random() - 0.5) *
          0.2;
    } else {
      yBase =
        mov.airHeightMin +
        Math.random() *
          (mov.airHeightMax -
            mov.airHeightMin) +
        (Math.random() - 0.5) *
          0.5;
    }

    f.objetivo.set(
      Math.cos(ang) * radio,
      yBase,
      Math.sin(ang) * radio
    );

    entry._objetivoTiempo =
      0;

    if (Math.random() < 0.2) {
      f.heading +=
        (Math.random() - 0.5) *
        Math.PI *
        0.8;
    }
  }

  if (
    f.objetivo.lengthSq() === 0
  ) {
    f.objetivo.copy(pos);
  }

  const desired =
    f.objetivo
      .clone()
      .sub(pos);

  desired.y = 0;

  const distanciaXZ =
    desired.length();

  if (
    distanciaXZ > 0.001
  ) {
    desired.normalize();

    const desiredAngle =
      Math.atan2(
        -desired.z,
        -desired.x
      );

    const delta =
      wrapAngle(
        desiredAngle -
          f.heading
      );

    const turnRate =
      tipo === 'mushi'
        ? 4.0
        : tipo === 'kaku'
          ? 5.5
          : 6.0;

    const maxTurn =
      turnRate * dt;

    const applied =
      THREE.MathUtils.clamp(
        delta,
        -maxTurn,
        maxTurn
      );

    f.heading +=
      applied;

    f.velocidadAngular =
      applied /
      Math.max(dt, 0.001);
  } else {
    f.velocidadAngular *=
      0.95;
  }

  const maxSpeed =
    (
      0.6 +
      mov.speed * 0.8
    ) *
    (
      tipo === 'kaku'
        ? 2.0
        : tipo === 'mushi'
          ? 1.5
          : 2.5
    );

  const slowRadius =
    tipo === 'kaku'
      ? 0.8
      : 1.0;

  const speedFactor =
    clamp01(
      distanciaXZ /
        slowRadius
    );

  const forward =
    new THREE.Vector3(
      -1,
      0,
      0
    );

  forward.applyAxisAngle(
    new THREE.Vector3(
      0,
      1,
      0
    ),
    f.heading
  );

  forward.normalize();

  const targetVelocity =
    forward.multiplyScalar(
      maxSpeed *
        (
          0.1 +
          speedFactor *
            0.9
        )
    );

  const alignment =
    clamp01(
      1 -
        Math.abs(
          wrapAngle(
            Math.atan2(
              -desired.z,
              -desired.x
            ) -
              f.heading
          )
        ) /
          Math.PI
    );

  targetVelocity.multiplyScalar(
    0.2 +
      alignment *
        0.8
  );

  f.aceleracion
    .copy(targetVelocity)
    .sub(f.velocidad)
    .multiplyScalar(
      tipo === 'mushi'
        ? 6.0
        : tipo === 'kaku'
          ? 7.0
          : 8.0
    );

  if (
    tipo === 'kaku'
  ) {
    f.impulso =
      0.08 +
      0.06 *
        Math.max(
          0,
          Math.sin(
            timeNow * 12.0
          )
        );
  } else if (
    tipo === 'mushi'
  ) {
    f.impulso =
      0.04 +
      0.04 *
        Math.max(
          0,
          Math.sin(
            timeNow * 5.0 +
              ident.seed
          )
        );
  } else {
    f.impulso =
      0.03 +
      0.025 *
        Math.max(
          0,
          Math.sin(
            timeNow * 6.0 +
              ident.seed
          )
        );
  }

  f.aceleracion.add(
    forward.multiplyScalar(
      f.impulso *
        (1 + Math.random() *
          0.5)
    )
  );

  let targetY;

  if (
    mov.mode ===
    'ground'
  ) {
    targetY =
      mov.groundHeight +
      (
        tipo === 'mushi'
          ? 0.08
          : 0.1
      ) +
      Math.sin(
        timeNow * 2.0 +
          ident.seed
      ) *
        0.04;
  } else {
    targetY =
      f.objetivo.y +
      Math.sin(
        timeNow * 1.5 +
          ident.seed
      ) *
        0.3;
  }

  const verticalError =
    targetY -
    pos.y;

  const verticalSpring =
    verticalError *
      (
        tipo === 'mushi'
          ? 3.0
          : tipo === 'kaku'
            ? 4.0
            : 5.0
      ) -
    f.velocidad.y *
      2.5;

  f.aceleracion.y +=
    verticalSpring;

  f.velocidad.addScaledVector(
    f.aceleracion,
    dt
  );

  f.velocidad.multiplyScalar(
    Math.exp(
      -(
        tipo === 'mushi'
          ? 3.0
          : tipo === 'kaku'
            ? 3.5
            : 4.0
      ) * dt
    )
  );

  if (
    f.velocidad.length() >
    maxSpeed * 2.0
  ) {
    f.velocidad.setLength(
      maxSpeed * 2.0
    );
  }

  pos.addScaledVector(
    f.velocidad,
    dt
  );

  const lateralAxis =
    new THREE.Vector3(
      0,
      0,
      1
    ).applyAxisAngle(
      new THREE.Vector3(
        0,
        1,
        0
      ),
      f.heading
    );

  const forwardAxis =
    new THREE.Vector3(
      -1,
      0,
      0
    ).applyAxisAngle(
      new THREE.Vector3(
        0,
        1,
        0
      ),
      f.heading
    );

  const lateralSpeed =
    f.velocidad.dot(
      lateralAxis
    );

  const forwardSpeed =
    f.velocidad.dot(
      forwardAxis
    );

  const bank =
    THREE.MathUtils.clamp(
      -f.velocidadAngular *
        0.25 -
        lateralSpeed *
          0.6,
      -0.5,
      0.5
    );

  const pitch =
    THREE.MathUtils.clamp(
      -f.velocidad.y *
        0.6 +
        (0.2 -
          forwardSpeed) *
          0.07,
      -0.4,
      0.4
    );

  grupo.rotation.z +=
    (
      bank -
      grupo.rotation.z
    ) *
    (
      1 -
      Math.exp(-8 * dt)
    );

  grupo.rotation.x +=
    (
      pitch -
      grupo.rotation.x
    ) *
    (
      1 -
      Math.exp(-6 * dt)
    );

  grupo.rotation.y =
    f.heading;

  return f;
}

export function actualizarCriaturas(
  time
) {
  if (
    typeof CONFIG ===
    'undefined'
  ) return;

  tiempoGlobal =
    time;

  if (ESTADO.muerto) {
    mushis.forEach(
      m => {
        if (m.sonido)
          m.sonido.detener();

        scene.remove(
          m.grupo
        );
      }
    );

    mushis.length = 0;

    kakus.forEach(
      k => {
        if (k.sonido)
          k.sonido.detener();

        scene.remove(
          k.grupo
        );
      }
    );

    kakus.length = 0;

    ORU.criaturas.forEach(
      o => {
        if (o.sonido)
          o.sonido.detener();

        scene.remove(
          o.grupo
        );
      }
    );

    ORU.criaturas.length =
      0;

    return;
  }

  const ahora =
    Date.now();

  if (
    ahora -
      ultimoMushi >
      CONFIG.INTERVALO_MUSHI &&
    mushis.length <
      CONFIG.MAX_MUSHIS
  ) {
    if (
      ESTADO.vida > 10 &&
      Math.random() < 0.7
    ) {
      crearMushi();
    }
  }

  for (
    let i =
      mushis.length - 1;
    i >= 0;
    i--
  ) {
    const m =
      mushis[i];

    m.vida -=
      0.015;

    const grupo =
      m.grupo;

    const ident =
      m.identidad;

    const f =
      nadar(
        m,
        time,
        'mushi'
      );

    const swimPulse =
      0.5 +
      0.5 *
        Math.sin(
          time * 5.0 +
            ident.seed *
              0.01
        );

    const breath =
      1 +
      Math.sin(
        time * 2.5 +
          ident.seed
      ) *
        0.05 +
      swimPulse *
        0.025;

    const speedNorm =
      Math.min(
        1,
        f.velocidad.length() /
          2.0
      );

    grupo.scale.set(
      breath *
        (
          1 +
          speedNorm *
            0.08
        ),
      breath *
        (
          1 -
          swimPulse *
            0.025
        ),
      breath *
        (
          1 +
          speedNorm *
            0.06
        )
    );

    grupo.traverse(
      child => {
        const ud =
          child.userData ||
          {};

        if (
          ud.esExtremidad &&
          ud.tipo ===
            'segmento'
        ) {
          const limb =
            ud.mushiLimb ||
            0;

          const seg =
            ud.mushiSegmento ||
            0;

          const total =
            Math.max(
              1,
              ud.mushiTotal ||
                4
            );

          const wave =
            time *
              (
                4.0 +
                f.velocidad.length() *
                  6.0
              ) -
            seg * 0.72 -
            limb * 0.17 +
            ud.fase;

          const contraction =
            Math.sin(
              wave
            );

          const lateral =
            Math.cos(
              wave * 0.78 +
                limb * 0.9
            );

          const proximal =
            1 -
            seg /
              total;

          child.rotation.z =
            lateral *
              (
                0.15 +
                proximal *
                  0.25
              ) +
            f.velocidadAngular *
              0.04 *
              (seg + 1);

          child.rotation.x =
            contraction *
            (
              0.15 +
              (1 -
                proximal) *
                0.25
            );

          child.rotation.y =
            Math.sin(
              wave * 0.52
            ) *
            0.07;
        }

        else if (
          ud.esExtremidad &&
          ud.tipo ===
            'tubo'
        ) {
          const wave =
            time *
              ud.velocidad *
              1.5 -
            ud.fase;

          child.rotation.x =
            Math.sin(
              wave
            ) *
            ud.amplitud *
            0.5;

          child.rotation.z =
            Math.cos(
              wave * 0.83
            ) *
            ud.amplitud *
            0.7;
        }

        else if (
          ud.esPliegueMushi
        ) {
          child.scale.x =
            1 +
            swimPulse *
              0.08;

          child.scale.y =
            0.55 -
            swimPulse *
              0.04;
        }
      }
    );

    if (m.sonido) {
      m.sonido.update(
        time,
        grupo.position,
        0.5 +
          f.velocidad.length() *
            8,
        m.vida
      );
    }

    if (
      m.vida <= 0
    ) {
      if (m.sonido)
        m.sonido.detener();

      grupo.children.forEach(
        child => {
          if (
            child.material
          ) {
            child.material.opacity *=
              0.96;
          }
        }
      );

      if (
        grupo.children.every(
          c =>
            !c.material ||
            c.material.opacity <
              0.01
        )
      ) {
        scene.remove(
          grupo
        );

        mushis.splice(
          i,
          1
        );
      }
    }
  }

  if (
    versosFlotantes.length >
    0
  ) {
    const ultimoVerso =
      versosFlotantes[
        versosFlotantes.length -
          1
      ];

    if (
      ultimoVerso.userData &&
      ultimoVerso.userData.texto
    ) {
      const texto =
        ultimoVerso.userData.texto;

      const seed =
        generarSemillaDesdeTexto(
          texto
        );

      if (
        !kakus.some(
          k =>
            k.identidad.seed ===
            seed
        ) &&
        kakus.length <
          CONFIG.MAX_KAKUS
      ) {
        crearKaku(
          texto
        );
      }
    }
  }

  for (
    let i =
      kakus.length - 1;
    i >= 0;
    i--
  ) {
    const k =
      kakus[i];

    k.vida -=
      0.015;

    const grupo =
      k.grupo;

    const ident =
      k.identidad;

    const f =
      nadar(
        k,
        time,
        'kaku'
      );

    const metachronal =
      time * 12.0;

    grupo.traverse(
      child => {
        const ud =
          child.userData ||
          {};

        if (
          ud.esAntena
        ) {
          const flex =
            0.08 +
            f.velocidad.length() *
              0.2;

          child.rotation.z =
            Math.sin(
              time * 3.0 +
                ud.lado *
                  0.7
            ) *
            flex;

          child.rotation.y =
            Math.cos(
              time * 2.5 +
                ud.lado
            ) *
            flex *
            0.8;
        }

        if (
          ud.esPata
        ) {
          const fase =
            metachronal -
            ud.i * 0.72 -
            ud.segmento * 0.30 +
            ud.lado * 0.15;

          const onda =
            Math.sin(
              fase
            );

          const recuperación =
            Math.sin(
              fase +
                Math.PI *
                  0.55
            );

          const esfuerzo =
            0.15 +
            f.velocidad.length() *
              0.3;

          child.rotation.z =
            ud.lado *
            (
              0.25 +
              onda *
                (
                  0.3 +
                  ud.segmento *
                    0.06
                ) *
                (
                  0.7 +
                  esfuerzo
                )
            );

          child.rotation.x =
            recuperación *
            (
              0.1 +
              ud.segmento *
                0.03
            );
        }

        if (
          ud.esCola
        ) {
          child.rotation.y =
            Math.sin(
              time * 6.0 +
                ud.lado *
                  0.8
            ) *
            (
              0.15 +
              f.velocidadAngular *
                0.05
            );

          child.rotation.z =
            Math.cos(
              time * 5.0 +
                ud.lado
            ) *
            0.1;
        }

        if (
          ud.esCuerpoKaku
        ) {
          child.rotation.z =
            Math.sin(
              time * 5.0 -
                ud.idx *
                  0.55
            ) *
            0.05;

          child.position.y +=
            Math.sin(
              time * 5.0 -
                ud.idx *
                  0.55
            ) *
            0.0005;
        }
      }
    );

    grupo.rotation.x +=
      Math.sin(
        time * 3.5 +
          ident.seed
      ) *
      0.002;

    if (k.sonido) {
      k.sonido.update(
        time,
        grupo.position,
        0.5 +
          f.velocidad.length() *
            8,
        k.vida
      );
    }

    if (
      k.vida <= 0
    ) {
      if (k.sonido)
        k.sonido.detener();

      grupo.children.forEach(
        child => {
          if (
            child.material
          ) {
            child.material.opacity *=
              0.96;
          }
        }
      );

      if (
        grupo.children.every(
          c =>
            !c.material ||
            c.material.opacity <
              0.01
        )
      ) {
        scene.remove(
          grupo
        );

        kakus.splice(
          i,
          1
        );
      }
    }
  }

  ORU.criaturas.forEach(
    oru => {
      const grupo =
        oru.grupo;

      const ident =
        oru.identidad;

      const f =
        nadar(
          oru,
          time,
          'oru'
        );

      grupo.traverse(
        child => {
          const ud =
            child.userData ||
            {};

          if (
            ud.esClusterCerata
          ) {
            const fase =
              time *
                (
                  4.0 +
                  f.velocidad.length() *
                    5.0
                ) -
              ud.i * 0.72 +
              ud.lado * 0.18;

            child.rotation.y =
              Math.sin(
                fase
              ) *
              (
                0.15 +
                f.velocidad.length() *
                  0.12
              );

            child.rotation.x =
              Math.cos(
                fase * 0.72
              ) *
              0.09;
          }

          if (
            ud.esCerata
          ) {
            const fase =
              time *
                (
                  5.0 +
                  f.velocidad.length() *
                    4.0
                ) -
              ud.cluster *
                0.75 +
              ud.rama *
                0.32 +
              ud.lado *
                0.18;

            const amplitud =
              0.2 +
              f.velocidad.length() *
                0.3;

            child.rotation.z =
              Math.sin(
                fase
              ) *
              amplitud;

            child.rotation.x =
              Math.cos(
                fase * 0.83 +
                  ud.fase
              ) *
              amplitud *
              0.6;
          }

          if (
            ud.esRinoforo
          ) {
            child.rotation.z =
              Math.sin(
                time * 3.0 +
                  ud.lado
              ) *
              (
                0.08 +
                f.velocidad.length() *
                  0.12
              );
          }
        }
      );

      grupo.children.forEach(
        child => {
          if (
            child.userData &&
            child.userData.esMantoOru
          ) {
            child.rotation.z +=
              Math.sin(
                time * 4.0 +
                  ident.seed
              ) *
              0.003;
          }
        }
      );

      if (oru.sonido) {
        oru.sonido.update(
          time,
          grupo.position,
          0.5 +
            f.velocidad.length() *
              8,
          100
        );
      }
    }
  );
}

export function iniciarCriaturas() {
  escucharKakus();

  console.log(
    '🦗 Criaturas OK'
  );
}

console.log(
  '✅ criaturas OK'
);

(() => {
  programarOru();

  setTimeout(() => {
    if (
      !ESTADO.muerto &&
      ESTADO.vida > 5
    ) {
      crearOru();
      crearOru();
    }
  }, 1000);
})();