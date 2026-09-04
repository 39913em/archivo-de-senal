
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';

import { iniciarCriaturas, actualizarCriaturas } from './criaturas.js';
import { crearParticulas } from './particulas.js';
import { crearVegetacion } from './vegetacion.js';
import { crearFondo } from './fondo.js';

import {
  ESTADO,
  actualizarUI,
  cambiarVida,
  avisoTemporal,
  escucharEstado,
  cargarEstado,
  setSincronizarFlores
} from './estado-jardin.js';

import {
  sincronizarFlores,
  escucharVerso,
  escucharMensajes
} from './escena-3d.js';

import { initAudio } from './sonido.js';

import { configurarBotones } from './ui-botones.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const cambiarVidaOriginal = cambiarVida;

export function cambiarVidaConEscena(cantidad) {
  cambiarVidaOriginal(cantidad);
  sincronizarFlores();
  actualizarUI();
}

export { cambiarVidaConEscena as cambiarVida };

async function iniciarTodo() {
  console.log('🚀 Iniciando Jardín del Oráculo...');
  
  await cargarEstado();
  console.log('✅ Estado cargado, vida:', ESTADO.vida);
  
  sincronizarFlores();
  setSincronizarFlores(sincronizarFlores);

  crearParticulas();
  crearVegetacion();

  crearFondo();
  
  escucharEstado();

  escucharVerso();
  
  escucharMensajes();
  
  initAudio();

  iniciarCriaturas();

  configurarBotones();
  
  console.log('🌿 Jardín listo y funcionando.');
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarTodo().catch(err => {
    console.error('❌ Error al iniciar el jardín:', err);
    avisoTemporal('Error al cargar el jardín. Revisa la consola.');
  });
});

export { actualizarCriaturas };
export { db, app };
