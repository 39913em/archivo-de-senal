
import * as THREE from 'three';
import { CONFIG, ESCALA_SEÑAL, ESCALA_RESONANCIA, RANGO_DERIVA, RANGO_FRACTURA, datosColumna } from './datos.js';
import { ESTADO } from './estado-jardin.js';
import { tocarSonidoElemento } from './sonido.js';
import { scene } from './escena-3d.js';

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

export function crearColumnas() {
  datosColumna.forEach(d => {
    const c = crearColumna(d.label, d.color, d.forma);
    scene.add(c);
  });
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

export function obtenerTodosLosElementos() {
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

export function activarElemento(elemento) {
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

export function animarColumnas(time) {
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

export function animarCorrupcionColumnas(tiempo) {
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
}
