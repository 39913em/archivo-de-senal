
import * as THREE from 'three';
import { scene } from './escena-3d.js';
import { ESTADO } from './estado-jardin.js';

const CONFIG_PASTO = {
  CANTIDAD_HERRAS: 12000,            
  ALTURA_MIN: 0.08,
  ALTURA_MAX: 0.50,                  
  RADIO_MIN: 0.003,
  RADIO_MAX: 0.012,
  RADIO_DISTRIBUCION: 8.0,           
  DENSIDAD_GLOBAL: 0.95,             
  SEGMENTOS_VERTICALES: 2,
  INCLINACION_MAX: 0.15,
};

const CONFIG_ARBUSTOS = {
  CANTIDAD: 20,
  RADIO_MIN: 1.0,
  RADIO_MAX: 4.5,
  TAMAÑO_MIN: 0.1,
  TAMAÑO_MAX: 0.25,
};

let pastoGroup = null;
let arbustosGroup = null;
let hebrasData = [];
let arbustosData = [];


function generarPosicionesPasto(cantidad, radioMax, densidad) {
  const posiciones = [];
  const maxIntentos = cantidad * 20;
  let intentos = 0;

  while (posiciones.length < cantidad && intentos < maxIntentos) {
    intentos++;
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.random() * radioMax;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;

    if (Math.random() < densidad) {
      posiciones.push({ x, z });
    }
  }

  while (posiciones.length < cantidad) {
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.random() * radioMax;
    posiciones.push({
      x: Math.cos(ang) * rad,
      z: Math.sin(ang) * rad,
    });
  }

  return posiciones;
}

function crearPasto() {
  if (pastoGroup) {
    scene.remove(pastoGroup);
    pastoGroup = null;
    hebrasData = [];
  }

  const cantidad = CONFIG_PASTO.CANTIDAD_HERRAS;
  const posiciones = generarPosicionesPasto(
    cantidad,
    CONFIG_PASTO.RADIO_DISTRIBUCION,
    CONFIG_PASTO.DENSIDAD_GLOBAL
  );

  pastoGroup = new THREE.Group();

  const colorOscuro = new THREE.Color(0x1a4a1a);
  const colorClaro = new THREE.Color(0x4a8a3a);
  const colorMedio = new THREE.Color(0x2d6a2a);

  const geoBase = new THREE.CylinderGeometry(1, 1, 1, 3, CONFIG_PASTO.SEGMENTOS_VERTICALES);
  geoBase.translate(0, 0.5, 0);

  const material = new THREE.MeshStandardMaterial({
    roughness: 0.7,
    metalness: 0.0,
    flatShading: true,
  });

  posiciones.forEach(pos => {
    const altura = CONFIG_PASTO.ALTURA_MIN + Math.random() * (CONFIG_PASTO.ALTURA_MAX - CONFIG_PASTO.ALTURA_MIN);
    const radio = CONFIG_PASTO.RADIO_MIN + Math.random() * (CONFIG_PASTO.RADIO_MAX - CONFIG_PASTO.RADIO_MIN);
    const inclinacion = (Math.random() - 0.5) * CONFIG_PASTO.INCLINACION_MAX * 2;
    const rotacion = Math.random() * Math.PI * 2;

    const geo = geoBase.clone();
    const scaleY = altura;
    const scaleXZ = radio;
    const matrix = new THREE.Matrix4().makeScale(scaleXZ, scaleY, scaleXZ);
    geo.applyMatrix4(matrix);

    const mixFactor = 0.3 + (altura - CONFIG_PASTO.ALTURA_MIN) / (CONFIG_PASTO.ALTURA_MAX - CONFIG_PASTO.ALTURA_MIN) * 0.5;
    const color = colorMedio.clone().lerp(colorClaro, mixFactor);
    color.multiplyScalar(0.8 + Math.random() * 0.4);
    material.color.set(color);

    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(pos.x, 0, pos.z);
    mesh.rotation.y = rotacion;
    mesh.rotation.z = inclinacion;
    mesh.rotation.x = (Math.random() - 0.5) * CONFIG_PASTO.INCLINACION_MAX * 0.5;

    mesh.userData = {
      altura: altura,
      inclinacionBaseZ: mesh.rotation.z,
      inclinacionBaseX: mesh.rotation.x,
      fase: Math.random() * Math.PI * 2,
      velocidadViento: 0.15 + Math.random() * 0.25,
      posicionOriginal: new THREE.Vector3(pos.x, 0, pos.z),
    };

    pastoGroup.add(mesh);
    hebrasData.push(mesh);
  });

  scene.add(pastoGroup);
  console.log(`🌿 Pasto: ${pastoGroup.children.length} hebras`);
}


function crearArbustos() {
  if (arbustosGroup) {
    scene.remove(arbustosGroup);
    arbustosGroup = null;
    arbustosData = [];
  }

  arbustosGroup = new THREE.Group();
  const cantidad = CONFIG_ARBUSTOS.CANTIDAD;

  for (let i = 0; i < cantidad; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const radio = CONFIG_ARBUSTOS.RADIO_MIN + Math.random() * (CONFIG_ARBUSTOS.RADIO_MAX - CONFIG_ARBUSTOS.RADIO_MIN);
    const x = Math.cos(angulo) * radio;
    const z = Math.sin(angulo) * radio;

    const tamaño = CONFIG_ARBUSTOS.TAMAÑO_MIN + Math.random() * (CONFIG_ARBUSTOS.TAMAÑO_MAX - CONFIG_ARBUSTOS.TAMAÑO_MIN);
    const color = new THREE.Color(0.15 + Math.random() * 0.3, 0.4 + Math.random() * 0.4, 0.05 + Math.random() * 0.2);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.8,
      metalness: 0.0,
      flatShading: true,
    });

    const arbusto = new THREE.Mesh(new THREE.SphereGeometry(tamaño, 5, 5), material);
    arbusto.position.set(x, 0.02, z);
    arbusto.scale.set(1, 0.6 + Math.random() * 0.6, 1);
    arbusto.castShadow = true;
    arbusto.receiveShadow = true;

    arbusto.userData = {
      fase: Math.random() * Math.PI * 2,
      velocidad: 0.1 + Math.random() * 0.2,
      posicionBase: new THREE.Vector3(x, 0.02, z),
      escalaBase: new THREE.Vector3(1, 0.6 + Math.random() * 0.6, 1),
    };

    arbustosGroup.add(arbusto);
    arbustosData.push(arbusto);
  }

  scene.add(arbustosGroup);
  console.log(`🌳 Arbustos: ${arbustosGroup.children.length}`);
}

export function crearVegetacion() {
  crearPasto();
  crearArbustos();
}

export function actualizarVegetacion(time) {
  if (pastoGroup) {
    if (ESTADO.muerto) {
      pastoGroup.visible = false;
    } else {
      pastoGroup.visible = true;
    }

    const viento = Math.sin(time * 0.35) * 0.035;
    const viento2 = Math.cos(time * 0.25 + 1.2) * 0.025;

    hebrasData.forEach((mesh) => {
      const data = mesh.userData;
      if (!data) return;

      const oscZ = Math.sin(time * data.velocidadViento + data.fase) * 0.025;
      const oscX = Math.cos(time * data.velocidadViento * 0.7 + data.fase * 1.3) * 0.02;

      mesh.rotation.z = data.inclinacionBaseZ + oscZ + viento;
      mesh.rotation.x = data.inclinacionBaseX + oscX + viento2;

      const offsetX = Math.sin(time * data.velocidadViento * 0.4 + data.fase) * 0.003;
      const offsetZ = Math.cos(time * data.velocidadViento * 0.5 + data.fase * 1.2) * 0.003;
      mesh.position.x = data.posicionOriginal.x + offsetX;
      mesh.position.z = data.posicionOriginal.z + offsetZ;

      const integridad = ESTADO.integridad / 100;
      const colorTarget = new THREE.Color(
        0.1 + integridad * 0.3,
        0.3 + integridad * 0.5,
        0.05 + integridad * 0.2
      );
      if (mesh.material.color) {
        mesh.material.color.lerp(colorTarget, 0.01);
      }
    });
  }

  if (arbustosGroup) {
    if (ESTADO.muerto) {
      arbustosGroup.visible = false;
    } else {
      arbustosGroup.visible = true;
    }

    arbustosData.forEach((arbusto) => {
      const data = arbusto.userData;
      if (!data) return;

      const osc = Math.sin(time * data.velocidad + data.fase) * 0.01;
      arbusto.rotation.z = osc;
      arbusto.rotation.x = Math.sin(time * data.velocidad * 0.7 + data.fase * 1.2) * 0.008;

      const respiro = 1 + Math.sin(time * data.velocidad * 0.4 + data.fase) * 0.02;
      arbusto.scale.x = data.escalaBase.x * respiro;
      arbusto.scale.z = data.escalaBase.z * respiro;
    });
  }
}

export function limpiarVegetacion() {
  if (pastoGroup) {
    scene.remove(pastoGroup);
    pastoGroup = null;
    hebrasData = [];
  }
  if (arbustosGroup) {
    scene.remove(arbustosGroup);
    arbustosGroup = null;
    arbustosData = [];
  }
}

console.log('✅ vegetacion.js cargado');