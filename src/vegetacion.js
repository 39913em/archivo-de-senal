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

const CONFIG_ANEMONA = {
  CANTIDAD: 12,
  RADIO_MIN: 1.8,
  RADIO_MAX: 5.2,
  TAMANO_MIN: 0.06,
  TAMANO_MAX: 0.14,
  TENTACULOS_MIN: 14,
  TENTACULOS_MAX: 22,
  TENTACULO_RADIO: 0.004,
  TENTACULO_SEGMENTOS: 12,
  CURVA_SUAVIDAD: 0.6,
  COLORES_CUERPO: [
    new THREE.Color(0xff8a9e),
    new THREE.Color(0xff6b8a),
    new THREE.Color(0xddaaff),
    new THREE.Color(0x99ccff),
    new THREE.Color(0xffb38a),
    new THREE.Color(0xff77aa),
  ],
  COLORES_PUNTA: [
    new THREE.Color(0xffccdd),
    new THREE.Color(0xffaacc),
    new THREE.Color(0xeeccff),
    new THREE.Color(0xccddff),
    new THREE.Color(0xffddcc),
    new THREE.Color(0xffccee),
  ],
};

let pastoGroup = null;
let anemonaGroup = null;
let hebrasData = [];
let anemonasData = [];
export const mimosas = [];

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
  console.log(`🌿 Pasto OK`);
}

function crearAnemona() {
  if (anemonaGroup) {
    scene.remove(anemonaGroup);
    anemonaGroup = null;
    anemonasData = [];
  }

  anemonaGroup = new THREE.Group();
  const cantidad = CONFIG_ANEMONA.CANTIDAD;

  for (let i = 0; i < cantidad; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const radio = CONFIG_ANEMONA.RADIO_MIN + Math.random() * (CONFIG_ANEMONA.RADIO_MAX - CONFIG_ANEMONA.RADIO_MIN);
    const x = Math.cos(angulo) * radio;
    const z = Math.sin(angulo) * radio;

    const tamaño = CONFIG_ANEMONA.TAMANO_MIN + Math.random() * (CONFIG_ANEMONA.TAMANO_MAX - CONFIG_ANEMONA.TAMANO_MIN);
    const numTentaculos = Math.floor(CONFIG_ANEMONA.TENTACULOS_MIN + Math.random() * (CONFIG_ANEMONA.TENTACULOS_MAX - CONFIG_ANEMONA.TENTACULOS_MIN));

    const idxColor = Math.floor(Math.random() * CONFIG_ANEMONA.COLORES_CUERPO.length);
    const colorCuerpo = CONFIG_ANEMONA.COLORES_CUERPO[idxColor].clone();
    const colorPunta = CONFIG_ANEMONA.COLORES_PUNTA[idxColor].clone();
    const colorBase = colorCuerpo.clone().lerp(new THREE.Color(0xffffff), 0.1);

    const grupo = new THREE.Group();
    grupo.position.set(x, 0, z);

    const cuerpoMat = new THREE.MeshStandardMaterial({
      color: colorBase,
      roughness: 0.6,
      metalness: 0.05,
      emissive: colorBase,
      emissiveIntensity: 0.05,
    });
    const cuerpoGeo = new THREE.SphereGeometry(tamaño * 0.5, 8, 8);
    const cuerpo = new THREE.Mesh(cuerpoGeo, cuerpoMat);
    cuerpo.scale.set(1, 0.4 + Math.random() * 0.2, 1);
    cuerpo.position.y = tamaño * 0.15;
    grupo.add(cuerpo);

    const tentaculoMat = new THREE.MeshStandardMaterial({
      color: colorCuerpo,
      roughness: 0.4,
      metalness: 0.0,
      emissive: colorCuerpo,
      emissiveIntensity: 0.04,
    });

    const tentaculos = [];

    for (let j = 0; j < numTentaculos; j++) {
      const anguloTent = (j / numTentaculos) * Math.PI * 2 + Math.random() * 0.15;
      const radioTent = tamaño * (0.6 + Math.random() * 0.35);
      const alturaBase = tamaño * 0.15;

      const puntos = [];
      const numSegmentos = CONFIG_ANEMONA.TENTACULO_SEGMENTOS;
      const radioCurva = CONFIG_ANEMONA.CURVA_SUAVIDAD * (0.4 + Math.random() * 0.4);

      for (let k = 0; k <= numSegmentos; k++) {
        const t = k / numSegmentos;
        const ang = anguloTent + t * radioCurva * 0.6 + Math.sin(t * 5) * 0.03;
        const r = radioTent * (1 - t * 0.7);
        const y = alturaBase + t * tamaño * 0.9;

        const px = Math.cos(ang) * r;
        const pz = Math.sin(ang) * r;
        const py = y;

        puntos.push(new THREE.Vector3(px, py, pz));
      }

      const curva = new THREE.CatmullRomCurve3(puntos);
      const tuboGeo = new THREE.TubeGeometry(curva, 8, CONFIG_ANEMONA.TENTACULO_RADIO * (0.6 + Math.random() * 0.4), 4, false);

      const matTent = tentaculoMat.clone();
      const gradColor = colorCuerpo.clone().lerp(colorPunta, 0.3);
      matTent.color.set(gradColor);
      matTent.emissive.set(gradColor);
      matTent.emissiveIntensity = 0.03;

      const tentaculo = new THREE.Mesh(tuboGeo, matTent);
      tentaculo.castShadow = true;

      tentaculo.userData = {
        fase: Math.random() * Math.PI * 2,
        velocidad: 0.6 + Math.random() * 0.8,
        amplitud: 0.008 + Math.random() * 0.015,
        puntosBase: puntos.map(p => p.clone()),
        anguloBase: anguloTent,
        radioBase: radioTent,
        alturaBase: alturaBase,
        radioCurva: radioCurva,
      };

      grupo.add(tentaculo);
      tentaculos.push(tentaculo);
    }

    const centroMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffdd77),
      emissive: new THREE.Color(0xffaa44),
      emissiveIntensity: 0.2,
      roughness: 0.3,
    });
    const centro = new THREE.Mesh(new THREE.SphereGeometry(tamaño * 0.06, 6, 6), centroMat);
    centro.position.y = tamaño * 0.3;
    grupo.add(centro);

    grupo.userData = {
      fase: Math.random() * Math.PI * 2,
      velocidad: 0.08 + Math.random() * 0.12,
      posicionBase: new THREE.Vector3(x, 0, z),
      tentaculos: tentaculos,
      tamaño: tamaño,
    };

    anemonaGroup.add(grupo);
    anemonasData.push(grupo);
  }

  scene.add(anemonaGroup);
  console.log(`🌺 Anémonas${cantidad} `);
}

const CONFIG_MIMOSA = {
  CANTIDAD: 10,
  RADIO_MIN: 1.8,
  RADIO_MAX: 5.5,
  TALLO_ALTURA_MIN: 0.60,
  TALLO_ALTURA_MAX: 0.85,
  TALLO_RADIO: 0.005,
  RAMAS_POR_TALLO: 6,
  HOJAS_POR_RAMA: 8,
  FOLIOLO_ANCHO: 0.015,
  FOLIOLO_LARGO: 0.030,
  VELOCIDAD_CIERRE: 0.06,
  VELOCIDAD_APERTURA: 0.015,
};

class Mimosa {
  constructor(position, scale = 1) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.userData.esMimosa = true;
    this.group.userData.mimosaRef = this;

    this.cerrado = false;
    this.progresoCierre = 0;
    this.objetivoCierre = 0;

    this.ramas = [];
    this.hojas = [];

    this.build(scale);
    scene.add(this.group);
    mimosas.push(this);
  }

  build(scale) {
    const talloMat = new THREE.MeshStandardMaterial({
      color: 0x2d5a2a,
      roughness: 0.8,
      metalness: 0.0,
    });
    const hojaMat = new THREE.MeshStandardMaterial({
      color: 0x3a8a3a,
      roughness: 0.6,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const alturaTallo = CONFIG_MIMOSA.TALLO_ALTURA_MIN + Math.random() * (CONFIG_MIMOSA.TALLO_ALTURA_MAX - CONFIG_MIMOSA.TALLO_ALTURA_MIN);
    const talloGeo = new THREE.CylinderGeometry(
      CONFIG_MIMOSA.TALLO_RADIO * scale * 0.7,
      CONFIG_MIMOSA.TALLO_RADIO * scale * 1.3,
      alturaTallo,
      5
    );
    const tallo = new THREE.Mesh(talloGeo, talloMat);
    tallo.position.y = alturaTallo / 2;
    this.group.add(tallo);

    const numRamas = CONFIG_MIMOSA.RAMAS_POR_TALLO;
    for (let i = 0; i < numRamas; i++) {
      const angulo = (i / numRamas) * Math.PI * 2 + Math.random() * 0.2;
      const alturaRama = 0.05 + (i / numRamas) * alturaTallo * 0.85;
      const largoRama = 0.08 + (i / numRamas) * 0.14 * scale;

      const ramaGroup = new THREE.Group();
      ramaGroup.position.set(0, alturaRama, 0);
      ramaGroup.rotation.y = angulo;
      ramaGroup.rotation.x = -0.25 + (i / numRamas) * 0.45;

      const raquisGeo = new THREE.CylinderGeometry(
        0.0025 * scale,
        0.004 * scale,
        largoRama,
        3
      );
      const raquis = new THREE.Mesh(raquisGeo, talloMat);
      raquis.position.y = largoRama / 2;
      raquis.rotation.z = Math.PI / 2;
      ramaGroup.add(raquis);

      const numPares = CONFIG_MIMOSA.HOJAS_POR_RAMA;
      for (let j = 0; j < numPares; j++) {
        const t = (j + 0.5) / numPares;
        const posX = (t - 0.5) * largoRama * 0.75;

        for (let lado = -1; lado <= 1; lado += 2) {
          const foliolo = new THREE.Mesh(
            new THREE.PlaneGeometry(
              CONFIG_MIMOSA.FOLIOLO_ANCHO * scale,
              CONFIG_MIMOSA.FOLIOLO_LARGO * scale
            ),
            hojaMat
          );
          foliolo.position.set(
            posX,
            0.004 * scale,
            lado * 0.015 * scale
          );
          foliolo.rotation.y = lado * 0.35;
          foliolo.rotation.x = -0.1;
          foliolo.userData.esHoja = true;
          foliolo.userData.anguloBase = (lado > 0) ? 0.35 : -0.35;
          foliolo.userData.anguloActual = foliolo.userData.anguloBase;
          foliolo.userData.ramaPadre = ramaGroup;

          const pecGeo = new THREE.CylinderGeometry(0.001 * scale, 0.001 * scale, 0.006 * scale, 2);
          const pec = new THREE.Mesh(pecGeo, talloMat);
          pec.position.set(posX, 0, lado * 0.012 * scale);
          pec.rotation.z = lado * 0.25;
          ramaGroup.add(pec);

          ramaGroup.add(foliolo);
          this.hojas.push(foliolo);
        }
      }

      this.group.add(ramaGroup);
      this.ramas.push(ramaGroup);
    }
  }

  cerrar() {
    if (this.cerrado) return;
    this.cerrado = true;
    this.objetivoCierre = 1;
  }

  abrir() {
    if (!this.cerrado) return;
    this.cerrado = false;
    this.objetivoCierre = 0;
  }

  update(time) {
    if (this.progresoCierre < this.objetivoCierre) {
      this.progresoCierre = Math.min(1, this.progresoCierre + CONFIG_MIMOSA.VELOCIDAD_CIERRE);
    } else if (this.progresoCierre > this.objetivoCierre) {
      this.progresoCierre = Math.max(0, this.progresoCierre - CONFIG_MIMOSA.VELOCIDAD_APERTURA);
    }

    this.hojas.forEach(hoja => {
      const anguloBase = hoja.userData.anguloBase;
      const anguloCierre = anguloBase * (1 - this.progresoCierre * 0.9);
      hoja.rotation.y = anguloCierre;
      hoja.rotation.x = -0.1 - this.progresoCierre * 0.4;
      const escalaCierre = 1 - this.progresoCierre * 0.5;
      hoja.scale.set(escalaCierre, escalaCierre, 1);
    });

    this.ramas.forEach((rama, i) => {
      const wind = Math.sin(time * 0.5 + i * 0.7) * 0.003 * (1 - this.progresoCierre * 0.7);
      rama.rotation.x += wind;
    });
  }
}

function crearMimosas() {
  const cantidad = CONFIG_MIMOSA.CANTIDAD;
  for (let i = 0; i < cantidad; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const radio = CONFIG_MIMOSA.RADIO_MIN + Math.random() * (CONFIG_MIMOSA.RADIO_MAX - CONFIG_MIMOSA.RADIO_MIN);
    const x = Math.cos(angulo) * radio;
    const z = Math.sin(angulo) * radio;
    const escala = 0.9 + Math.random() * 0.5;

    const pos = new THREE.Vector3(x, 0, z);
    new Mimosa(pos, escala);
  }
  console.log(`🌿Mimosas ${cantidad}`);
}

export function crearVegetacion() {
  crearPasto();
  crearAnemona();
  crearMimosas();
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

  if (anemonaGroup) {
    if (ESTADO.muerto) {
      anemonaGroup.visible = false;
    } else {
      anemonaGroup.visible = true;
    }

    anemonasData.forEach((grupo) => {
      const data = grupo.userData;
      if (!data) return;

      const osc = Math.sin(time * data.velocidad + data.fase) * 0.003;
      grupo.rotation.z = osc;
      grupo.rotation.x = Math.sin(time * data.velocidad * 0.7 + data.fase * 1.2) * 0.002;

      data.tentaculos.forEach((tentaculo) => {
        const ud = tentaculo.userData;
        if (!ud) return;

        const puntos = ud.puntosBase.map((p, idx) => {
          const t = idx / ud.puntosBase.length;
          const wave = Math.sin(time * ud.velocidad + ud.fase + t * 1.2) * ud.amplitud;
          const ang = ud.anguloBase + t * ud.radioCurva * 0.5 + wave * 0.15;
          const r = ud.radioBase * (1 - t * 0.7) + wave * 0.005;
          const y = ud.alturaBase + t * data.tamaño * 0.9 + Math.sin(time * ud.velocidad * 0.6 + ud.fase + t * 0.4) * 0.004;

          const px = Math.cos(ang) * r;
          const pz = Math.sin(ang) * r;
          return new THREE.Vector3(px, y, pz);
        });

        const curva = new THREE.CatmullRomCurve3(puntos);
        const nuevaGeo = new THREE.TubeGeometry(curva, 8, CONFIG_ANEMONA.TENTACULO_RADIO * (0.6 + Math.random() * 0.1), 4, false);
        tentaculo.geometry.dispose();
        tentaculo.geometry = nuevaGeo;
      });
    });
  }

  mimosas.forEach(m => m.update(time));

  if (ESTADO.muerto) {
    mimosas.forEach(m => {
      m.objetivoCierre = 1;
    });
  }
}

export function limpiarVegetacion() {
  if (pastoGroup) {
    scene.remove(pastoGroup);
    pastoGroup = null;
    hebrasData = [];
  }
  if (anemonaGroup) {
    scene.remove(anemonaGroup);
    anemonaGroup = null;
    anemonasData = [];
  }
  mimosas.forEach(m => {
    scene.remove(m.group);
  });
  mimosas.length = 0;
}

console.log('✅ vegetacion OK ');