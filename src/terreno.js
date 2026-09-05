
import * as THREE from 'three';
import { scene } from './escena-3d.js';

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


export function crearTerreno() {
  const RADIO_PISO = 8.0; 

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


  crearPasto();
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