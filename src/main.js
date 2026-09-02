
import { CONFIG, LEXICO_INICIAL, datosColumna, BANCO_ERROR_PARRAFO, BANCO_BLOQUEO_CITA } from './datos.js';
import { firebaseConfig } from './firebase-config.js';
import { rand, sanitizar, verificarRateLimit, contarSilabas, ajustarSilabas, probabilidadBloqueo } from './utils.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js';
import { getDatabase, ref, get, set, update, onValue, push } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

import { 
  iniciarEstado, 
  ESTADO, 
  actualizarUI, 
  cambiarVida, 
  revivirOráculo, 
  avisoTemporal,
  guardarEstado,
  escucharEstado,
  cargarEstado
} from './estado-jardin.js';

import { 
  scene, camera, renderer, controls, 
  guardian, led, columnas, columnasMovimiento, flores, pasto,
  sincronizarFlores, limpiarFlores, animarFloresOrganicas,
  animarPastoDenso, lluviaPetales, petalesLluvia,
  versosFlotantes, crearVersoFlotante, limpiarVersosFlotantes,
  mensajesFlotantes, crearMensajeFlotante, limpiarMensajesFlotantes,
  actualizarMensajesFlotantes,
  activarRuina, desactivarRuina,
  animarEscena
} from './escena-3d.js';

import { initAudio, playSound, playPageTurn, playPop, playRenacimiento, actualizarMasterGain } from './sonido.js';

import { configurarBotones } from './ui-botones.js';


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
  
  escucharEstado();
  
  initAudio();
  
   configurarBotones();
  
  console.log('🌿 Jardín listo y funcionando.');
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarTodo().catch(err => {
    console.error('❌ Error al iniciar el jardín:', err);
    avisoTemporal('Error al cargar el jardín. Revisa la consola.');
  });
});

export { db, app };