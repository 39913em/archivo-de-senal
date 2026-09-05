
import * as THREE from 'three';
import { scene } from './escena-3d.js';
import { ESTADO } from './estado-jardin.js';

const CONFIG_FONDO = {
  ESTRELLAS: 2000,
  RADIO_FONDO: 50,
  AURORA_ALTURA: 8,
};

let fondoGroup = null;
let estrellasData = [];
let auroraMesh = null;

function crearEstrellas() {
  const grupo = new THREE.Group();
  const cantidad = CONFIG_FONDO.ESTRELLAS;
  const radio = CONFIG_FONDO.RADIO_FONDO;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(cantidad * 3);
  const sizes = new Float32Array(cantidad);
  const colors = new Float32Array(cantidad * 3);

  for (let i = 0; i < cantidad; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI / 2; 
    const r = radio * (0.3 + Math.random() * 0.7);

    positions[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
    positions[i * 3 + 1] = Math.cos(phi) * r * 0.6 + 2; 
    positions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;

    sizes[i] = 0.02 + Math.random() * 0.06;

    const tint = Math.random();
    if (tint < 0.1) {
      colors[i * 3] = 0.8;
      colors[i * 3 + 1] = 0.6;
      colors[i * 3 + 2] = 0.3;
    } else if (tint < 0.2) {
      colors[i * 3] = 0.6;
      colors[i * 3 + 1] = 0.7;
      colors[i * 3 + 2] = 0.9;
    } else {
      colors[i * 3] = 0.9 + Math.random() * 0.1;
      colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
      colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.PointsMaterial({
    size: 0.05,
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.8,
    vertexColors: true,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'estrellas';
  grupo.add(points);

  estrellasData = {
    geometry,
    material,
    sizes: sizes.slice(),
    phases: Array.from({ length: cantidad }, () => Math.random() * Math.PI * 2),
  };

  return grupo;
}

function crearAurora() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(10, 15, 30, 0)');     
  grad.addColorStop(0.3, 'rgba(20, 10, 50, 0.1)');
  grad.addColorStop(0.5, 'rgba(40, 20, 80, 0.2)');
  grad.addColorStop(0.7, 'rgba(20, 40, 60, 0.15)');
  grad.addColorStop(1, 'rgba(5, 10, 20, 0)');      

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 10; i++) {
    const x = Math.random() * 512;
    const y = 50 + Math.random() * 150;
    const rad = 30 + Math.random() * 80;
    const r = Math.random() * 0.3 + 0.1;
    const g = Math.random() * 0.3 + 0.1;
    const b = Math.random() * 0.4 + 0.2;
    const grad2 = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad2.addColorStop(0, `rgba(${r*255}, ${g*255}, ${b*255}, 0.15)`);
    grad2.addColorStop(1, `rgba(${r*255}, ${g*255}, ${b*255}, 0)`);
    ctx.fillStyle = grad2;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const geometry = new THREE.CircleGeometry(CONFIG_FONDO.RADIO_FONDO * 0.8, 32);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = CONFIG_FONDO.AURORA_ALTURA;
  mesh.position.z = -CONFIG_FONDO.RADIO_FONDO * 0.3;
  mesh.name = 'aurora';

  return mesh;
}

export function crearFondo() {
  if (fondoGroup) {
    scene.remove(fondoGroup);
    fondoGroup = null;
  }

  fondoGroup = new THREE.Group();

  const estrellas = crearEstrellas();
  fondoGroup.add(estrellas);

  const aurora = crearAurora();
  fondoGroup.add(aurora);
  auroraMesh = aurora;

  scene.add(fondoGroup);
  console.log('🌌 FondoIni');
}

export function actualizarFondo(time) {
  if (!fondoGroup) return;

  const estrellas = fondoGroup.getObjectByName('estrellas');
  if (estrellas && estrellas.isPoints && estrellasData.geometry) {
    const sizes = estrellasData.geometry.attributes.size;
    if (sizes) {
      const array = sizes.array;
      for (let i = 0; i < array.length; i++) {
        const phase = estrellasData.phases[i] || 0;
        const parpadeo = 0.6 + 0.4 * Math.sin(time * (0.5 + i * 0.001) + phase);
        array[i] = estrellasData.sizes[i] * parpadeo;
      }
      sizes.needsUpdate = true;
    }
  }

  if (auroraMesh && auroraMesh.material) {
    const integridad = ESTADO.integridad / 100;
    const opacity = ESTADO.muerto ? 0.2 : 0.4 + integridad * 0.4;
    auroraMesh.material.opacity = opacity;

    const targetColor = new THREE.Color(
      0.1 + integridad * 0.3,
      0.05 + integridad * 0.2,
      0.2 + integridad * 0.4
    );
    if (auroraMesh.material.color) {
      auroraMesh.material.color.lerp(targetColor, 0.01);
    }
  }

  if (fondoGroup) {
    fondoGroup.rotation.y = time * 0.001;
  }
}

export function limpiarFondo() {
  if (fondoGroup) {
    scene.remove(fondoGroup);
    fondoGroup = null;
  }
  estrellasData = {};
  auroraMesh = null;
}

console.log('✅ fondo.js OK');