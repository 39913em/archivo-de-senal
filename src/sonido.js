
import { ESTADO } from './estado-jardin.js';
import { columnas } from './columnas.js';
import { camera } from './escena-3d.js';


let audioCtx = null;
let masterGain = null;
let vocesColumna = [];
let schedulerId = null;
let tiempoGlobal = 0;

let mantoGain = null;
let mantoOsc1 = null;
let mantoOsc2 = null;
let mantoNoise = null;
let mantoFilter = null;
let mantoStarted = false;

let reverbSendGain = null;

let eventoSerial = 0;
let ultimoEventoGlobal = -1;


const ESCALA = [
  32.70,   // C1
  36.71,   // D1
  38.89,   // D#1
  43.65,   // F1
  48.99,   // G1
  51.91,   // G#1
  65.41,   // C2
  73.42,   // D2
  77.78,   // D#2
  87.31,   // F2
  97.99,   // G2
  103.83,  // G#2
  130.81,  // C3
  146.83,  // D3
  155.56,  // D#3
  174.61,  // F3
  195.99,  // G3
  207.65   // G#3
];

const OSTINATO = [0, 3, 5, 3, 7, 5, 3, 0];


const INSTRUMENTOS = {

  SEÑAL: {
    nombre: 'Ikeda/Nicolai',
    oscTipo: 'square',
    interOsc: 'square',
    filtroFreq: 3.5,
    filtroQ: 8,
    ataque: 0.008,
    sostenido: 0.12,
    caida: 0.22,
    interFiltro: 5,
    interVol: 1.2
  },

  RESONANCIA: {
    nombre: 'Reznor/Ross',
    oscTipo: 'sawtooth',
    interOsc: 'sawtooth',
    filtroFreq: 1.5,
    filtroQ: 3,
    ataque: 0.45,
    sostenido: 0.75,
    caida: 4.5,
    interFiltro: 1.4,
    interVol: 1.0
  },

  FRACTURA: {
    nombre: 'Sigur Rós/M83',
    oscTipo: 'sine',
    interOsc: 'sine',
    filtroFreq: 4,
    filtroQ: 0.7,
    ataque: 1.2,
    sostenido: 0.8,
    caida: 6.5,
    interFiltro: 3,
    interVol: 0.9
  },

  DERIVA: {
    nombre: 'Russolo/Schaeffer',
    oscTipo: 'triangle',
    interOsc: 'triangle',
    filtroFreq: 2,
    filtroQ: 1.2,
    ataque: 0.025,
    sostenido: 0.35,
    caida: 1.8,
    interFiltro: 2,
    interVol: 1.1
  }
};


function limitar(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function aleatorio(min, max) {
  return min + Math.random() * (max - min);
}

function elegir(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function distanciaCentro() {
  if (!camera) return 99;

  return Math.sqrt(
    camera.position.x * camera.position.x +
    camera.position.z * camera.position.z
  );
}

function proximidadCentro() {
  return limitar(1 - distanciaCentro() / 7, 0, 1);
}

function factorSalud() {
  if (ESTADO.muerto) return 0;
  return Math.max(0.12, Math.min(1, ESTADO.integridad / 100));
}

function siguienteEvento() {
  eventoSerial++;
  return eventoSerial;
}


function crearReverb() {
  if (!audioCtx) return null;

  try {

    const duracion = 6;
    const bufferSize = audioCtx.sampleRate * duracion;

    const impulse = audioCtx.createBuffer(
      2,
      bufferSize,
      audioCtx.sampleRate
    );

    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < bufferSize; i++) {

      const t = i / audioCtx.sampleRate;

      const decay = Math.pow(1 - t / duracion, 2.4);

      const ruido =
        (Math.random() * 2 - 1) *
        0.12 *
        decay;

      left[i] =
        (Math.sin(t * 37) * 0.15 + ruido) *
        decay;

      right[i] =
        (Math.cos(t * 31) * 0.15 + ruido) *
        decay;
    }

    const convolver = audioCtx.createConvolver();
    convolver.buffer = impulse;

    const gain = audioCtx.createGain();
    gain.gain.value = 0;

    convolver.connect(gain);
    gain.connect(audioCtx.destination);

    return {
      convolver,
      gain
    };

  } catch (e) {

    console.warn('Reverb no disponible:', e);
    return null;
  }
}


export function initAudio() {

  if (!audioCtx) {

    try {

      audioCtx =
        new (window.AudioContext ||
          window.webkitAudioContext)();

      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.0001;
      masterGain.connect(audioCtx.destination);

      const reverb = crearReverb();

      if (reverb) {

        reverbSendGain = audioCtx.createGain();
        reverbSendGain.gain.value = 0;

        masterGain.connect(reverbSendGain);
        reverbSendGain.connect(reverb.gain);
      }

      iniciarManto();
      crearVocesColumna();

      console.log(
        '🔊 4 COMPOSITORES — ORQUESTA ESPACIAL INICIADA'
      );

    } catch (e) {

      console.warn('Error de audio:', e);
      return;
    }
  }

  if (audioCtx.state === 'suspended') {

    audioCtx
      .resume()
      .then(iniciarScheduler)
      .catch(() => {});

  } else {

    iniciarScheduler();
  }
}


function iniciarManto() {

  if (!audioCtx || mantoStarted) return;

  mantoStarted = true;

  mantoGain = audioCtx.createGain();
  mantoGain.gain.value = 0.012;
  mantoGain.connect(masterGain);

  mantoOsc1 = audioCtx.createOscillator();
  mantoOsc1.type = 'sine';
  mantoOsc1.frequency.value = 17.3;
  mantoOsc1.start();

  mantoOsc2 = audioCtx.createOscillator();
  mantoOsc2.type = 'triangle';
  mantoOsc2.frequency.value = 25.9;
  mantoOsc2.start();

  mantoFilter = audioCtx.createBiquadFilter();
  mantoFilter.type = 'lowpass';
  mantoFilter.frequency.value = 90;
  mantoFilter.Q.value = 0.5;

  const bufferSize =
    audioCtx.sampleRate * 3;

  const buffer =
    audioCtx.createBuffer(
      1,
      bufferSize,
      audioCtx.sampleRate
    );

  const data =
    buffer.getChannelData(0);

  let anterior = 0;

  for (let i = 0; i < bufferSize; i++) {

    const blanco =
      Math.random() * 2 - 1;

    anterior =
      anterior * 0.965 +
      blanco * 0.035;

    data[i] = anterior;
  }

  mantoNoise =
    audioCtx.createBufferSource();

  mantoNoise.buffer = buffer;
  mantoNoise.loop = true;
  mantoNoise.start();

  const noiseGain =
    audioCtx.createGain();

  noiseGain.gain.value = 0.025;

  const noiseFilter =
    audioCtx.createBiquadFilter();

  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 180;
  noiseFilter.Q.value = 0.35;

  mantoNoise
    .connect(noiseGain);

  noiseGain
    .connect(noiseFilter);

  noiseFilter
    .connect(mantoGain);

  mantoOsc1.connect(mantoFilter);
  mantoOsc2.connect(mantoFilter);
  mantoFilter.connect(mantoGain);

  console.log('🌬️ Manto persistente iniciado');
}


function actualizarManto() {

  if (!audioCtx || !mantoGain) return;

  const salud = factorSalud();
  const centro = proximidadCentro();

  const intensidad =
    ESTADO.muerto
      ? 1
      : 0.25 + salud * 0.45 + centro * 0.4;

  const objetivo =
    ESTADO.muerto
      ? 0.065
      : 0.012 + intensidad * 0.025;

  const frecuencia =
    55 +
    Math.sin(tiempoGlobal * 0.017) * 22 +
    centro * 90;

  mantoFilter.frequency.value =
    frecuencia;

  mantoOsc1.frequency.value =
    16 +
    Math.sin(tiempoGlobal * 0.011) * 2 +
    centro * 3;

  mantoOsc2.frequency.value =
    24 +
    Math.sin(tiempoGlobal * 0.013 + 1) * 4 +
    centro * 7;

  const t = audioCtx.currentTime;

  mantoGain.gain.cancelScheduledValues(t);

  mantoGain.gain.setValueAtTime(
    mantoGain.gain.value,
    t
  );

  mantoGain.gain.linearRampToValueAtTime(
    objetivo,
    t + 1.5
  );
}


function crearVocesColumna() {

  if (!audioCtx) return;

  vocesColumna =
    columnas.map((col, indice) => {

      const label =
        col.userData.label;

      const inst =
        INSTRUMENTOS[label] ||
        INSTRUMENTOS.SEÑAL;

      const panner =
        audioCtx.createPanner();

      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 25;
      panner.rolloffFactor = 0.7;

      panner.positionX.value =
        col.position.x;

      panner.positionY.value = 2.5;

      panner.positionZ.value =
        col.position.z;

      const voiceGain =
        audioCtx.createGain();

      voiceGain.gain.value = 0.8;

      panner.connect(voiceGain);
      voiceGain.connect(masterGain);

      return {

        col,
        panner,
        voiceGain,

        label,
        inst,

        indice,

        seed:
          39913 +
          indice * 917,

        fase:
          Math.random() * Math.PI * 2,

        fase2:
          Math.random() * Math.PI * 2,

        proximoTiempo:
          audioCtx.currentTime +
          aleatorio(0.2, 2.5),

        pasoOstinato:
          indice % OSTINATO.length,

        eventos:
          0
      };
    });
}


function generarNotaOstinato(
  voz,
  tiempo
) {

  const { inst, indice } = voz;

  const centro =
    proximidadCentro();

  const salud =
    factorSalud();

  const indiceMotivo =
    voz.pasoOstinato %
    OSTINATO.length;

  const desplazamiento =
    OSTINATO[indiceMotivo];

  let escalaIndex =
    (indice * 3 +
      desplazamiento) %
    ESCALA.length;


  if (centro > 0.35) {

    escalaIndex =
      (desplazamiento * 2 +
        Math.floor(centro * 4)) %
      ESCALA.length;
  }

  let freq =
    ESCALA[escalaIndex];

  if (centro < 0.35) {

    if (indice === 0) freq *= 2;
    if (indice === 1) freq *= 1;
    if (indice === 2) freq *= 2;
    if (indice === 3) freq *= 1.5;
  }

  const deriva =
    1 +
    Math.sin(
      tiempoGlobal * 0.07 +
      voz.seed
    ) *
    (0.002 + centro * 0.008);

  freq *= deriva;

  const osc =
    audioCtx.createOscillator();

  osc.type =
    inst.oscTipo;

  osc.frequency.setValueAtTime(
    freq,
    tiempo
  );

  const filter =
    audioCtx.createBiquadFilter();

  filter.type = 'lowpass';

  filter.frequency.setValueAtTime(
    freq * inst.filtroFreq *
    (1 + centro * 3),
    tiempo
  );

  filter.Q.setValueAtTime(
    inst.filtroQ,
    tiempo
  );

  const gain =
    audioCtx.createGain();

  const duracion =
    inst.caida *
    (0.72 +
      Math.sin(
        tiempoGlobal * 0.021 +
        voz.seed
      ) *
      0.28);

  const volumen =
    (0.018 +
      salud * 0.018 +
      centro * 0.012);

  const ataque =
    Math.max(
      0.005,
      inst.ataque *
      (1 - centro * 0.45)
    );

  gain.gain.setValueAtTime(
    0.0001,
    tiempo
  );

  gain.gain.exponentialRampToValueAtTime(
    volumen,
    tiempo + ataque
  );

  gain.gain.exponentialRampToValueAtTime(
    volumen * inst.sostenido,
    tiempo + duracion * 0.45
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    tiempo + duracion
  );

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(voz.panner);

  osc.start(tiempo);
  osc.stop(tiempo + duracion + 0.1);

  voz.pasoOstinato++;

  return duracion;
}


function generarEventoUnico(
  voz,
  tiempo
) {

  if (!audioCtx) return;

  const centro =
    proximidadCentro();

  const salud =
    factorSalud();

  const tipo =
    elegir([
      'IMPACTO',
      'FRICCION',
      'PULSO',
      'ARMONICO',
      'RUIDO',
      'COLISION',
      'RESPIRACION',
      'FALLA'
    ]);

  const id =
    siguienteEvento();

  voz.eventos++;


  const base =
    elegir(ESCALA);

  const desplazamiento =
    aleatorio(
      -1,
      1
    );

  let freq =
    base *
    Math.pow(
      2,
      desplazamiento / 3
    );


  if (centro > 0.5) {

    const notaCentro =
      ESCALA[
        (id +
          Math.floor(centro * 8)) %
        ESCALA.length
      ];

    freq =
      freq * (1 - centro * 0.7) +
      notaCentro * centro * 0.7;
  }


  const duracion =
    aleatorio(
      0.035,
      2.8
    ) *
    (1 + centro * 1.7);


  const osc =
    audioCtx.createOscillator();

  let tipoOsc;

  switch (tipo) {

    case 'IMPACTO':
      tipoOsc = 'square';
      break;

    case 'FRICCION':
      tipoOsc = 'sawtooth';
      break;

    case 'PULSO':
      tipoOsc = 'square';
      break;

    case 'ARMONICO':
      tipoOsc = 'sine';
      break;

    case 'RUIDO':
      tipoOsc = 'triangle';
      break;

    case 'COLISION':
      tipoOsc = 'sawtooth';
      break;

    case 'RESPIRACION':
      tipoOsc = 'sine';
      break;

    default:
      tipoOsc = 'triangle';
  }

  osc.type =
    tipoOsc;

  osc.frequency.setValueAtTime(
    Math.max(18, freq),
    tiempo
  );

  const destino =
    freq *
    aleatorio(
      0.35,
      2.2
    );

  osc.frequency.exponentialRampToValueAtTime(
    Math.max(18, destino),
    tiempo + duracion
  );


  const filter =
    audioCtx.createBiquadFilter();

  filter.type =
    tipo === 'FRICCION' ||
    tipo === 'RUIDO'
      ? 'bandpass'
      : 'lowpass';

  const frecuenciaFiltro =
    aleatorio(
      80,
      4200
    ) *
    (1 + centro * 2);

  filter.frequency.setValueAtTime(
    frecuenciaFiltro,
    tiempo
  );

  filter.Q.setValueAtTime(
    aleatorio(
      0.4,
      12
    ),
    tiempo
  );


  const gain =
    audioCtx.createGain();

  let volumen =
    aleatorio(
      0.004,
      0.026
    );

  volumen *=
    0.5 +
    salud * 0.5;

  volumen *=
    0.7 +
    centro * 1.4;

  let ataque;

  if (tipo === 'IMPACTO')
    ataque = 0.002;

  else if (tipo === 'RESPIRACION')
    ataque = duracion * 0.55;

  else
    ataque =
      aleatorio(
        0.005,
        Math.min(
          0.8,
          duracion * 0.4
        )
      );

  gain.gain.setValueAtTime(
    0.0001,
    tiempo
  );

  gain.gain.exponentialRampToValueAtTime(
    volumen,
    tiempo + ataque
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    tiempo + duracion
  );

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(voz.panner);

  osc.start(tiempo);
  osc.stop(
    tiempo +
    duracion +
    0.05
  );


  if (
    centro > 0.25 &&
    Math.random() < 0.42
  ) {

    const osc2 =
      audioCtx.createOscillator();

    const gain2 =
      audioCtx.createGain();

    const intervalo =
      elegir([
        1.5,
        1.25,
        0.75,
        0.5,
        2
      ]);

    osc2.type =
      elegir([
        'sine',
        'triangle',
        'square'
      ]);

    osc2.frequency.setValueAtTime(
      freq * intervalo,
      tiempo
    );

    gain2.gain.setValueAtTime(
      0.0001,
      tiempo
    );

    gain2.gain.exponentialRampToValueAtTime(
      volumen * centro * 0.65,
      tiempo + 0.015
    );

    gain2.gain.exponentialRampToValueAtTime(
      0.0001,
      tiempo + duracion * 0.7
    );

    osc2.connect(gain2);
    gain2.connect(voz.panner);

    osc2.start(tiempo);
    osc2.stop(
      tiempo +
      duracion
    );
  }

  ultimoEventoGlobal = id;
}


function generarColisionCentral(
  tiempo
) {

  if (
    !audioCtx ||
    vocesColumna.length < 4
  ) return;

  const centro =
    proximidadCentro();

  if (centro < 0.62) return;

  const intensidad =
    (centro - 0.62) /
    0.38;

  if (
    Math.random() >
    0.035 * intensidad
  ) return;

  const id =
    siguienteEvento();

  const nota =
    ESCALA[
      (id * 3) %
      ESCALA.length
    ];

  const duracion =
    aleatorio(
      1.5,
      4.5
    );


  vocesColumna.forEach(
    (voz, indice) => {

      const osc =
        audioCtx.createOscillator();

      const gain =
        audioCtx.createGain();

      const filter =
        audioCtx.createBiquadFilter();

      osc.type =
        [
          'sine',
          'sawtooth',
          'triangle',
          'square'
        ][indice];

      const desviacion =
        [
          1,
          1.5,
          2,
          0.5
        ][indice];

      osc.frequency.setValueAtTime(
        nota * desviacion,
        tiempo
      );

      filter.type =
        'lowpass';

      filter.frequency.setValueAtTime(
        700 +
        intensidad * 3000,
        tiempo
      );

      filter.Q.value =
        1 +
        intensidad * 8;

      gain.gain.setValueAtTime(
        0.0001,
        tiempo
      );

      gain.gain.exponentialRampToValueAtTime(
        0.008 * intensidad,
        tiempo + 0.8
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        tiempo + duracion
      );

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(voz.panner);

      osc.start(tiempo);
      osc.stop(
        tiempo +
        duracion +
        0.1
      );
    }
  );

  ultimoEventoGlobal =
    id;
}


function scheduleTick() {

  if (!audioCtx) return;

  const ahora =
    audioCtx.currentTime;

  tiempoGlobal += 0.1;

  actualizarManto();

  if (ESTADO.muerto)
    return;

  const centro =
    proximidadCentro();

  const salud =
    factorSalud();


  vocesColumna.forEach(
    (voz, indice) => {

      const fase =
        voz.fase;

      const radio =
        0.25 +
        centro * 1.5;

      const vientoX =
        Math.sin(
          tiempoGlobal *
          (0.11 + indice * 0.013) +
          fase
        ) *
        radio;

      const vientoZ =
        Math.cos(
          tiempoGlobal *
          (0.09 + indice * 0.017) +
          voz.fase2
        ) *
        radio;

      voz.panner.positionX.value =
        voz.col.position.x +
        vientoX;

      voz.panner.positionZ.value =
        voz.col.position.z +
        vientoZ;

      voz.panner.positionY.value =
        2.5 +
        Math.sin(
          tiempoGlobal *
          0.07 +
          fase
        ) *
        (0.1 + centro * 0.4);


      if (
        voz.proximoTiempo <
        ahora + 0.25
      ) {

        const duracion =
          generarNotaOstinato(
            voz,
            Math.max(
              voz.proximoTiempo,
              ahora + 0.02
            )
          );


        const intervaloExterior =
          2.4 +
          (1 - salud) * 3.5;

        const intervaloCentro =
          0.75 +
          (1 - salud) * 1.4;

        const intervalo =
          intervaloExterior *
            (1 - centro) +
          intervaloCentro *
            centro;

        const variacion =
          aleatorio(
            0.72,
            1.32
          );

        voz.proximoTiempo +=
          intervalo *
          variacion +
          duracion * 0.18;
      }


      const densidadExterior =
        0.018;

      const densidadCentro =
        0.075;

      const probabilidad =
        densidadExterior *
          (1 - centro) +
        densidadCentro *
          centro;

      if (
        Math.random() <
        probabilidad
      ) {

        generarEventoUnico(
          voz,
          ahora + aleatorio(
            0.02,
            0.12
          )
        );
      }
    }
  );


  generarColisionCentral(
    ahora + 0.03
  );
}


function iniciarScheduler() {

  if (schedulerId)
    return;

  schedulerId =
    setInterval(
      scheduleTick,
      100
    );

  actualizarMasterGain();
}


export function actualizarMasterGain() {

  if (
    !audioCtx ||
    !masterGain
  ) return;

  const t =
    audioCtx.currentTime;

  const salud =
    factorSalud();

  const centro =
    proximidadCentro();

  const objetivo =
    ESTADO.muerto
      ? 0.045
      : 0.12 +
        salud * 0.16 +
        centro * 0.08;

  masterGain.gain.cancelScheduledValues(t);

  masterGain.gain.setValueAtTime(
    masterGain.gain.value,
    t
  );

  masterGain.gain.linearRampToValueAtTime(
    objetivo,
    t + 1.2
  );


  if (reverbSendGain) {

    const cantidad =
      Math.pow(
        centro,
        1.5
      );

    reverbSendGain.gain.cancelScheduledValues(t);

    reverbSendGain.gain.setValueAtTime(
      reverbSendGain.gain.value,
      t
    );

    reverbSendGain.gain.linearRampToValueAtTime(
      cantidad * 0.75,
      t + 0.7
    );
  }

  if (
    ESTADO.muerto
  ) {

    if (schedulerId) {

      clearInterval(
        schedulerId
      );

      schedulerId = null;
    }

  } else if (!schedulerId) {

    iniciarScheduler();
  }
}


export function tocarSonidoElemento(elemento) {

  if (
    !audioCtx ||
    audioCtx.state === 'closed' ||
    !masterGain
  ) return;

  try {

    const ud =
      elemento.userData || {};

    const columna =
      ud.columna || 'SEÑAL';

    const freq =
      Math.max(
        20,
        ud.nota || 200
      );

    const ahora =
      audioCtx.currentTime;

    const centro =
      proximidadCentro();

    const salud =
      factorSalud();


    if (columna === 'SEÑAL') {

      const duracion =
        aleatorio(
          0.025,
          0.18
        );

      const osc =
        audioCtx.createOscillator();

      const gain =
        audioCtx.createGain();

      const filter =
        audioCtx.createBiquadFilter();

      osc.type =
        Math.random() > 0.35
          ? 'square'
          : 'sine';

      const microDesfase =
        aleatorio(
          0.985,
          1.015
        );

      osc.frequency.setValueAtTime(
        freq *
        microDesfase,
        ahora
      );

      osc.frequency.setValueAtTime(
        freq *
        aleatorio(
          0.4,
          2.8
        ),
        ahora + duracion * 0.25
      );

      filter.type =
        'highpass';

      filter.frequency.value =
        aleatorio(
          300,
          3500
        );

      filter.Q.value =
        aleatorio(
          5,
          18
        );

      gain.gain.setValueAtTime(
        0.0001,
        ahora
      );

      gain.gain.exponentialRampToValueAtTime(
        0.035 *
        (0.7 + centro),
        ahora + 0.003
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ahora + duracion
      );

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(ahora);
      osc.stop(
        ahora +
        duracion +
        0.02
      );


      if (Math.random() < 0.7) {

        const click =
          audioCtx.createOscillator();

        const clickGain =
          audioCtx.createGain();

        click.type =
          'square';

        click.frequency.setValueAtTime(
          freq *
          aleatorio(
            3,
            12
          ),
          ahora
        );

        clickGain.gain.setValueAtTime(
          0.025 *
          (0.5 + centro),
          ahora
        );

        clickGain.gain.exponentialRampToValueAtTime(
          0.0001,
          ahora +
          aleatorio(
            0.008,
            0.045
          )
        );

        click.connect(clickGain);
        clickGain.connect(masterGain);

        click.start(ahora);
        click.stop(
          ahora + 0.06
        );
      }

      return;
    }


    if (columna === 'RESONANCIA') {

      const duracion =
        aleatorio(
          0.8,
          3.2
        );

      const osc =
        audioCtx.createOscillator();

      const sub =
        audioCtx.createOscillator();

      const gain =
        audioCtx.createGain();

      const subGain =
        audioCtx.createGain();

      const filter =
        audioCtx.createBiquadFilter();

      osc.type =
        'sawtooth';

      sub.type =
        'sine';

      osc.frequency.setValueAtTime(
        freq *
        aleatorio(
          0.45,
          0.9
        ),
        ahora
      );

      sub.frequency.setValueAtTime(
        Math.max(
          24,
          freq * 0.5
        ),
        ahora
      );

      sub.frequency.exponentialRampToValueAtTime(
        Math.max(
          20,
          freq * 0.24
        ),
        ahora + duracion
      );

      filter.type =
        'lowpass';

      const filtroInicial =
        aleatorio(
          90,
          220
        );

      const filtroFinal =
        aleatorio(
          700,
          2600
        ) *
        (1 + centro);

      filter.frequency.setValueAtTime(
        filtroInicial,
        ahora
      );

      filter.frequency.exponentialRampToValueAtTime(
        filtroFinal,
        ahora +
        duracion * 0.7
      );

      filter.Q.value =
        aleatorio(
          1.5,
          5
        );

      gain.gain.setValueAtTime(
        0.0001,
        ahora
      );

      gain.gain.exponentialRampToValueAtTime(
        0.045 *
        (0.6 + salud * 0.4),
        ahora +
        aleatorio(
          0.12,
          0.6
        )
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ahora + duracion
      );

      subGain.gain.setValueAtTime(
        0.0001,
        ahora
      );

      subGain.gain.exponentialRampToValueAtTime(
        0.04,
        ahora + 0.25
      );

      subGain.gain.exponentialRampToValueAtTime(
        0.0001,
        ahora + duracion
      );

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      sub.connect(subGain);
      subGain.connect(masterGain);

      osc.start(ahora);
      sub.start(ahora);

      osc.stop(
        ahora +
        duracion +
        0.1
      );

      sub.stop(
        ahora +
        duracion +
        0.1
      );


      if (centro > 0.25) {

        const arm =
          audioCtx.createOscillator();

        const armGain =
          audioCtx.createGain();

        arm.type =
          'sawtooth';

        arm.frequency.setValueAtTime(
          freq *
          aleatorio(
            1.48,
            2.03
          ),
          ahora
        );

        armGain.gain.setValueAtTime(
          0.0001,
          ahora
        );

        armGain.gain.exponentialRampToValueAtTime(
          0.012 * centro,
          ahora + 0.35
        );

        armGain.gain.exponentialRampToValueAtTime(
          0.0001,
          ahora + duracion
        );

        arm.connect(
          armGain
        );

        armGain.connect(
          masterGain
        );

        arm.start(ahora);
        arm.stop(
          ahora +
          duracion
        );
      }

      return;
    }


    if (columna === 'FRACTURA') {

      const duracion =
        aleatorio(
          1.8,
          5.5
        );

      const frecuencias = [
        freq,
        freq * 2,
        freq * 3,
        freq * 1.5
      ];

      frecuencias.forEach(
        (f, indice) => {

          const osc =
            audioCtx.createOscillator();

          const gain =
            audioCtx.createGain();

          const filter =
            audioCtx.createBiquadFilter();

          osc.type =
            indice === 0
              ? 'sine'
              : 'triangle';

          osc.frequency.setValueAtTime(
            f *
            aleatorio(
              0.995,
              1.005
            ),
            ahora
          );

          filter.type =
            'lowpass';

          filter.frequency.value =
            aleatorio(
              900,
              4200
            );

          filter.Q.value =
            0.5 +
            centro * 2;

          const volumen =
            (0.009 +
              indice * 0.002) *
            (0.7 + centro);


          const entrada =
            indice *
            aleatorio(
              0.12,
              0.35
            );

          gain.gain.setValueAtTime(
            0.0001,
            ahora
          );

          gain.gain.exponentialRampToValueAtTime(
            volumen,
            ahora +
            entrada +
            aleatorio(
              0.3,
              1.1
            )
          );

          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            ahora +
            duracion
          );

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);

          osc.start(
            ahora +
            entrada
          );

          osc.stop(
            ahora +
            duracion +
            0.2
          );
        }
      );


      if (Math.random() < 0.65) {

        const brillo =
          audioCtx.createOscillator();

        const brilloGain =
          audioCtx.createGain();

        brillo.type =
          'sine';

        brillo.frequency.setValueAtTime(
          freq *
          aleatorio(
            3.8,
            7.5
          ),
          ahora
        );

        brilloGain.gain.setValueAtTime(
          0.0001,
          ahora
        );

        brilloGain.gain.exponentialRampToValueAtTime(
          0.008 *
          (0.5 + centro),
          ahora +
          aleatorio(
            0.5,
            1.5
          )
        );

        brilloGain.gain.exponentialRampToValueAtTime(
          0.0001,
          ahora +
          aleatorio(
            1.5,
            3.5
          )
        );

        brillo.connect(
          brilloGain
        );

        brilloGain.connect(
          masterGain
        );

        brillo.start(ahora);

        brillo.stop(
          ahora + 4
        );
      }

      return;
    }


    if (columna === 'DERIVA') {

      const duracion =
        aleatorio(
          0.25,
          1.7
        );


      const cuerpo =
        audioCtx.createOscillator();

      const cuerpoGain =
        audioCtx.createGain();

      const cuerpoFilter =
        audioCtx.createBiquadFilter();

      cuerpo.type =
        elegir([
          'triangle',
          'sawtooth',
          'square'
        ]);

      cuerpo.frequency.setValueAtTime(
        freq *
        aleatorio(
          0.45,
          1.7
        ),
        ahora
      );

      cuerpo.frequency.exponentialRampToValueAtTime(
        Math.max(
          30,
          freq *
          aleatorio(
            0.12,
            0.65
          )
        ),
        ahora +
        duracion
      );

      cuerpoFilter.type =
        'bandpass';

      cuerpoFilter.frequency.setValueAtTime(
        aleatorio(
          150,
          1400
        ),
        ahora
      );

      cuerpoFilter.frequency.exponentialRampToValueAtTime(
        aleatorio(
          80,
          5000
        ),
        ahora +
        duracion
      );

      cuerpoFilter.Q.value =
        aleatorio(
          0.7,
          8
        );

      cuerpoGain.gain.setValueAtTime(
        0.0001,
        ahora
      );

      cuerpoGain.gain.exponentialRampToValueAtTime(
        0.035 *
        (0.7 + centro),
        ahora +
        aleatorio(
          0.005,
          0.08
        )
      );

      cuerpoGain.gain.exponentialRampToValueAtTime(
        0.0001,
        ahora +
        duracion
      );

      cuerpo.connect(
        cuerpoFilter
      );

      cuerpoFilter.connect(
        cuerpoGain
      );

      cuerpoGain.connect(
        masterGain
      );

      cuerpo.start(ahora);

      cuerpo.stop(
        ahora +
        duracion +
        0.1
      );


      const ruidoBuffer =
        audioCtx.createBuffer(
          1,
          Math.floor(
            audioCtx.sampleRate *
            duracion
          ),
          audioCtx.sampleRate
        );

      const ruidoData =
        ruidoBuffer.getChannelData(0);

      let anterior =
        0;

      for (
        let i = 0;
        i < ruidoData.length;
        i++
      ) {

        const blanco =
          Math.random() * 2 - 1;

        anterior =
          anterior * 0.72 +
          blanco * 0.28;

        ruidoData[i] =
          anterior;
      }

      const ruido =
        audioCtx.createBufferSource();

      const ruidoFilter =
        audioCtx.createBiquadFilter();

      const ruidoGain =
        audioCtx.createGain();

      ruido.buffer =
        ruidoBuffer;

      ruidoFilter.type =
        'bandpass';

      ruidoFilter.frequency.value =
        aleatorio(
          400,
          5000
        );

      ruidoFilter.Q.value =
        aleatorio(
          0.5,
          4
        );

      ruidoGain.gain.setValueAtTime(
        0.0001,
        ahora
      );

      ruidoGain.gain.exponentialRampToValueAtTime(
        0.025 *
        (0.5 + centro),
        ahora +
        aleatorio(
          0.01,
          0.15
        )
      );

      ruidoGain.gain.exponentialRampToValueAtTime(
        0.0001,
        ahora +
        duracion
      );

      ruido.connect(
        ruidoFilter
      );

      ruidoFilter.connect(
        ruidoGain
      );

      ruidoGain.connect(
        masterGain
      );

      ruido.start(ahora);


      if (Math.random() < 0.75) {

        const resonancia =
          audioCtx.createOscillator();

        const resonanciaGain =
          audioCtx.createGain();

        resonancia.type =
          elegir([
            'sine',
            'triangle'
          ]);

        resonancia.frequency.setValueAtTime(
          freq *
          elegir([
            0.5,
            1.5,
            2,
            2.5,
            3
          ]),
          ahora
        );

        resonanciaGain.gain.setValueAtTime(
          0.0001,
          ahora
        );

        resonanciaGain.gain.exponentialRampToValueAtTime(
          0.012,
          ahora +
          aleatorio(
            0.08,
            0.4
          )
        );

        resonanciaGain.gain.exponentialRampToValueAtTime(
          0.0001,
          ahora +
          duracion *
          aleatorio(
            1,
            2
          )
        );

        resonancia.connect(
          resonanciaGain
        );

        resonanciaGain.connect(
          masterGain
        );

        resonancia.start(ahora);

        resonancia.stop(
          ahora +
          duracion *
          2
        );
      }

      return;
    }


    playSound(
      [freq],
      0.25,
      0.04
    );

  } catch (e) {

    console.warn(
      'Error en sonido de elemento:',
      e
    );
  }
}


export function playSound(
  freqs,
  dur = 0.3,
  vol = 0.06
) {

  if (
    !audioCtx ||
    audioCtx.state === 'closed' ||
    !masterGain
  ) return;

  const emitir =
    () => {

      if (
        !audioCtx ||
        audioCtx.state !== 'running' ||
        !masterGain
      ) return;

      const nivel =
        ESTADO.muerto
          ? vol * 0.1
          : vol;

      try {

        const ahora =
          audioCtx.currentTime;

        freqs.forEach(
          (f, i) => {

            const osc =
              audioCtx.createOscillator();

            const gain =
              audioCtx.createGain();

            osc.type =
              'sine';

            osc.frequency.setValueAtTime(
              f *
                (1 +
                  i * 0.01),
              ahora
            );

            gain.gain.setValueAtTime(
              Math.max(
                0.0001,
                nivel /
                  freqs.length
              ),
              ahora
            );

            gain.gain.exponentialRampToValueAtTime(
              0.001,
              ahora + dur
            );

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(ahora);

            osc.stop(
              ahora + dur
            );
          }
        );

      } catch (e) {}
    };

  if (
    audioCtx.state ===
    'suspended'
  ) {

    audioCtx
      .resume()
      .then(() => {

        actualizarMasterGain();
        emitir();

      })
      .catch(() => {});

  } else {

    emitir();
  }
}

export function playPageTurn() {

  playSound(
    [400, 500],
    0.2,
    0.035
  );
}

export function playPop() {

  playSound(
    [800, 1000],
    0.15,
    0.05
  );
}

export function playRenacimiento() {

  playSound(
    [300, 500, 700, 900],
    1.5,
    0.07
  );
}


export function actualizarListener() {

  if (!audioCtx)
    return;

  const l =
    audioCtx.listener;

  const p =
    camera.position;

  const dir =
    new THREE.Vector3();

  camera.getWorldDirection(
    dir
  );

  try {

    if (l.setPosition) {

      l.setPosition(
        p.x,
        p.y,
        p.z
      );

      l.setOrientation(
        dir.x,
        dir.y,
        dir.z,
        0,
        1,
        0
      );

    } else if (l.positionX) {

      const t =
        audioCtx.currentTime;

      l.positionX.setValueAtTime(
        p.x,
        t
      );

      l.positionY.setValueAtTime(
        p.y,
        t
      );

      l.positionZ.setValueAtTime(
        p.z,
        t
      );

      l.forwardX.setValueAtTime(
        dir.x,
        t
      );

      l.forwardY.setValueAtTime(
        dir.y,
        t
      );

      l.forwardZ.setValueAtTime(
        dir.z,
        t
      );

      l.upX.setValueAtTime(
        0,
        t
      );

      l.upY.setValueAtTime(
        1,
        t
      );

      l.upZ.setValueAtTime(
        0,
        t
      );
    }

  } catch (e) {}
}


console.log(
  '🎵 4 COMPOSITORES / 1 JARDÍN — ORQUESTA ESPACIAL CARGADA'
);