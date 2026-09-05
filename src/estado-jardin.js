import { CONFIG } from './datos.js';
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js';
import { getDatabase, ref, get, set, update, onValue, push } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbEstado = ref(db, 'poesia');

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

let datosCargados = false;
export let mensajesRenderizados = new Set();

let _sincronizarFloresCallback = null;

export function setSincronizarFlores(callback) {
  _sincronizarFloresCallback = callback;
}

function sincronizarFlores() {
  if (_sincronizarFloresCallback) {
    _sincronizarFloresCallback();
  }
}

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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cerrar-overlay-muerte')?.addEventListener('click', ocultarOverlayMuerte);
  document.getElementById('btn-revivir')?.addEventListener('click', ocultarOverlayMuerte);
  document.getElementById('cerrar-renacimiento')?.addEventListener('click', ocultarOverlayRenacimiento);
});

export function actualizarUI() {
  const p = ESTADO.vida;
  
  const elVida = document.getElementById('vida');
  if (elVida) elVida.textContent = p;

  const elIntegridad = document.getElementById('integridad');
  if (elIntegridad) {
    if (ESTADO.muerto) {
      elIntegridad.textContent = '0%';
    } else {
      elIntegridad.textContent = Math.round(ESTADO.integridad) + '%';
    }
  }

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

      if (ESTADO.muerto) {
        ESTADO.integridad = 0;
        ESTADO.corrompido = true;
      }
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
      ESTADO.integridad = 100;
      ESTADO.corrompido = false;
      ESTADO.muerto = false;
    }

    if (ESTADO.vida === 0) {
      ESTADO.muerto = true;
      ESTADO.corrompido = true;
      ESTADO.integridad = 0;
      activarRuina();
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

      if (ESTADO.muerto) {
        ESTADO.integridad = 0;
        ESTADO.corrompido = true;
      }

      if (d.muerto && !eraMuerto) {
        activarRuina();
        mostrarOverlayMuerte();
      }
      if (!d.muerto && eraMuerto) {
        desactivarRuina();
        ocultarOverlayMuerte();
        mostrarOverlayRenacimiento(ESTADO.ciclos);
      }
      actualizarUI();
    }
  });
}

export function cambiarVida(cantidad) {
  if (ESTADO.muerto && cantidad > 0) return;
  if (ESTADO.muerto) return;

  ESTADO.vida = Math.max(0, ESTADO.vida + cantidad);
  ESTADO.integridad = Math.min(100, Math.max(0, (ESTADO.vida / CONFIG.MAX_VIDA) * 100));
  ESTADO.corrompido = ESTADO.vida > 0 && ESTADO.vida < CONFIG.CORRUPCION_UMBRAL;

  sincronizarFlores();

  if (ESTADO.vida === 0) {
    ESTADO.muerto = true;
    ESTADO.corrompido = true;
    ESTADO.integridad = 0;
    ESTADO.mensajes = [];
    mensajesRenderizados.clear();
    activarRuina();
    mostrarOverlayMuerte();
    guardarEstado();
    actualizarUI();
    return;
  }

  ESTADO.muerto = false;
  guardarEstado();
  actualizarUI();
}

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

    sincronizarFlores();

    desactivarRuina();
    ocultarOverlayMuerte();
    mostrarOverlayRenacimiento(ESTADO.ciclos);

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

export function activarRuina() {
  console.log('🏚️ Ruina activada (placeholder)');
}

export function desactivarRuina() {
  console.log('🌱 Ruina desactivada (placeholder)');
}

export async function iniciarEstado() {
  await cargarEstado();
  escucharEstado();
}