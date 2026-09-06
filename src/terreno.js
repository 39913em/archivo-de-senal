import * as THREE from 'three';
import { scene } from './escena-3d.js';

export const pasto = [];



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