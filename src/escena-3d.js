
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LEXICO_INICIAL, datosColumna, BANCO_ERROR_PARRAFO, BANCO_BLOQUEO_CITA } from './datos.js';
import { ESTADO, avisoTemporal, guardarEstado, actualizarUI } from './estado-jardin.js';
import { playPageTurn } from './sonido.js';
import { rand, probabilidadBloqueo } from './utils.js';
import { actualizarCriaturas } from './criaturas.js';
import { actualizarParticulas } from './particulas.js';
import { actualizarFondo } from './fondo.js';
import { actualizarVegetacion } from './vegetacion.js';
import { columnas, crearColumnas, activarElemento, obtenerTodosLosElementos, animarColumnas, animarCorrupcionColumnas } from './columnas.js';
import { crearTerreno, animarPasto } from './terreno.js';
import { animarFlores, animarLluviaPetales, iniciarInteraccionFlores } from './flores.js';
import { animarFlotantes, iniciarInteraccionFlotantes } from './flotantes.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

export const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(8, 6, 12);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI / 2.1;
controls.target.set(0, 1.5, 0);
controls.update();

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

export const guardian = new THREE.Group();
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

export const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 0.5 }));
led.position.set(0, 0.7, 0.35);
led.name = 'led';
guardian.add(led);

guardian.position.set(0, 0, 0);
scene.add(guardian);


crearColumnas();

crearTerreno();

const raycaster = new THREE.Raycaster();

function armarEnsayoSegunEstado(ensayo, integridad, muerto) {
  const partes = [];
  ensayo.bloques.forEach(b => {
    if (b.tipo === 'subtitulo') { partes.push({ tipo: b.tipo, texto: b.texto }); return; }
    if (b.tipo === 'cita') {
      const bloquear = muerto ? true : Math.random() < probabilidadBloqueo(integridad);
      partes.push({ tipo: b.tipo, texto: bloquear ? rand(BANCO_BLOQUEO_CITA) : b.texto, bloqueada: bloquear });
      return;
    }
    if (muerto) partes.push({ tipo: b.tipo, texto: disolucionLibre(), modo: 'disuelto' });
    else if (Math.random() < probabilidadBloqueo(integridad)) partes.push({ tipo: b.tipo, texto: rand(BANCO_ERROR_PARRAFO), modo: 'bloqueado' });
    else partes.push({ tipo: b.tipo, texto: b.texto, modo: 'legible' });
  });
  return partes;
}

function disolucionLibre() {
  const todas = ['señal','resonancia','fractura','deriva'].flatMap(c => {
    const inicial = LEXICO_INICIAL[c] || [];
    return [...inicial];
  });
  const n = 5 + Math.floor(Math.random() * 5);
  const piezas = []; for (let i = 0; i < n; i++) piezas.push(rand(todas));
  const glifos = ['░','▒','▓','█','▄','▀'];
  return piezas.join(' ') + ' ' + glifos[Math.floor(Math.random() * glifos.length)].repeat(1 + Math.floor(Math.random() * 3));
}

renderer.domElement.addEventListener('click', async e => {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);

  const planos = [];
  columnas.forEach(col => col.children.forEach(c => {
    if (c.isMesh && c.userData && c.userData.esBoton) planos.push(c);
  }));
  const hitsSprite = raycaster.intersectObjects(planos);

  if (hitsSprite.length) {
    const label = hitsSprite[0].object.userData.label;
    const colData = datosColumna.find(d => d.label === label);

    const partes = armarEnsayoSegunEstado(colData.ensayo, ESTADO.integridad, ESTADO.muerto);
    const sufijoEstado = ESTADO.muerto ? 'silencio' : (ESTADO.corrompido ? 'interferencia' : 'senal');
    const element = document.createElement('div');
    element.style.cssText = 'padding:30px;font-family:Georgia,serif;color:#1a1a1a;background:#fafafa;max-width:700px;margin:0 auto';
    let html = `<div style="text-align:center;border-bottom:2px solid #ff6b35;padding-bottom:15px;margin-bottom:15px">
      <h1 style="font-size:24px;margin:0;color:#0a0a0a">JARDÍN DEL ORÁCULO</h1>
      <p style="font-size:11px;color:#666;letter-spacing:1px;text-transform:uppercase">Archivo de Señal</p></div>`;
    html += `<div style="margin-bottom:15px">
      <h2 style="font-size:20px;margin:0 0 4px">${colData.ensayo.titulo}</h2>
      <p style="font-size:11px;color:#999">${label} · ${sufijoEstado.toUpperCase()}</p></div>`;
    partes.forEach(b => {
      if (b.tipo === 'subtitulo') html += `<p style="font-size:14px;color:#555;font-style:italic;margin:0 0 10px">${b.texto}</p>`;
      else if (b.tipo === 'cita') html += `<p style="font-size:13px;color:${b.bloqueada?'#999':'#333'};border-left:3px solid #ff6b35;padding-left:10px;margin:10px 0;${b.bloqueada?'font-style:italic':''}">${b.texto}</p>`;
      else html += `<p style="font-size:13px;line-height:1.7;margin:0 0 10px;${b.modo==='disuelto'?'color:#900':(b.modo==='bloqueado'?'color:#666;font-style:italic':'')}">${b.texto}</p>`;
    });
    html += `<div style="margin-top:25px;border-top:1px solid #ddd;padding-top:12px;text-align:center;font-size:10px;color:#999">Archivo de Señal · ${new Date().toLocaleDateString()}</div>`;
    element.innerHTML = html;
    document.body.appendChild(element);

    try {
      const html2pdf = window.html2pdf;
      if (html2pdf) {
        await html2pdf().set({
          margin: 10,
          filename: `${label.toLowerCase().replace(/\s+/g,'_')}_${sufijoEstado}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(element).save();
      } else {
        console.warn('html2pdf no disponible');
        avisoTemporal('No se pudo generar el PDF (librería no cargada)');
      }
    } catch(err) { console.error('Error PDF:', err); }
    document.body.removeChild(element);

    if (!ESTADO.muerto) {
      ESTADO.siembras++;
      await guardarEstado();
      actualizarUI();
      playPageTurn();
    }
    return;
  }

  const todosLosElementos = obtenerTodosLosElementos();
  const hits = raycaster.intersectObjects(todosLosElementos);
  if (hits.length) {
    const elemento = hits[0].object;
    activarElemento(elemento);
  }
});

iniciarInteraccionFlotantes();
iniciarInteraccionFlores();

let tiempo = 0;

export function animarEscena() {
  requestAnimationFrame(animarEscena);
  tiempo += 0.01;

  const vidaFrac = Math.max(0, Math.min(1, ESTADO.vida / 10));
  const bpm = ESTADO.muerto ? 0.4 : 1.0 + vidaFrac * 2.2;
  const latido = Math.pow(Math.max(0, Math.sin(tiempo * bpm * 3)), 6);
  const colorLed = ESTADO.muerto ? 0x552222 : (ESTADO.corrompido ? 0xff8a30 : 0x00e676);
  led.material.color.setHex(colorLed);
  led.material.emissive.setHex(colorLed);
  led.material.emissiveIntensity = ESTADO.muerto ? 0.08 + latido * 0.1 : 0.3 + latido * 0.9;
  led.scale.set(
    1 + latido * (ESTADO.muerto ? 0.1 : 0.5),
    1 + latido * (ESTADO.muerto ? 0.1 : 0.5),
    1 + latido * (ESTADO.muerto ? 0.1 : 0.5)
  );

  guardian.rotation.y = Math.sin(tiempo * 0.3) * 0.1;

  animarFlores();
  animarLluviaPetales();
  animarPasto();
  animarColumnas(tiempo);
  actualizarCriaturas(tiempo); 
  actualizarParticulas(tiempo);
  actualizarVegetacion(tiempo);
  actualizarFondo(tiempo);

  animarFlotantes(tiempo);

  animarCorrupcionColumnas(tiempo);

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animarEscena();
console.log('🌿 Escena 3D cargada y animación iniciada.');

animarEscena();
console.log('🌿 Escena 3D cargada y animación iniciada.');
