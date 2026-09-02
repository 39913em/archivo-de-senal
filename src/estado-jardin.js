
// IMPORTS //
import { CONFIG } from './datos.js';
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js';
import { getDatabase, ref, get, set, update, onValue, push } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';

// INICIALIZAR FIREBASE //
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbEstado = ref(db, 'poesia');

// ESTADO GLOBAL DEL JARDÍN //
export const ESTADO = {
  vida: 0,
  huellas: 0,
  siembras: 0,
  integridad: 100,
  vecesCompartido: 0,
  corrompido: false,
  muerto: false,
  ultimaActualizacion: Date.now(),
  mensajes: [],
  ciclos: 0,
  haikusParaRevivir: 0
};

// Variables de control interno
let datosCargados = false;
export let mensajesRenderizados = new Set();

// UI (Overlays y Avisos) //
export function avisoTemporal(msg) {
  const el = document.getElementById('aviso-temporal');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

function mostrarOverlayMuerte() {
  document.getElementById('overlay-muerte')?.classList.add('visible');
}
function ocultarOverlayMuerte() {
  document.getElementById('overlay-muerte')?.classList.remove('visible');
}
function mostrarOverlayRenacimiento(ciclo) {
  const el = document.getElementById('overlay-renacimiento');
  el?.classList.add('visible');
  const cicloEl = document.getElementById('ciclo-renacido');
  if (cicloEl) cicloEl.textContent = ciclo;
}
function ocultarOverlayRenacimiento() {
  document.getElementById('overlay-renacimiento')?.classList.remove('visible');
}

// Eventos de los botones de los overlays (se ejecutan una sola vez al cargar)
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cerrar-overlay-muerte')?.addEventListener('click', ocultarOverlayMuerte);
  document.getElementById('btn-revivir')?.addEventListener('click', ocultarOverlayMuerte);
  document.getElementById('cerrar-renacimiento')?.addEventListener('click', ocultarOverlayRenacimiento);
});

// INTERFAZ (UI) //
export function actualizarUI() {
  const p = ESTADO.vida;
  
  const elVida = document.getElementById('vida');
  if (elVida) elVida.textContent = p;

  const elIntegridad = document.getElementById('integridad');
  if (elIntegridad) elIntegridad.textContent = Math.round(ESTADO.integridad) + '%';

  const elFlores = document.getElementById('flores');
  if (elFlores) elFlores.textContent = p;

  const elSiembras = document.getElementById('siembras');
  if (elSiembras) elSiembras.textContent = ESTADO.siembras;

  const elMensajes = document.getElementById('contador-mensajes');
  if (elMensajes) elMensajes.textContent = ESTADO.mensajes.length;

  const elVeces = document.getElementById('veces-compartido');
  if (elVeces) elVeces.textContent = ESTADO.vecesCompartido;

  const elCiclos = document.getElementById('ciclos');
  if (elCiclos) elCiclos.textContent = ESTADO.ciclos;

  const alerta = document.getElementById('alerta');
  if (alerta) alerta.style.display = (!ESTADO.muerto && ESTADO.integridad < 30) ? 'block' : 'none';

  const muerto = document.getElementById('muerto');
  if (muerto) muerto.style.display = ESTADO.muerto ? 'block' : 'none';
}

// GUARDAR Y CARGAR ESTADO //
export async function cargarEstado() {
  try {
    const snap = await get(dbEstado);
    if (snap.exists()) {
      const d = snap.val();
      ESTADO.vida = d.vida || 0;
      ESTADO.huellas = d.huellas || 0;
      ESTADO.siembras = d.siembras || 0;
      ESTADO.integridad = d.integridad || 100;
      ESTADO.corrompido = d.corrompido || false;
      ESTADO.muerto = d.muerto || false;
      ESTADO.vecesCompartido = d.vecesCompartido || 0;
      ESTADO.mensajes = d.mensajes || [];
      ESTADO.ciclos = d.ciclos || 0;
    } else {
      await set(dbEstado, {
        vida: CONFIG.VIDAS_INICIALES,
        huellas: 0,
        siembras: 0,
        integridad: 100,
        corrompido: false,
        muerto: false,
        vecesCompartido: 0,
        mensajes: [],
        ciclos: 0
      });
      ESTADO.vida = CONFIG.VIDAS_INICIALES;
    }

    if (ESTADO.vida === 0) {
      ESTADO.muerto = true;
      ESTADO.corrompido = true;
      ESTADO.integridad = 0;
      // activarRuina(); // Esta función vendrá de escena-3d.js
      mostrarOverlayMuerte();
      await guardarEstado();
    }
  } catch(e) { console.error('Error cargando estado:', e); }
  datosCargados = true;
  actualizarUI();
}

export async function guardarEstado() {
  if (!datosCargados) return;
  try {
    await update(dbEstado, {
      vida: ESTADO.vida,
      huellas: ESTADO.huellas,
      siembras: ESTADO.siembras,
      integridad: ESTADO.integridad,
      corrompido: ESTADO.corrompido,
      muerto: ESTADO.muerto,
      vecesCompartido: ESTADO.vecesCompartido,
      mensajes: ESTADO.mensajes,
      ciclos: ESTADO.ciclos
    });
  } catch(e) { console.error('Error guardando estado:', e); }
}

export function escucharEstado() {
  onValue(dbEstado, snap => {
    const d = snap.val();
    if (d && datosCargados) {
      const eraMuerto = ESTADO.muerto;
      ESTADO.vida = d.vida || 0;
      ESTADO.huellas = d.huellas || 0;
      ESTADO.siembras = d.siembras || 0;
      ESTADO.integridad = d.integridad || 100;
      ESTADO.corrompido = d.corrompido || false;
      ESTADO.muerto = d.muerto || false;
      ESTADO.vecesCompartido = d.vecesCompartido || 0;
      ESTADO.mensajes = d.mensajes || [];
      ESTADO.ciclos = d.ciclos || 0;

      if (d.muerto && !eraMuerto) {
        // activarRuina(); // TODO: vendrá de escena-3d.js
        mostrarOverlayMuerte();
        // limpiarVersosFlotantes(); // TODO: vendrá de escena-3d.js
        // limpiarMensajesFlotantes();
        // limpiarFlores();
      }
      if (!d.muerto && eraMuerto) {
        // desactivarRuina(); // TODO: vendrá de escena-3d.js
        ocultarOverlayMuerte();
        mostrarOverlayRenacimiento(ESTADO.ciclos);
        // lluviaPetales(); // TODO: vendrá de escena-3d.js
      }
      actualizarUI();
    }
  });
}

// CONTROL DE VIDA //
export function cambiarVida(cantidad) {
  if (ESTADO.muerto && cantidad > 0) return;
  if (ESTADO.muerto) return;

  ESTADO.vida = Math.max(0, ESTADO.vida + cantidad);
  ESTADO.integridad = Math.min(100, Math.max(0, (ESTADO.vida / CONFIG.MAX_VIDA) * 100));
  ESTADO.corrompido = ESTADO.vida > 0 && ESTADO.vida < CONFIG.CORRUPCION_UMBRAL;

  if (ESTADO.vida === 0) {
    ESTADO.muerto = true;
    ESTADO.corrompido = true;
    ESTADO.integridad = 0;
    ESTADO.mensajes = [];
    mensajesRenderizados.clear();
    // activarRuina(); // TODO
    mostrarOverlayMuerte();
    // limpiarVersosFlotantes(); // TODO
    // limpiarMensajesFlotantes();
    // limpiarFlores();
    guardarEstado();
    actualizarUI();
    return;
  }

  ESTADO.muerto = false;
  guardarEstado();
  actualizarUI();
}

// REVIVIR EL JARDÍN //
export async function revivirOráculo(origen = 'semilla') {
  try {
    await update(dbEstado, {
      vida: CONFIG.VIDAS_INICIALES,
      integridad: 100,
      corrompido: false,
      muerto: false,
      vecesCompartido: 0,
      huellas: (ESTADO.huellas || 0) + 1,
      mensajes: [],
      ciclos: (ESTADO.ciclos || 0) + 1
    });

    ESTADO.vida = CONFIG.VIDAS_INICIALES;
    ESTADO.integridad = 100;
    ESTADO.corrompido = false;
    ESTADO.muerto = false;
    ESTADO.vecesCompartido = 0;
    ESTADO.huellas++;
    ESTADO.mensajes = [];
    ESTADO.ciclos++;
    ESTADO.haikusParaRevivir = 0;
    mensajesRenderizados.clear();

    // desactivarRuina(); // TODO
    ocultarOverlayMuerte();
    mostrarOverlayRenacimiento(ESTADO.ciclos);
    // lluviaPetales(); // TODO
    // playRenacimiento(); // TODO (vendrá de sonido.js)

    await guardarEstado();
    actualizarUI();

    if (origen === 'semilla') {
      avisoTemporal('¡El jardín ha renacido con una semilla!');
    } else {
      avisoTemporal('¡El jardín ha renacido con 5 haikus!');
    }
    console.log('Renacido. Ciclo:', ESTADO.ciclos);
  } catch (e) {
    console.error('Error al revivir:', e);
    avisoTemporal('Error al revivir');
  }
}

// RUINA //
export function activarRuina() {
  // console.warn('activarRuina() - Pendiente de conectar con escena-3d.js');
}

export function desactivarRuina() {
  // console.warn('desactivarRuina() - Pendiente de conectar con escena-3d.js');
}

// FUNCIÓN DE INICIO //
export async function iniciarEstado() {
  await cargarEstado();
  escucharEstado();
}