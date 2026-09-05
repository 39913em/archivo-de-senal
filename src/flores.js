
import * as THREE from 'three';
import { scene, camera, renderer } from './escena-3d.js';
import { ESTADO, cambiarVida } from './estado-jardin.js';
import { playSound } from './sonido.js';
import { datosColumna } from './datos.js';

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

export function animarLluviaPetales() {
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

export function iniciarInteraccionFlores() {
  const raycaster = new THREE.Raycaster();

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
}
