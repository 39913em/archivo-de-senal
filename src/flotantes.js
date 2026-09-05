
import * as THREE from 'three';
import { scene, camera, renderer } from './escena-3d.js';
import { ESTADO } from './estado-jardin.js';
import { db } from './main.js';
import { ref, onValue, set } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';
import { generarBotonesCompartir } from './ui-botones.js';

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

export function animarFlotantes(tiempo) {
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
}

export function iniciarInteraccionFlotantes() {
  const raycaster = new THREE.Raycaster();

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
}


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