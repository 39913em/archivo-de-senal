// src/main.js
import { db } from './firebase-config.js';
import { 
  ESTADO,
  cargarEstado,
  guardarEstado,
  escucharEstado,
  cambiarVida,
  revivirOráculo,
  crearFlorOrganica,
  eliminarFlor,
  limpiarFlores,
  sincronizarFlores,
  animarFloresOrganicas,
  activarRuina,
  desactivarRuina,
  mostrarOverlayMuerte,
  ocultarOverlayMuerte,
  mostrarOverlayRenacimiento,
  ocultarOverlayRenacimiento,
  avisoTemporal,
  actualizarUI,
  lluviaPetales,
  // Si tienes otras funciones que necesites, agrégalas
} from './estado-jardin.js';

import { 
  initScene, 
  animate 
} from './escena-3d.js';

import { 
  initAudio, 
  playPageTurn, 
  playPop, 
  playRenacimiento 
} from './sonido.js';

import { inicializarUI } from './ui-botones.js';

// ============================================================
// FUNCIÓN PRINCIPAL DE INICIO
// ============================================================
async function iniciarAplicacion() {
  console.log('🚀 Iniciando Jardín del Oráculo...');

  // 1. Iniciar audio
  initAudio();

  // 2. Cargar estado desde Firebase
  await cargarEstado();
  
  // 3. Escuchar cambios en tiempo real
  escucharEstado();

  // 4. Iniciar escena 3D (Three.js)
  initScene();

  // 5. Configurar los botones de la UI
  inicializarUI();

  // 6. Arrancar el loop de animación
  animate();

  // 7. Si el jardín estaba muerto, activar ruina y mostrar overlay
  if (ESTADO.muerto) {
    activarRuina();
    mostrarOverlayMuerte();
  }

  console.log('✅ Jardín listo');
}

// ¡Ejecutar!
iniciarAplicacion();