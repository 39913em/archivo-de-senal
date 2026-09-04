import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG, ESCALA_SEÑAL, ESCALA_RESONANCIA, RANGO_DERIVA, RANGO_FRACTURA, LEXICO_INICIAL, datosColumna, BANCO_ERROR_PARRAFO, BANCO_BLOQUEO_CITA } from './datos.js';
import { ESTADO, avisoTemporal, cambiarVida, guardarEstado, actualizarUI } from './estado-jardin.js';
import { playSound, playPageTurn, tocarSonidoElemento } from './sonido.js';
import { generarBotonesCompartir } from './ui-botones.js';
import { db } from './main.js';
import { ref, onValue, set } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';
import { rand, probabilidadBloqueo } from './utils.js';
import { actualizarCriaturas } from './criaturas.js';
import { actualizarParticulas } from './particulas.js';
import { actualizarFondo } from './fondo.js';
import { actualizarVegetacion } from './vegetacion.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

export const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(8, 6, 12);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI / 2.1;
controls.target.set(0, 1.5, 0);
controls.update();


const ambient = new THREE.AmbientLight(0x222244, 0.4);
scene.add(ambient);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(5, 12, 7);
mainLight.castShadow = true;
scene.add(mainLight);

const rim = new THREE.DirectionalLight(0xff6b35, 0.6);
rim.position.set(-5, 5, -7);
scene.add(rim);

const fill = new THREE.DirectionalLight(0x4fc3f7, 0.3);
fill.position.set(-3, 0, 8);
scene.add(fill);


export const guardian = new THREE.Group();
const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x16213e, roughness: 0.3, metalness: 0.7 }));
cuerpo.position.y = 0.6;
cuerpo.castShadow = true;
guardian.add(cuerpo);

const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.4, metalness: 0.3 }));
cabeza.position.y = 1.6;
cabeza.castShadow = true;
guardian.add(cabeza);

const aro = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 16), new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.2, metalness: 0.8, emissive: 0xff6b35, emissiveIntensity: 0.1 }));
aro.position.y = 1.6;
aro.rotation.x = Math.PI / 3;
aro.rotation.z = 0.3;
guardian.add(aro);

export const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 0.5 }));
led.position.set(0, 0.7, 0.35);
led.name = 'led';
guardian.add(led);

guardian.position.set(0, 0, 0);
scene.add(guardian);

export const columnas = [];
export const columnasMovimiento = [];
const elementosActivos = {
  SEÑAL: { elementos: [], timer: null },
  RESONANCIA: { elementos: [], timer: null },
  FRACTURA: { elementos: [], timer: null },
  DERIVA: { elementos: [], timer: null }
};

function crearColumna(label, color, forma) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x222244, roughness: 0.7, metalness: 0.3 }));
  base.position.y = 0.1;
  base.receiveShadow = true;
  group.add(base);

  const movilGroup = new THREE.Group();
  movilGroup.position.y = 0.2;
  group.add(movilGroup);

  let mesh;
  const elementos = [];

  if (forma === 'cubos') {
    const g = new THREE.Group();
    const notas = ESCALA_SEÑAL;
    for (let i = 0; i < 25; i++) {
      const size = 0.3 + Math.random() * 0.15;
      const notaIdx = i % notas.length;
      const c = new THREE.Mesh(new THREE.BoxGeometry(size, 0.18, size), new THREE.MeshStandardMaterial({
        color, roughness: 0.3, metalness: 0.6,
        emissive: color, emissiveIntensity: 0.05 + Math.random() * 0.1
      }));
      c.position.y = 0.2 + i * 0.2;
      c.position.x = (Math.random() - 0.5) * 0.5;
      c.position.z = (Math.random() - 0.5) * 0.5;
      c.rotation.y = Math.random() * Math.PI;
      c.castShadow = true;
      c.userData = {
        idx: i,
        faseX: Math.random() * Math.PI * 2,
        faseZ: Math.random() * Math.PI * 2,
        faseRot: Math.random() * Math.PI * 2,
        offsetX: (Math.random() - 0.5) * 0.5,
        offsetZ: (Math.random() - 0.5) * 0.5,
        posYBase: c.position.y,
        rotYBase: c.rotation.y,
        nota: notas[notaIdx],
        esFijo: true,
        columna: label,
        activado: false,
        tiempoActivacion: 0,
        posOriginal: c.position.clone(),
        escalaOriginal: c.scale.clone(),
        colorOriginal: c.material.color.getHex(),
        emissiveOriginal: c.material.emissiveIntensity
      };
      g.add(c);
      elementos.push(c);
    }
    mesh = g;
    mesh.position.y = 2.5;
    movilGroup.add(mesh);
  } else if (forma === 'ondas') {
    const g = new THREE.Group();
    const notas = ESCALA_RESONANCIA;
    for (let i = 0; i < 12; i++) {
      const radio = 0.4 + Math.sin(i * 0.8) * 0.2;
      const notaIdx = i % notas.length;
      const a = new THREE.Mesh(new THREE.TorusGeometry(radio, 0.04, 8, 20), new THREE.MeshStandardMaterial({
        color, roughness: 0.1, metalness: 0.9,
        emissive: color, emissiveIntensity: 0.1,
        transparent: true, opacity: 0.6 + Math.sin(i * 0.5) * 0.3
      }));
      a.position.y = 0.3 + i * 0.4;
      a.rotation.x = Math.PI / 2 + Math.sin(i * 0.3) * 0.2;
      a.rotation.z = Math.sin(i * 0.5) * 0.1;
      a.castShadow = true;
      a.userData = {
        idx: i,
        fase: Math.random() * Math.PI * 2,
        radioBase: radio,
        posYBase: a.position.y,
        rotXBase: a.rotation.x,
        rotZBase: a.rotation.z,
        nota: notas[notaIdx],
        esFijo: true,
        columna: label,
        activado: false,
        tiempoActivacion: 0,
        posOriginal: a.position.clone(),
        escalaOriginal: a.scale.clone(),
        colorOriginal: a.material.color.getHex(),
        emissiveOriginal: a.material.emissiveIntensity
      };
      g.add(a);
      elementos.push(a);
    }
    mesh = g;
    mesh.position.y = 2.5;
    movilGroup.add(mesh);
  } else if (forma === 'rota') {
    const g = new THREE.Group();
    for (let i = 0; i < 45; i++) {
      const altura = 0.3 + Math.random() * 1.8;
      const radio = 0.015 + Math.random() * 0.025;
      const nota = RANGO_FRACTURA.min + Math.random() * (RANGO_FRACTURA.max - RANGO_FRACTURA.min);
      const cilindro = new THREE.Mesh(
        new THREE.CylinderGeometry(radio, radio, altura, 4),
        new THREE.MeshStandardMaterial({
          color, roughness: 0.6, metalness: 0.2,
          emissive: color, emissiveIntensity: 0.1 + Math.random() * 0.3
        })
      );
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.2 + Math.random() * 0.9;
      cilindro.position.set(Math.cos(ang) * rad, 0.5 + Math.random() * 4.5, Math.sin(ang) * rad);
      cilindro.rotation.x = (Math.random() - 0.5) * 0.8;
      cilindro.rotation.z = (Math.random() - 0.5) * 0.8;
      cilindro.castShadow = true;
      cilindro.userData = {
        velocidad: 0.2 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
        radio: rad,
        angulo: ang,
        alturaBase: cilindro.position.y,
        rotXBase: cilindro.rotation.x,
        rotZBase: cilindro.rotation.z,
        idx: i,
        nota: nota,
        esFijo: false,
        columna: label,
        activado: false,
        tiempoActivacion: 0,
        posOriginal: cilindro.position.clone(),
        escalaOriginal: cilindro.scale.clone(),
        colorOriginal: cilindro.material.color.getHex(),
        emissiveOriginal: cilindro.material.emissiveIntensity
      };
      g.add(cilindro);
      elementos.push(cilindro);
    }
    mesh = g;
    mesh.position.y = 0;
    movilGroup.add(mesh);
  } else {
    const g = new THREE.Group();
    for (let i = 0; i < 25; i++) {
      const nota = RANGO_DERIVA.min + Math.random() * (RANGO_DERIVA.max - RANGO_DERIVA.min);
      const f = new THREE.Mesh(new THREE.OctahedronGeometry(0.08 + Math.random() * 0.12), new THREE.MeshStandardMaterial({
        color, roughness: 0.2, metalness: 0.8,
        emissive: color, emissiveIntensity: 0.1,
        transparent: true, opacity: 0.6 + Math.random() * 0.4
      }));
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.3 + Math.random() * 0.7;
      f.position.set(Math.cos(ang) * rad, 0.3 + Math.random() * 4.5, Math.sin(ang) * rad);
      f.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      f.castShadow = true;
      f.userData = {
        velocidad: 0.3 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
        radio: rad,
        alturaBase: f.position.y,
        angulo: ang,
        idx: i,
        nota: nota,
        esFijo: false,
        columna: label,
        activado: false,
        tiempoActivacion: 0,
        posOriginal: f.position.clone(),
        escalaOriginal: f.scale.clone(),
        colorOriginal: f.material.color.getHex(),
        emissiveOriginal: f.material.emissiveIntensity
      };
      g.add(f);
      elementos.push(f);
    }
    mesh = g;
    mesh.position.y = 0.5;
    movilGroup.add(mesh);
  }

  group.userData = {
    label, color, forma, mesh, elementos, movilGroup,
    enRuina: false
  };

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 1024, 200);
  ctx.font = 'Bold 52px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,107,53,.15)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ff6b35';
  ctx.fillText(label, 512, 90);
  ctx.font = '22px "Courier New", monospace';
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#555';
  ctx.fillText('descargar', 512, 150);

  const tex = new THREE.CanvasTexture(canvas);
  const materialPlano = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
    emissive: new THREE.Color(0xff6b35), emissiveIntensity: 0.15
  });
  const plano = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), materialPlano);
  plano.rotation.x = -Math.PI / 2;
  plano.rotation.z = 0;
  plano.rotation.y = Math.PI;
  plano.position.y = 0.015;
  plano.position.x = 0;
  plano.position.z = 0;
  plano.userData = { label, esBoton: true };
  group.add(plano);

  const pos = datosColumna.find(d => d.label === label);
  group.position.set(pos.x, 0, pos.z);

  columnasMovimiento.push(group);
  columnas.push(group);

  return group;
}

datosColumna.forEach(d => {
  const c = crearColumna(d.label, d.color, d.forma);
  scene.add(c);
});


const RADIO_PISO = 8.0; // ⚠️ Este valor debe ser igual a CONFIG_PASTO.RADIO_DISTRIBUCION

const suelo = new THREE.Mesh(
  new THREE.CircleGeometry(RADIO_PISO, 48),
  new THREE.MeshStandardMaterial({
    color: 0x0a1a0a,
    roughness: 0.9,
    metalness: 0.1,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  })
);
suelo.rotation.x = -Math.PI / 2;
suelo.position.set(0, -0.05, 0);
suelo.receiveShadow = true;
scene.add(suelo);

const circulo = new THREE.Mesh(
  new THREE.RingGeometry(2.2, 2.8, 32),
  new THREE.MeshStandardMaterial({
    color: 0xff6b35,
    emissive: 0xff6b35,
    emissiveIntensity: 0.05,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  })
);
circulo.rotation.x = -Math.PI / 2;
circulo.position.set(0, -0.02, 0);
scene.add(circulo);

export const pasto = [];

function crearTexturaBriznaDetallada() {
  const canvas = document.createElement('canvas');
  canvas.width = 16; canvas.height = 48;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 16, 48);

  const grad = ctx.createLinearGradient(8, 0, 8, 48);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.1, 'rgba(200,240,180,0.9)');
  grad.addColorStop(0.3, 'rgba(160,210,140,0.8)');
  grad.addColorStop(0.6, 'rgba(120,180,100,0.7)');
  grad.addColorStop(0.8, 'rgba(80,140,60,0.4)');
  grad.addColorStop(1, 'rgba(40,90,30,0)');

  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.quadraticCurveTo(14, 8, 13, 20);
  ctx.quadraticCurveTo(12, 30, 11, 38);
  ctx.quadraticCurveTo(8, 48, 5, 38);
  ctx.quadraticCurveTo(4, 30, 3, 20);
  ctx.quadraticCurveTo(2, 8, 8, 0);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(100,160,80,0.2)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(8, 4);
  ctx.lineTo(8, 40);
  ctx.stroke();

  for (let i = 10; i < 40; i += 6) {
    ctx.strokeStyle = `rgba(100,160,80,${0.05 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(8, i);
    ctx.lineTo(8 + (Math.random() - 0.5) * 4, i + 3);
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

function crearTexturaAlfombra() {
  const canvas = document.createElement('canvas');
  canvas.width = 8; canvas.height = 8;
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 8, y = Math.random() * 8;
    const size = 0.5 + Math.random() * 1.5;
    const alpha = 0.3 + Math.random() * 0.5;
    ctx.fillStyle = `rgba(50,120,50,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

function crearPasto() {
  const grupo = new THREE.Group();
  const numBriznas = 15000;
  const geometry = new THREE.BufferGeometry();
  const positions = [], colors = [], sizes = [], phases = [];

  const colores = [
    new THREE.Color(0x1a5a2e), new THREE.Color(0x2d7a3e), new THREE.Color(0x3a8a4e),
    new THREE.Color(0x4a9a5e), new THREE.Color(0x5aaa6e), new THREE.Color(0x2a6a3e),
    new THREE.Color(0x3a7a4e)
  ];

  for (let i = 0; i < numBriznas; i++) {
    const ang = Math.random() * Math.PI * 2;
    let rad;
    if (Math.random() < 0.7) rad = 0.5 + Math.random() * 4.5;
    else rad = 4.5 + Math.random() * 3.5;
    if (Math.random() < 0.1) rad = 7 + Math.random() * 2;

    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    positions.push(x, 0, z);

    const distFactor = Math.min(1, rad / 8);
    const colorIdx = Math.floor(Math.random() * colores.length);
    const color = colores[colorIdx].clone();
    color.lerp(new THREE.Color(0x0a2a0a), distFactor * 0.3);
    colors.push(color.r, color.g, color.b);

    sizes.push(0.02 + Math.random() * 0.04);
    phases.push(Math.random() * Math.PI * 2);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));

  const material = new THREE.PointsMaterial({
    size: 0.06, vertexColors: true, transparent: true, opacity: 0.9,
    sizeAttenuation: true, map: crearTexturaBriznaDetallada(),
    blending: THREE.NormalBlending, depthWrite: true
  });

  const points = new THREE.Points(geometry, material);
  points.userData = { phases: phases };
  grupo.add(points);

  const grupoAlfombra = new THREE.Group();
  const numAlfombra = 8000;
  const geoAlfombra = new THREE.BufferGeometry();
  const posAlfombra = [], colAlfombra = [];

  for (let i = 0; i < numAlfombra; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.random() * 7.5;
    const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
    posAlfombra.push(x, 0.01, z);
    const color = new THREE.Color(0x1a3a1a);
    color.lerp(new THREE.Color(0x2a5a2a), Math.random());
    colAlfombra.push(color.r, color.g, color.b);
  }

  geoAlfombra.setAttribute('position', new THREE.Float32BufferAttribute(posAlfombra, 3));
  geoAlfombra.setAttribute('color', new THREE.Float32BufferAttribute(colAlfombra, 3));

  const matAlfombra = new THREE.PointsMaterial({
    size: 0.03, vertexColors: true, transparent: true, opacity: 0.6,
    sizeAttenuation: true, map: crearTexturaAlfombra()
  });

  const alfombra = new THREE.Points(geoAlfombra, matAlfombra);
  grupoAlfombra.add(alfombra);

  scene.add(grupo);
  scene.add(grupoAlfombra);
  pasto.push(grupo);
  pasto.push(grupoAlfombra);

  return grupo;
}

crearPasto();


export const flores = [];
const TIPOS_FLOR = ['señal', 'resonancia', 'fractura', 'deriva'];

function crearTexturaFlor(tipo, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  const cx = 128, cy = 135;
  const colorObj = new THREE.Color(color);
  const r = Math.floor(colorObj.r * 255);
  const g = Math.floor(colorObj.g * 255);
  const b = Math.floor(colorObj.b * 255);

  const configs = {
    señal: { num: 14, tam: 45, capas: 2, forma: 'redondo' },
    resonancia: { num: 8, tam: 58, capas: 2, forma: 'alargado' },
    fractura: { num: 10, tam: 40, capas: 4, forma: 'redondo' },
    deriva: { num: 22, tam: 30, capas: 2, forma: 'fino' }
  };
  const config = configs[tipo] || configs.señal;

  for (let capa = 0; capa < config.capas; capa++) {
    const num = Math.floor(config.num * (1 - capa * 0.12));
    const tam = config.tam * (1 - capa * 0.1);
    const offset = capa * 6;
    const radio = 15 + offset;

    for (let i = 0; i < num; i++) {
      const ang = (i / num) * Math.PI * 2 + capa * 0.4 + Math.sin(capa * 0.5) * 0.1;
      const x = cx + Math.cos(ang) * radio;
      const y = cy + Math.sin(ang) * radio;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);

      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 8;

      const bright = 1 - capa * 0.08;
      const grad = ctx.createRadialGradient(0, -tam * 0.15, 2, 0, 0, tam);
      grad.addColorStop(0, `rgba(${Math.min(255, r + 50 * bright)}, ${Math.min(255, g + 50 * bright)}, ${Math.min(255, b + 50 * bright)}, 1)`);
      grad.addColorStop(0.5, `rgba(${r * bright}, ${g * bright}, ${b * bright}, 1)`);
      grad.addColorStop(1, `rgba(${Math.max(0, r * bright - 40)}, ${Math.max(0, g * bright - 40)}, ${Math.max(0, b * bright - 40)}, 1)`);

      ctx.beginPath();
      if (config.forma === 'alargado') {
        ctx.moveTo(0, -tam * 0.05);
        ctx.quadraticCurveTo(tam * 0.35, -tam * 0.2, tam * 0.25, -tam * 0.75);
        ctx.quadraticCurveTo(0, -tam * 0.95, -tam * 0.25, -tam * 0.75);
        ctx.quadraticCurveTo(-tam * 0.35, -tam * 0.2, 0, -tam * 0.05);
      } else if (config.forma === 'fino') {
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(tam * 0.06, -tam * 0.4, 0, -tam * 0.9);
        ctx.quadraticCurveTo(-tam * 0.06, -tam * 0.4, 0, 0);
      } else {
        ctx.moveTo(0, -tam * 0.05);
        ctx.bezierCurveTo(tam * 0.4, -tam * 0.25, tam * 0.4, -tam * 0.75, 0, -tam * 0.95);
        ctx.bezierCurveTo(-tam * 0.4, -tam * 0.75, -tam * 0.4, -tam * 0.25, 0, -tam * 0.05);
      }
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (config.forma !== 'fino') {
        ctx.strokeStyle = `rgba(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 50)}, 0.15)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -tam * 0.1);
        ctx.lineTo(0, -tam * 0.8);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 10;
  const gradCentro = ctx.createRadialGradient(cx, cy, 3, cx, cy, 18);
  gradCentro.addColorStop(0, '#ffdd44');
  gradCentro.addColorStop(0.5, '#ffaa00');
  gradCentro.addColorStop(1, '#cc8800');
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = gradCentro;
  ctx.fill();

  ctx.shadowBlur = 0;
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2 + Math.random() * 0.1;
    const dist = 6 + Math.random() * 10;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, 1.5 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(160, 100, 20, ${0.4 + Math.random() * 0.5})`;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function crearFlor(tipo, color, posicion) {
  const grupo = new THREE.Group();
  const altura = 0.5 + Math.random() * 1.0;

  const numPuntos = 6 + Math.floor(Math.random() * 4);
  const puntos = [];
  const curvaturaX = (Math.random() - 0.5) * 0.3;
  const curvaturaZ = (Math.random() - 0.5) * 0.3;

  for (let i = 0; i <= numPuntos; i++) {
    const t = i / numPuntos;
    const y = t * altura;
    const x = curvaturaX * t + Math.sin(t * 2.5) * 0.04;
    const z = curvaturaZ * t + Math.cos(t * 2.5) * 0.04;
    puntos.push(new THREE.Vector3(x, y, z));
  }

  const curva = new THREE.CatmullRomCurve3(puntos);
  const tuboGeo = new THREE.TubeGeometry(curva, 20, 0.003 + Math.random() * 0.002, 5, false);
  const talloMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3e, roughness: 0.7, metalness: 0.05 });
  const tallo = new THREE.Mesh(tuboGeo, talloMat);
  grupo.add(tallo);

  const numHojas = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numHojas; i++) {
    const t = 0.2 + (i / numHojas) * 0.5;
    const punto = curva.getPoint(t);
    const tangente = curva.getTangent(t);

    const shapeHoja = new THREE.Shape();
    const ancho = 0.02 + Math.random() * 0.015;
    const alto = 0.035 + Math.random() * 0.025;
    shapeHoja.moveTo(0, 0);
    shapeHoja.bezierCurveTo(ancho * 0.5, alto * 0.4, ancho * 0.4, alto * 0.8, 0, alto);
    shapeHoja.bezierCurveTo(-ancho * 0.4, alto * 0.8, -ancho * 0.5, alto * 0.4, 0, 0);
    const hojaGeo = new THREE.ShapeGeometry(shapeHoja);
    const hoja = new THREE.Mesh(hojaGeo, new THREE.MeshStandardMaterial({
      color: 0x3a8a4e, side: THREE.DoubleSide, roughness: 0.7
    }));

    const perp = new THREE.Vector3(-tangente.z, 0, tangente.x).normalize();
    hoja.position.copy(punto);
    hoja.position.add(perp.clone().multiplyScalar(0.015 + Math.random() * 0.01));
    hoja.position.y += (Math.random() - 0.5) * 0.01;

    hoja.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangente.clone().normalize());
    hoja.rotation.z += (Math.random() - 0.5) * 0.5;
    hoja.rotation.y += (Math.random() - 0.5) * 0.5;
    hoja.scale.set(0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.5, 1);

    hoja.userData = {
      rotZBase: hoja.rotation.z,
      rotYBase: hoja.rotation.y,
      fase: Math.random() * Math.PI * 2
    };
    grupo.add(hoja);
  }

  const baseGeo = new THREE.SphereGeometry(0.015, 6, 6);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a5a2e, roughness: 0.9 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(0, 0.01, 0);
  base.scale.set(1, 0.3, 1);
  grupo.add(base);

  const textura = crearTexturaFlor(tipo, color);
  const spriteMat = new THREE.SpriteMaterial({
    map: textura, transparent: true, depthTest: true, opacity: 0.95,
    sizeAttenuation: true, depthWrite: false
  });
  const sprite = new THREE.Sprite(spriteMat);
  const tamano = 0.25 + Math.random() * 0.15;
  const puntoFinal = curva.getPoint(1);
  sprite.position.copy(puntoFinal);
  sprite.position.y += 0.04;
  sprite.scale.set(tamano, tamano, 1);
  grupo.add(sprite);

  grupo.position.copy(posicion);
  grupo.position.y = 0;
  grupo.scale.set(0.01, 0.01, 0.01);

  grupo.userData = {
    tipo: tipo, color: color, altura: altura, sprite: sprite, tallo: tallo,
    curva: curva, creciendo: true, crecimiento: 0,
    velocidadCrecimiento: 0.012 + Math.random() * 0.015,
    anguloOrbita: Math.random() * Math.PI * 2,
    radioOrbita: 1.2 + Math.random() * 3.5,
    velocidadOrbita: 0.03 + Math.random() * 0.05,
    offsetY: Math.random() * Math.PI * 2,
    toques: 0, muriendo: false, tiempoMuerte: 0,
    textura: textura, puntos: puntos
  };

  scene.add(grupo);
  flores.push(grupo);
  return grupo;
}

export function sincronizarFlores() {
  const objetivo = ESTADO.muerto ? 0 : ESTADO.vida;
  const activas = flores.filter(f => !f.userData.muriendo);

  if (activas.length > objetivo) {
    let sobran = activas.length - objetivo;
    for (let i = 0; i < activas.length && sobran > 0; i++) {
      const f = activas[i];
      if (!f.userData.muriendo) {
        f.userData.muriendo = true;
        f.userData.tiempoMuerte = 0;
        sobran--;
      }
    }
  } else if (activas.length < objetivo) {
    let faltan = objetivo - activas.length;
    while (faltan > 0) {
      const col = datosColumna[Math.floor(Math.random() * datosColumna.length)];
      const tipo = TIPOS_FLOR[Math.floor(Math.random() * TIPOS_FLOR.length)];
      const ang = Math.random() * Math.PI * 2;
      const rad = 1.2 + Math.random() * 3.5;
      const pos = new THREE.Vector3(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      const color = new THREE.Color(col.color);
      crearFlor(tipo, color, pos);
      faltan--;
    }
  }
}

export function limpiarFlores() {
  for (let i = flores.length - 1; i >= 0; i--) {
    scene.remove(flores[i]);
  }
  flores.length = 0;
}

export function eliminarFlor(flor) {
  if (!flor || flor.userData.muriendo) return;
  if (ESTADO.muerto) return;

  flor.userData.muriendo = true;
  flor.userData.tiempoMuerte = 0;
  cambiarVida(-1);
}

export function animarFlores() {
  const time = performance.now() * 0.001;

  for (let i = flores.length - 1; i >= 0; i--) {
    const f = flores[i];
    const d = f.userData;

    if (d.muriendo) {
      d.tiempoMuerte += 0.01;
      d.sprite.material.opacity = Math.max(0, 1 - d.tiempoMuerte * 0.4);
      d.sprite.scale.multiplyScalar(0.995);

      if (d.tiempoMuerte > 0.3) {
        d.tallo.material.color.lerp(new THREE.Color(0x8B7355), 0.02);
      }

      if (d.tiempoMuerte > 2.5) {
        f.scale.multiplyScalar(0.97);
        if (f.scale.x < 0.01) {
          scene.remove(f);
          flores.splice(i, 1);
          continue;
        }
      }
      continue;
    }

    if (d.creciendo) {
      d.crecimiento += d.velocidadCrecimiento;
      const s = Math.min(1, d.crecimiento);
      const eased = 1 - Math.pow(1 - s, 3);
      f.scale.set(eased, eased, eased);
      d.sprite.material.opacity = 0.3 + eased * 0.7;

      if (s >= 1) {
        d.creciendo = false;
        f.scale.set(1, 1, 1);
        d.sprite.material.opacity = 0.95;
      }
    }

    d.anguloOrbita += d.velocidadOrbita * 0.01;
    const rad = d.radioOrbita;
    f.position.x = Math.cos(d.anguloOrbita) * rad;
    f.position.z = Math.sin(d.anguloOrbita) * rad;

    const swayY = Math.sin(time * 0.35 + d.offsetY) * 0.015;
    f.position.y = 0 + swayY;

    const viento = Math.sin(time * 0.4 + d.offsetY * 0.7) * 0.02;
    const viento2 = Math.sin(time * 0.35 + d.offsetY * 0.9) * 0.02;
    f.rotation.y = viento;
    f.rotation.x = viento2;

    const breath = 1 + Math.sin(time * 0.5 + d.offsetY) * 0.02;
    const baseScale = 0.25 + (d.tipo === 'resonancia' ? 0.15 : 0.1);
    d.sprite.scale.x = baseScale * breath;
    d.sprite.scale.y = baseScale * breath;
  }
}

export function animarPasto() {
  const time = performance.now() * 0.001;
  pasto.forEach(g => {
    const points = g.children[0];
    if (points && points.isPoints) {
      const wind1 = Math.sin(time * 0.3) * 0.015;
      const wind2 = Math.sin(time * 0.2 + 1.2) * 0.01;
      points.material.size = 0.06 + wind1 * 0.02 + wind2 * 0.01;
      if (g.children.length > 0) {
        g.rotation.y = Math.sin(time * 0.02) * 0.01;
      }
    }
  });
}

export const versosFlotantes = [];

export function crearVerso(texto, autor, label) {
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

export function limpiarVersosFlotantes() {
  versosFlotantes.forEach(s => scene.remove(s));
  versosFlotantes.length = 0;
}

export const mensajesFlotantes = [];
export let mensajesRenderizados = new Set();

export function crearMensaje(texto) {
  if (mensajesRenderizados.has(texto)) return;
  mensajesRenderizados.add(texto);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 512, 120);
  ctx.font = '20px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,107,53,0.4)';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#ff6b35';

  const palabras = texto.split(' ');
  let lineas = [],
    actual = '';
  for (const p of palabras) {
    if ((actual + ' ' + p).length < 25) {
      actual += (actual ? ' ' : '') + p;
    } else {
      if (actual) lineas.push(actual);
      actual = p;
    }
  }
  if (actual) lineas.push(actual);

  const lh = 26,
    start = 60 - ((lineas.length - 1) * lh) / 2;
  lineas.forEach((l, i) => ctx.fillText(l, 256, start + i * lh));

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      opacity: 0.85,
    })
  );

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
    autor: 'RAYO',
  };
  scene.add(sprite);
  mensajesFlotantes.push(sprite);
  return sprite;
}

export function limpiarMensajesFlotantes() {
  mensajesFlotantes.forEach((s) => scene.remove(s));
  mensajesFlotantes.length = 0;
  mensajesRenderizados.clear();
}

export function actualizarMensajesFlotantes() {
  ESTADO.mensajes.forEach((msg) => {
    if (!mensajesRenderizados.has(msg)) {
      crearMensaje(msg);
    }
  });
}

export let petalesLluvia = [];

export function lluviaPetales() {
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

export function activarRuina() {
  columnasMovimiento.forEach(col => {
    col.userData.enRuina = true;
    col.rotation.x = -Math.PI / 2;
    col.rotation.z = 0;
  });
}

export function desactivarRuina() {
  columnasMovimiento.forEach(col => {
    col.userData.enRuina = false;
    col.rotation.x = 0;
    col.rotation.z = 0;
  });
}

const raycaster = new THREE.Raycaster();

function armarEnsayoSegunEstado(ensayo, integridad, muerto) {
  const partes = [];
  ensayo.bloques.forEach(b => {
    if (b.tipo === 'subtitulo') { partes.push({ tipo: b.tipo, texto: b.texto }); return; }
    if (b.tipo === 'cita') {
      const bloquear = muerto ? true : Math.random() < probabilidadBloqueo(integridad);
      partes.push({ tipo: b.tipo, texto: bloquear ? rand(BANCO_BLOQUEO_CITA) : b.texto, bloqueada: bloquear });
      return;
    }
    if (muerto) partes.push({ tipo: b.tipo, texto: disolucionLibre(), modo: 'disuelto' });
    else if (Math.random() < probabilidadBloqueo(integridad)) partes.push({ tipo: b.tipo, texto: rand(BANCO_ERROR_PARRAFO), modo: 'bloqueado' });
    else partes.push({ tipo: b.tipo, texto: b.texto, modo: 'legible' });
  });
  return partes;
}

function disolucionLibre() {
  const todas = ['señal','resonancia','fractura','deriva'].flatMap(c => {
    const inicial = LEXICO_INICIAL[c] || [];
    return [...inicial];
  });
  const n = 5 + Math.floor(Math.random() * 5);
  const piezas = []; for (let i = 0; i < n; i++) piezas.push(rand(todas));
  const glifos = ['░','▒','▓','█','▄','▀'];
  return piezas.join(' ') + ' ' + glifos[Math.floor(Math.random() * glifos.length)].repeat(1 + Math.floor(Math.random() * 3));
}

function obtenerTodosLosElementos() {
  const todos = [];
  columnasMovimiento.forEach(col => {
    if (col.userData.enRuina) return;
    const d = col.userData;
    if (d.elementos && d.elementos.length > 0) {
      d.elementos.forEach(el => { todos.push(el); });
    }
  });
  return todos;
}

function activarElemento(elemento) {
  if (ESTADO.muerto) return;

  const ud = elemento.userData;
  const columna = ud.columna;

  if (!ud.posOriginal) {
    ud.posOriginal = elemento.position.clone();
    ud.escalaOriginal = elemento.scale.clone();
    ud.colorOriginal = elemento.material.color.getHex();
    ud.emissiveOriginal = elemento.material.emissiveIntensity;
  }

  ud.activado = true;
  ud.tiempoActivacion = Date.now();

  aplicarEfectoElemento(elemento, true);
  tocarSonidoElemento(elemento);

  const activos = elementosActivos[columna];
  if (activos.timer) {
    clearTimeout(activos.timer);
    activos.timer = null;
  }

  activos.timer = setTimeout(() => {
    fadeoutColumna(columna);
  }, CONFIG.FADEOUT_ELEMENTO);
}

function aplicarEfectoElemento(elemento, activado) {
  const ud = elemento.userData;

  if (activado) {
    elemento.material.emissiveIntensity = 1.5;
    const dir = elemento.position.clone().normalize();
    const separacion = 0.25;
    elemento.position.x = ud.posOriginal.x + dir.x * separacion;
    elemento.position.z = ud.posOriginal.z + dir.z * separacion;
    elemento.scale.multiplyScalar(1.15);
  } else {
    elemento.material.emissiveIntensity = ud.emissiveOriginal || 0.1;
    elemento.position.copy(ud.posOriginal);
    elemento.scale.copy(ud.escalaOriginal);
  }
}

function fadeoutColumna(columna) {
  const elementosActivosCol = columnasMovimiento
    .find(col => col.userData.label === columna)
    ?.userData.elementos
    ?.filter(el => el.userData.activado) || [];

  if (elementosActivosCol.length === 0) return;

  let fadeStep = 0;
  const fadeInterval = setInterval(() => {
    fadeStep += 0.05;
    const opacity = 1 - fadeStep;

    elementosActivosCol.forEach(el => {
      if (el.userData.activado) {
        el.material.opacity = Math.max(0, opacity);
        el.material.transparent = true;
        el.material.emissiveIntensity = Math.max(0, 1.5 * opacity);
      }
    });

    if (fadeStep >= 1) {
      clearInterval(fadeInterval);
      elementosActivosCol.forEach(el => {
        if (el.userData.activado) {
          el.userData.activado = false;
          el.material.emissiveIntensity = el.userData.emissiveOriginal || 0.1;
          el.position.copy(el.userData.posOriginal);
          el.scale.copy(el.userData.escalaOriginal);
          el.material.opacity = 0.6 + Math.random() * 0.4;
          el.material.transparent = true;
        }
      });
      const activos = elementosActivos[columna];
      activos.timer = null;
    }
  }, 50);
}


renderer.domElement.addEventListener('click', async e => {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);

  const planos = [];
  columnas.forEach(col => col.children.forEach(c => {
    if (c.isMesh && c.userData && c.userData.esBoton) planos.push(c);
  }));
  const hitsSprite = raycaster.intersectObjects(planos);

  if (hitsSprite.length) {
    const label = hitsSprite[0].object.userData.label;
    const colData = datosColumna.find(d => d.label === label);

    const partes = armarEnsayoSegunEstado(colData.ensayo, ESTADO.integridad, ESTADO.muerto);
    const sufijoEstado = ESTADO.muerto ? 'silencio' : (ESTADO.corrompido ? 'interferencia' : 'senal');
    const element = document.createElement('div');
    element.style.cssText = 'padding:30px;font-family:Georgia,serif;color:#1a1a1a;background:#fafafa;max-width:700px;margin:0 auto';
    let html = `<div style="text-align:center;border-bottom:2px solid #ff6b35;padding-bottom:15px;margin-bottom:15px">
      <h1 style="font-size:24px;margin:0;color:#0a0a0a">JARDÍN DEL ORÁCULO</h1>
      <p style="font-size:11px;color:#666;letter-spacing:1px;text-transform:uppercase">Archivo de Señal</p></div>`;
    html += `<div style="margin-bottom:15px">
      <h2 style="font-size:20px;margin:0 0 4px">${colData.ensayo.titulo}</h2>
      <p style="font-size:11px;color:#999">${label} · ${sufijoEstado.toUpperCase()}</p></div>`;
    partes.forEach(b => {
      if (b.tipo === 'subtitulo') html += `<p style="font-size:14px;color:#555;font-style:italic;margin:0 0 10px">${b.texto}</p>`;
      else if (b.tipo === 'cita') html += `<p style="font-size:13px;color:${b.bloqueada?'#999':'#333'};border-left:3px solid #ff6b35;padding-left:10px;margin:10px 0;${b.bloqueada?'font-style:italic':''}">${b.texto}</p>`;
      else html += `<p style="font-size:13px;line-height:1.7;margin:0 0 10px;${b.modo==='disuelto'?'color:#900':(b.modo==='bloqueado'?'color:#666;font-style:italic':'')}">${b.texto}</p>`;
    });
    html += `<div style="margin-top:25px;border-top:1px solid #ddd;padding-top:12px;text-align:center;font-size:10px;color:#999">Archivo de Señal · ${new Date().toLocaleDateString()}</div>`;
    element.innerHTML = html;
    document.body.appendChild(element);

    try {
      const html2pdf = window.html2pdf;
      if (html2pdf) {
        await html2pdf().set({
          margin: 10,
          filename: `${label.toLowerCase().replace(/\s+/g,'_')}_${sufijoEstado}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(element).save();
      } else {
        console.warn('html2pdf no disponible');
        avisoTemporal('No se pudo generar el PDF (librería no cargada)');
      }
    } catch(err) { console.error('Error PDF:', err); }
    document.body.removeChild(element);

    if (!ESTADO.muerto) {
      ESTADO.siembras++;
      await guardarEstado();
      actualizarUI();
      playPageTurn();
    }
    return;
  }

  const todosLosElementos = obtenerTodosLosElementos();
  const hits = raycaster.intersectObjects(todosLosElementos);
  if (hits.length) {
    const elemento = hits[0].object;
    activarElemento(elemento);
  }
});

renderer.domElement.addEventListener('dblclick', async e => {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);

  const todos = [...versosFlotantes, ...mensajesFlotantes];
  if (!todos.length) return;
  const hits = raycaster.intersectObjects(todos);
  if (hits.length) {
    const sprite = hits[0].object;
    const texto = sprite.userData.texto || 'sin texto';
    const autor = sprite.userData.autor || 'ORÁCULO';
    generarBotonesCompartir(texto, autor, false);
    return;
  }
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (ESTADO.muerto) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(flores, true);
  if (!hits.length) return;

  let flor = hits[0].object;
  while (flor.parent && !flores.includes(flor)) {
    flor = flor.parent;
  }
  if (!flores.includes(flor)) return;

  const d = flor.userData;
  if (d.muriendo) return;

  d.toques = (d.toques || 0) + 1;
  if (d.toques === 1) {
    playSound([520, 780], 0.16, 0.035);
    flor.scale.setScalar(1.1);
    setTimeout(() => { if (flor.parent) flor.scale.setScalar(1); }, 140);
    return;
  }

  eliminarFlor(flor);
  playSound([180, 120, 70], 0.35, 0.08);
});

function animarColumnas(time) {
  const salud = ESTADO.muerto ? 0 : Math.max(0.12, Math.min(1, ESTADO.integridad / 100));

  columnasMovimiento.forEach((col, i) => {
    const d = col.userData;
    const label = d.label;
    const movil = d.movilGroup;
    if (!movil) return;

    if (d.enRuina || ESTADO.muerto) {
      col.rotation.x = -Math.PI / 2;
      col.rotation.z = 0;
      return;
    }

    col.rotation.x = 0;
    col.rotation.z = 0;
    const offset = i * 0.8;

    if (label === 'RESONANCIA') {
      const breath = 1 + Math.sin(time * CONFIG.VEL_RESONANCIA * 0.8 + offset) * 0.15 * (0.5 + salud * 0.5);
      movil.scale.x = breath;
      movil.scale.z = breath;
      movil.position.y = 0.2 + Math.sin(time * CONFIG.VEL_RESONANCIA * 0.6 + offset) * 0.18 * (0.5 + salud * 0.5);
      movil.rotation.x = Math.sin(time * CONFIG.VEL_RESONANCIA * 0.7 + offset) * 0.05;
      movil.rotation.z = Math.cos(time * CONFIG.VEL_RESONANCIA * 0.65 + offset * 0.7) * 0.05;

      if (d.elementos && d.elementos.length > 0) {
        d.elementos.forEach((el, idx) => {
          if (!el.userData.activado) {
            const factor = 1 + Math.sin(time * CONFIG.VEL_RESONANCIA * 0.9 + idx * 0.5 + offset) * 0.15;
            el.scale.x = factor;
            el.scale.z = factor;
            el.position.y = el.userData.posYBase + Math.sin(time * CONFIG.VEL_RESONANCIA * 0.8 + idx * 0.7 + offset) * 0.05;
          }
        });
      }
    } else if (label === 'SEÑAL') {
      if (d.elementos && d.elementos.length > 0) {
        d.elementos.forEach((el, idx) => {
          if (!el.userData.activado) {
            const ud = el.userData;
            const ang = time * CONFIG.VEL_SENIAL * 0.4 + ud.faseX;
            const rad = 0.06 + Math.sin(time * CONFIG.VEL_SENIAL * 0.3 + ud.faseZ) * 0.04;
            el.position.x = ud.offsetX + Math.cos(ang) * rad;
            el.position.z = ud.offsetZ + Math.sin(ang) * rad;
            el.rotation.y = ud.rotYBase + time * CONFIG.VEL_SENIAL * 0.04 + ud.faseRot;
            el.rotation.x = Math.sin(time * CONFIG.VEL_SENIAL * 0.25 + ud.faseX) * 0.03;
            el.position.y = ud.posYBase + Math.sin(time * CONFIG.VEL_SENIAL * 0.35 + ud.faseZ) * 0.025;
          }
        });
      }
    } else if (label === 'FRACTURA') {
      movil.position.y = 0.2 + Math.sin(time * CONFIG.VEL_FRACTURA * 0.6 + offset * 2) * 0.05;
      movil.rotation.z = Math.sin(time * CONFIG.VEL_FRACTURA * 0.4 + offset * 1.3) * 0.02;
      movil.rotation.x = Math.sin(time * CONFIG.VEL_FRACTURA * 0.5 + offset * 1.7) * 0.02;

      if (d.elementos && d.elementos.length > 0) {
        d.elementos.forEach((el, idx) => {
          if (!el.userData.activado) {
            const ud = el.userData;
            const alt = ud.alturaBase + Math.sin(time * ud.velocidad + ud.offset) * 0.3;
            el.position.y = alt;
            el.rotation.x += 0.01;
            el.rotation.z += 0.01;
          }
        });
      }
    } else if (label === 'DERIVA') {
      movil.position.y = 0.2 + Math.sin(time * 0.35 + offset * 1.1) * 0.05;
      movil.rotation.x = Math.sin(time * 0.3 + offset * 0.9) * 0.02;
      movil.rotation.z = Math.sin(time * 0.28 + offset * 1.4) * 0.02;

      if (d.elementos && d.elementos.length > 0) {
        d.elementos.forEach((el, idx) => {
          if (!el.userData.activado) {
            const ud = el.userData;
            const alt = ud.alturaBase + Math.sin(time * ud.velocidad + ud.offset) * 0.3;
            el.position.y = alt;
            el.rotation.x += 0.01;
            el.rotation.z += 0.005;
          }
        });
      }
    }
  });
}

let tiempo = 0;

export function animarEscena() {
  requestAnimationFrame(animarEscena);
  tiempo += 0.01;

  const vidaFrac = Math.max(0, Math.min(1, ESTADO.vida / 10));
  const bpm = ESTADO.muerto ? 0.4 : 1.0 + vidaFrac * 2.2;
  const latido = Math.pow(Math.max(0, Math.sin(tiempo * bpm * 3)), 6);
  const colorLed = ESTADO.muerto ? 0x552222 : (ESTADO.corrompido ? 0xff8a30 : 0x00e676);
  led.material.color.setHex(colorLed);
  led.material.emissive.setHex(colorLed);
  led.material.emissiveIntensity = ESTADO.muerto ? 0.08 + latido * 0.1 : 0.3 + latido * 0.9;
  led.scale.set(
    1 + latido * (ESTADO.muerto ? 0.1 : 0.5),
    1 + latido * (ESTADO.muerto ? 0.1 : 0.5),
    1 + latido * (ESTADO.muerto ? 0.1 : 0.5)
  );

  guardian.rotation.y = Math.sin(tiempo * 0.3) * 0.1;

  animarFlores();
  animarLluviaPetales();
  animarPasto();
  animarColumnas(tiempo);
  actualizarCriaturas(tiempo); 
  actualizarParticulas(tiempo);
  actualizarVegetacion(tiempo);
  actualizarFondo(tiempo);

  versosFlotantes.forEach(s => {
    const d = s.userData;
    if (d && !s.userData._evaporando) {
      const na = d.angulo + tiempo * d.velocidad;
      const alt = d.alturaBase + Math.sin(tiempo * d.velocidad + d.offset) * 0.5;
      s.position.x = Math.cos(na) * d.radio;
      s.position.z = Math.sin(na) * d.radio;
      s.position.y = alt;
    }
  });

  mensajesFlotantes.forEach((s) => {
    const d = s.userData;
    if (d) {
      const na = d.angulo + tiempo * d.velocidad;
      const alt = d.alturaBase + Math.sin(tiempo * d.velocidad + d.offset) * 0.3;
      s.position.x = Math.cos(na) * d.radio;
      s.position.z = Math.sin(na) * d.radio;
      s.position.y = alt;
    }
  });

  const corrupto = ESTADO.corrompido || ESTADO.integridad < 30;
  const muerto = ESTADO.muerto;
  const nivel = muerto ? 1 : Math.max(0, 1 - ESTADO.integridad / 100);

  columnas.forEach((col) => {
    const off = Math.random() * 0.5;
    const forma = col.userData.forma;
    col.position.y = muerto ? -0.15 : Math.sin(tiempo * 0.5 + off) * 0.04;

    if (forma === 'cubos' && col.userData.elementos) {
      col.userData.elementos.forEach(c => {
        if (!c.userData.activado) {
          if (muerto) {
            c.material.color.setHex(0x333333);
            c.material.emissiveIntensity = 0;
          } else if (corrupto) {
            const vib = 0.02 + nivel * 0.05;
            c.position.x += (Math.random() - 0.5) * vib;
            c.position.z += (Math.random() - 0.5) * vib;
            c.material.emissiveIntensity = 0.1 + nivel * 0.5;
            c.material.color.setHex(new THREE.Color(col.userData.color).multiplyScalar(1 - nivel * 0.5).getHex());
          } else {
            c.material.color.setHex(col.userData.color);
            c.material.emissiveIntensity = 0.05 + Math.sin(tiempo + (c.userData?.idx || 0)) * 0.05;
          }
        }
      });
    }

    if (forma === 'ondas' && col.userData.elementos) {
      col.userData.elementos.forEach((a, idx) => {
        if (!a.userData.activado) {
          if (muerto) {
            a.scale.x = 0.3; a.scale.z = 0.3;
            a.material.opacity = 0.05;
            a.material.color.setHex(0x444444);
            a.material.emissiveIntensity = 0;
          } else if (corrupto) {
            const dist = 1 + Math.sin(tiempo * 2 + idx * 0.5) * (0.2 + nivel * 0.5);
            a.scale.x = dist; a.scale.z = dist;
            a.material.opacity = 0.2 + Math.sin(tiempo * 3 + idx) * 0.2;
            a.material.color.setHex(new THREE.Color(col.userData.color).multiplyScalar(1 - nivel * 0.3).getHex());
            a.material.emissiveIntensity = 0.1 + nivel * 0.3;
          } else {
            const esc = 1 + Math.sin(tiempo * 0.5 + idx) * 0.05;
            a.scale.x = esc; a.scale.z = esc;
            a.material.opacity = 0.6 + Math.sin(idx * 0.5) * 0.3;
            a.material.color.setHex(col.userData.color);
            a.material.emissiveIntensity = 0.1;
          }
        }
      });
    }

    if (forma === 'rota' && col.userData.elementos) {
      col.userData.elementos.forEach((f, idx) => {
        if (!f.userData.activado) {
          const d = f.userData;
          if (muerto) {
            f.position.y = 0.1 + Math.sin(tiempo + idx) * 0.05;
            f.material.color.setHex(0x333333);
            f.material.emissiveIntensity = 0;
            f.material.opacity = 0.2;
          } else if (corrupto) {
            const alt = d.alturaBase * (1 - nivel * 0.5) + Math.sin(tiempo * d.velocidad + d.offset) * 0.2 * (1 - nivel);
            f.position.y = Math.max(0.1, alt);
            f.rotation.x += 0.02; f.rotation.z += 0.02;
            f.material.color.setHex(new THREE.Color(col.userData.color).multiplyScalar(1 - nivel * 0.4).getHex());
            f.material.emissiveIntensity = 0.05 + nivel * 0.3;
            f.material.opacity = 0.4 + Math.sin(tiempo * 2 + idx) * 0.2;
          } else {
            const alt = d.alturaBase + Math.sin(tiempo * d.velocidad + d.offset) * 0.3;
            f.position.y = alt;
            f.rotation.x += 0.01; f.rotation.z += 0.01;
            f.material.color.setHex(col.userData.color);
            f.material.emissiveIntensity = 0.1;
            f.material.opacity = 0.7 + Math.sin(idx * 0.5) * 0.2;
          }
        }
      });
    }

    if (forma === 'flotante' && col.userData.elementos) {
      col.userData.elementos.forEach((f, idx) => {
        if (!f.userData.activado) {
          const d = f.userData;
          if (muerto) {
            f.position.y = 0.1;
            f.material.opacity = 0.05;
            f.material.emissiveIntensity = 0;
            f.material.color.setHex(0x333333);
          } else if (corrupto) {
            const alt = d.alturaBase * (1 - nivel * 0.7) + Math.sin(tiempo * d.velocidad + d.offset) * 0.2 * (1 - nivel);
            f.position.y = Math.max(0.1, alt);
            f.rotation.x += 0.02; f.rotation.z += 0.01;
            f.material.opacity = 0.3 + Math.sin(tiempo * 2 + idx) * 0.2;
            f.material.color.setHex(new THREE.Color(col.userData.color).multiplyScalar(1 - nivel * 0.5).getHex());
            f.material.emissiveIntensity = 0.05 + nivel * 0.2;
          } else {
            const alt = d.alturaBase + Math.sin(tiempo * d.velocidad + d.offset) * 0.3;
            f.position.y = alt;
            f.rotation.x += 0.01; f.rotation.z += 0.005;
            f.material.opacity = 0.6 + Math.sin(idx * 0.5) * 0.3;
            f.material.color.setHex(col.userData.color);
            f.material.emissiveIntensity = 0.1;
          }
        }
      });
    }
  });

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animarEscena();
console.log('🌿 Escena 3D cargada y animación iniciada.');


export function escucharVerso() {
  const dbVersos = ref(db, 'versos');
  
  onValue(dbVersos, snap => {
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
        crearVerso(verso.texto, verso.autor, verso.columna);
      }
    });
  });
}

export function escucharMensajes() {
  const dbMensajes = ref(db, 'poesia/mensajes');
  
  onValue(dbMensajes, snap => {
    const data = snap.val();
    if (!data) return;

    const mensajesLista = Array.isArray(data) ? data : [];
    
    mensajesLista.forEach(msg => {
      const existe = mensajesFlotantes.some(s =>
        s.userData.texto === msg
      );
      
      if (!existe && msg) {
        crearMensaje(msg);
      }
    });

    mensajesFlotantes.forEach(s => {
      const texto = s.userData.texto;
      if (!mensajesLista.includes(texto)) {
        scene.remove(s);
        const idx = mensajesFlotantes.indexOf(s);
        if (idx > -1) mensajesFlotantes.splice(idx, 1);
        mensajesRenderizados.delete(texto);
      }
    });
  });
}