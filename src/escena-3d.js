import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { db } from './firebase-config.js';
import { ref, get, set, update, onValue, push } from 'firebase/database';
import { 
  ESTADO, 
  flores, 
  cambiarVida, 
  guardarEstado, 
  actualizarUI, 
  sincronizarFlores, 
  animarFloresOrganicas,
  CONFIG,
  activarRuina,
  desactivarRuina,
  scene as estadoScene,
  columnasMovimiento as estadoColumnas
} from './estado-jardin.js';

 
// THREE.JS - ESCENA Y RENDERIZADO

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(8, 6, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI / 2.1;
controls.target.set(0, 1.5, 0);
controls.update();

// Luces
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

// Guardian
const guardian = new THREE.Group();
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

const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 0.5 }));
led.position.set(0, 0.7, 0.35);
led.name = 'led';
guardian.add(led);

guardian.position.set(0, 0, 0);
scene.add(guardian);

// Datos de columnas 
const datosColumna = [
  { label:'SEÑAL', x:-4.5, z:-2.5, color:0xff6b35, forma:'cubos',
    escala:[185,220,246,277,329,369], onda:'sine',
    ensayo:{ titulo:'Señal', bloques:[
      {tipo:'subtitulo', texto:'El dato como flujo, no como masa'},
      {tipo:'parrafo', texto:'El bit que late, el pulso digital, la huella en el cache.'},
      {tipo:'parrafo', texto:'La información nunca es gratis: detrás de cada consulta hay un servidor que suda.'},
      {tipo:'cita', texto:'"Los datos no son neutros. Son huellas de un mundo que ya no puede contenerlos."'},
      {tipo:'parrafo', texto:'La señal viaja, se difumina, se pierde en el ruido.'}
    ]}},
  { label:'RESONANCIA', x:4.5, z:-2.5, color:0x4fc3f7, forma:'ondas',
    escala:[196,220,246,293,349,392], onda:'triangle',
    ensayo:{ titulo:'Resonancia', bloques:[
      {tipo:'subtitulo', texto:'El espacio que vibra'},
      {tipo:'parrafo', texto:'El silencio también construye. Cada reverberación traza una pared invisible.'},
      {tipo:'parrafo', texto:'La arquitectura no se ve: se escucha, se recorre con el cuerpo entero.'},
      {tipo:'cita', texto:'"El espacio sonoro es el único territorio que no se puede cercar."'},
      {tipo:'parrafo', texto:'Una catedral de auriculares, un umbral que se escucha.'}
    ]}},
  { label:'FRACTURA', x:-4.5, z:3.5, color:0xff1744, forma:'rota',
    escala:[146,164,174,220,246,261], onda:'sawtooth',
    ensayo:{ titulo:'Fractura', bloques:[
      {tipo:'subtitulo', texto:'El error como método'},
      {tipo:'parrafo', texto:'La memoria digital es frágil, pero el olvido está programado.'},
      {tipo:'parrafo', texto:'Lo que no se repite se pierde en el ruido de fondo.'},
      {tipo:'cita', texto:'"Toda base de datos es también una máquina de olvido selectivo."'},
      {tipo:'parrafo', texto:'Cada versión corrompida es honesta: así se ve la memoria real.'}
    ]}},
  { label:'DERIVA', x:4.5, z:3.5, color:0x00e676, forma:'flotante',
    escala:[220,246,293,329,392,440], onda:'sine',
    ensayo:{ titulo:'Deriva', bloques:[
      {tipo:'subtitulo', texto:'El flujo sin dueño'},
      {tipo:'parrafo', texto:'La cultura se siembra, no se torrentea.'},
      {tipo:'parrafo', texto:'La piratería no es un crimen: es una respuesta a una estructura injusta.'},
      {tipo:'cita', texto:'"Compartir una semilla no es lo mismo que despojar."'},
      {tipo:'parrafo', texto:'El flujo no tiene dueño. La deriva es el único destino.'}
    ]}}
];

// Escalas y rangos 
const ESCALA_SEÑAL = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];
const ESCALA_RESONANCIA = [261.63, 293.66, 329.63, 392.00, 440.00];
const RANGO_DERIVA = { min: 100, max: 600 };
const RANGO_FRACTURA = { min: 300, max: 900 };

// Columnas
const columnas = [];
const columnasMovimiento = [];

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

  // Descargar
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

  return group;
}

datosColumna.forEach(d => {
  const c = crearColumna(d.label, d.color, d.forma);
  scene.add(c);
  columnas.push(c);
});

// Suelo y círculo
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), new THREE.MeshStandardMaterial({
  color: 0x0a1a0a, roughness: 0.9, metalness: 0.1, transparent: true, opacity: 0.8
}));
suelo.rotation.x = -Math.PI / 2;
suelo.position.set(0, -0.05, 0);
suelo.receiveShadow = true;
scene.add(suelo);

const circulo = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.8, 32), new THREE.MeshStandardMaterial({
  color: 0xff6b35, emissive: 0xff6b35, emissiveIntensity: 0.05, transparent: true, opacity: 0.15, side: THREE.DoubleSide
}));
circulo.rotation.x = -Math.PI / 2;
circulo.position.set(0, -0.02, 0);
scene.add(circulo);

// PASTO

const pasto = [];

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

function crearPastoDenso() {
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

function animarPastoDenso() {
  const time = Date.now() * 0.001;
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

// EXPORTS

export {
  scene,
  camera,
  renderer,
  controls,
  guardian,
  led,
  datosColumna,
  columnas,
  columnasMovimiento,
  ESCALA_SEÑAL,
  ESCALA_RESONANCIA,
  RANGO_DERIVA,
  RANGO_FRACTURA,
  crearPastoDenso,
  animarPastoDenso,
  pasto,
  animarColumnas
};


// ANIMACIÓN DE COLUMNAS

function animarColumnas(time) {
  columnasMovimiento.forEach((col, i) => {
    const d = col.userData;
    const label = d.label;
    const movil = d.movilGroup;
    if (!movil) return;

    // Ruina
    if (d.enRuina || ESTADO.muerto) {
      col.rotation.x = -Math.PI / 2;
      col.rotation.z = 0;
      return;
    }

    // Movimiento normal
    col.rotation.x = 0;
    col.rotation.z = 0;

    const offset = i * 0.8;
    const salud = Math.max(0.12, Math.min(1, ESTADO.integridad / 100));

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