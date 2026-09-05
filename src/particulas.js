
import * as THREE from 'three';
import { scene } from './escena-3d.js';
import { ESTADO } from './estado-jardin.js';

const CONFIG_PARTICULAS = {
  CANTIDAD: 150,          
  TAMAÑO_MIN: 0.02,
  TAMAÑO_MAX: 0.08,
  VELOCIDAD: 0.003,
  AREA: 12,               
  ALTURA_MIN: 0.3,
  ALTURA_MAX: 4.5,
};

let sistemaParticulas = null;
let geometria = null;
let material = null;
let posiciones = null;
let velocidades = null;
let fases = null;
let inicio = 0;

export function crearParticulas() {
  if (sistemaParticulas) {
    scene.remove(sistemaParticulas);
    sistemaParticulas.geometry.dispose();
    sistemaParticulas.material.dispose();
  }

  const cantidad = CONFIG_PARTICULAS.CANTIDAD;
  const area = CONFIG_PARTICULAS.AREA;

  geometria = new THREE.BufferGeometry();
  posiciones = new Float32Array(cantidad * 3);
  velocidades = new Float32Array(cantidad);
  fases = new Float32Array(cantidad);
  const colores = new Float32Array(cantidad * 3);

  for (let i = 0; i < cantidad; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const radio = Math.sqrt(Math.random()) * area; 
    const x = Math.cos(angulo) * radio;
    const z = Math.sin(angulo) * radio;
    const y = CONFIG_PARTICULAS.ALTURA_MIN + Math.random() * (CONFIG_PARTICULAS.ALTURA_MAX - CONFIG_PARTICULAS.ALTURA_MIN);

    posiciones[i * 3] = x;
    posiciones[i * 3 + 1] = y;
    posiciones[i * 3 + 2] = z;

    velocidades[i] = 0.002 + Math.random() * 0.006;
    fases[i] = Math.random() * Math.PI * 2;

    const color = new THREE.Color().setHSL(0.12 + Math.random() * 0.08, 0.5 + Math.random() * 0.3, 0.7 + Math.random() * 0.3);
    colores[i * 3] = color.r;
    colores[i * 3 + 1] = color.g;
    colores[i * 3 + 2] = color.b;
  }

  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geometria.setAttribute('color', new THREE.BufferAttribute(colores, 3));

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,200,0.8)');
  grad.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const textura = new THREE.CanvasTexture(canvas);

  // Material
  material = new THREE.PointsMaterial({
    size: CONFIG_PARTICULAS.TAMAÑO_MIN + Math.random() * (CONFIG_PARTICULAS.TAMAÑO_MAX - CONFIG_PARTICULAS.TAMAÑO_MIN),
    map: textura,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
    opacity: 0.8,
  });

  sistemaParticulas = new THREE.Points(geometria, material);
  scene.add(sistemaParticulas);
  inicio = Date.now();

  console.log('✨ Sistema de partículas creado');
}

export function actualizarParticulas(time) {
  if (!sistemaParticulas) return;

  const pos = sistemaParticulas.geometry.attributes.position.array;
  const ahora = Date.now();
  const dt = (ahora - inicio) * 0.001;

  const intensidad = Math.max(0.1, ESTADO.vida / 20);
  const opacity = Math.min(1, intensidad);

  for (let i = 0; i < pos.length / 3; i++) {
    const i3 = i * 3;
    const vel = velocidades[i] || 0.003;
    const fase = fases[i] || 0;

    const angulo = dt * vel + fase;
    const radioOscilacion = 0.3 + Math.sin(fase * 2) * 0.2;

    const oscY = Math.sin(dt * 0.5 + fase * 1.3) * 0.2;

    const dx = Math.sin(angulo) * radioOscilacion * 0.1;
    const dz = Math.cos(angulo * 0.7) * radioOscilacion * 0.1;

    if (!sistemaParticulas.userData.posBase) {
      sistemaParticulas.userData.posBase = new Float32Array(pos);
    }
    const base = sistemaParticulas.userData.posBase;

    pos[i3] = base[i3] + dx;
    pos[i3 + 1] = base[i3 + 1] + oscY + Math.sin(angulo * 0.5) * 0.05;
    pos[i3 + 2] = base[i3 + 2] + dz;
  }

  sistemaParticulas.geometry.attributes.position.needsUpdate = true;
  sistemaParticulas.material.opacity = 0.3 + opacity * 0.6;
  sistemaParticulas.material.size = CONFIG_PARTICULAS.TAMAÑO_MIN + (CONFIG_PARTICULAS.TAMAÑO_MAX - CONFIG_PARTICULAS.TAMAÑO_MIN) * intensidad;
}


export function limpiarParticulas() {
  if (sistemaParticulas) {
    scene.remove(sistemaParticulas);
    sistemaParticulas.geometry.dispose();
    sistemaParticulas.material.dispose();
    sistemaParticulas = null;
    console.log('✨ Partículas eliminadas');
  }
}