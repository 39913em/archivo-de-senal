//Configuración, Léxico y Columnas //


export const CONFIG = {
  MAX_VIDA: 30,
  VIDAS_INICIALES: 5,
  HAUKUS_PARA_REVIVIR: 5,
  CORRUPCION_UMBRAL: 3,
  FADEOUT_ELEMENTO: 1000,
  VEL_FRACTURA: 0.7,
  VEL_SENIAL: 1.4,
  VEL_RESONANCIA: 1.2,
};

export const ESCALA_SEÑAL = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];
export const ESCALA_RESONANCIA = [261.63, 293.66, 329.63, 392.00, 440.00];
export const RANGO_DERIVA = { min: 100, max: 600 };
export const RANGO_FRACTURA = { min: 300, max: 900 };

export const LEXICO_INICIAL = {
  señal: [
    "bit que late", "dato sin dueño", "pulso digital", "flujo errante",
    "byte disperso", "señal perdida", "frecuencia abierta", "eco de datos",
    "huella en cache", "terabyte que pesa", "ping perdido", "dato que vibra",
    "consulta que no vuelve", "píxel que sangra", "volumen sin forma",
    "nube que arde", "latencia infinita", "servidor que suda", "hash disperso",
    "protocolo abierto", "paquete en tránsito", "interfaz que respira",
    "bucle infinito", "algoritmo ciego", "archivo sin nombre", "metadato perdido",
    "flujo binario", "señal de ruido", "conexión inestable", "puerto abierto",
    "socket que escucha", "payload errante", "checksum corrupto", "bit rot",
    "datos en deriva", "memoria volátil", "código fuente", "registro de eventos",
    "huella digital", "rastro de bytes", "fragmento de red", "onda portadora",
    "señal de audio", "modulación errante", "espectro visible", "frecuencia modulada"
  ],
  resonancia: [
    "bóveda de reverb", "pared de aire", "cámara de eco", "espacio resonante",
    "sala sin puertas", "eco que construye", "catedral de auriculares", "umbral que se escucha",
    "edificio de silencio", "fachada de sonido", "planta de frecuencias", "bóveda de bits",
    "arco de fase", "columna de datos", "puente de red", "espejo de código",
    "laberinto de espejos", "galería de ecos", "cúpula de silencio", "portal de acceso",
    "archivo de señales", "biblioteca de ruidos", "cripta de datos", "torre de control",
    "zona de interferencia", "área de cobertura", "nodo de red", "enjambre de señales",
    "mar de datos", "océano de bits", "cielo de frecuencias", "suelo de código",
    "muro de silencio", "puente de ecos", "pasillo de bytes", "habitación de espejos",
    "patio de resonancia", "ágora de datos", "foro de códigos", "plaza de señales",
    "jardín de interfaces", "bosque de protocolos", "desierto de datos", "montaña de bits",
    "valle de frecuencias", "río de señales", "mar de ruido", "torre de señales"
  ],
  fractura: [
    "cinta mordida", "olvido programado", "sector dañado", "ciclo que se trunca",
    "fragmento ilegible", "memoria que se cae", "versión que no vuelve", "copia corrupta",
    "disco estrellado", "track perdido", "archivo sin nombre", "sector fantasma",
    "bit olvidado", "byte perdido", "bloque dañado", "cinta desmagnetizada",
    "disco rayado", "memoria fragmentada", "registro borrado", "firma ausente",
    "huella desvanecida", "rastro perdido", "pista de error", "fallo silencioso",
    "señal degradada", "frecuencia rota", "espectro de ruido", "eco distorsionado",
    "interferencia estática", "pérdida de paquete", "archivo truncado", "enlace caído",
    "nodo desconectado", "ruta perdida", "paquete errante", "checksum fallido",
    "hash roto", "firma inválida", "certificado expirado", "clave olvidada",
    "acceso denegado", "permiso caducado", "autenticación fallida", "sesión expirada",
    "conexión interrumpida", "servidor caído", "copia ilegible", "mensaje corrupto"
  ],
  deriva: [
    "siembra que salva", "torrent vivo", "mano que pasa el archivo", "semilla que no muere",
    "copia que resiste", "red que comparte", "flujo sin dueño", "código abierto",
    "acceso no privilegio", "huella que se distribuye", "enjambre de datos", "propagación libre",
    "transmisión horizontal", "flujo de código", "siembra digital", "rizoma de señales",
    "red de nodos", "cadena de bloques", "flujo descentrado", "distribución abierta",
    "compartir sin medida", "esparcir semillas", "propagar el eco", "sembrar en el ruido",
    "cosechar datos", "abrir puertos", "tender puentes", "tejer redes",
    "hilvanar señales", "enhebrar bits", "urdimbre de códigos", "trama de datos",
    "bordar en la red", "tejer en la interferencia", "anudar protocolos", "enlazar nodos",
    "tejer en el archivo", "bordar el silencio", "anudar la señal", "enhebrar el eco",
    "sembrar en el error", "cosechar la fractura", "propagar la deriva", "esparcir el flujo"
  ]
};

export const datosColumna = [
  { label:'SEÑAL', x:-4.5, z:-2.5, color:0xff6b35, forma:'cubos',
    escala:[185,220,246,277,329,369], onda:'sine',
    ensayo:{ titulo:'Señal', bloques:[
      {tipo:'subtitulo', texto:'El dato como flujo, no como masa'},
      {tipo:'parrafo', texto:'El bit que late, el pulso digital, la huella en el cache.'},
      {tipo:'parrafo', texto:'La información nunca es gratis: detrás de cada consulta hay un servidor que suda.'},
      {tipo:'cita', texto:'"Los datos no son neutros. Son huellas de un mundo que ya no puede contenerlos."'},
      {tipo:'parrafo', texto:'La señal viaja, se difumina, se pierde en el ruido.'}
    ]}},
  { label:'RESONANCIA', x:4.5, z:-2.5, color:0x4fc3f7, forma:'ondas',
    escala:[196,220,246,293,349,392], onda:'triangle',
    ensayo:{ titulo:'Resonancia', bloques:[
      {tipo:'subtitulo', texto:'El espacio que vibra'},
      {tipo:'parrafo', texto:'El silencio también construye. Cada reverberación traza una pared invisible.'},
      {tipo:'parrafo', texto:'La arquitectura no se ve: se escucha, se recorre con el cuerpo entero.'},
      {tipo:'cita', texto:'"El espacio sonoro es el único territorio que no se puede cercar."'},
      {tipo:'parrafo', texto:'Una catedral de auriculares, un umbral que se escucha.'}
    ]}},
  { label:'FRACTURA', x:-4.5, z:3.5, color:0xff1744, forma:'rota',
    escala:[146,164,174,220,246,261], onda:'sawtooth',
    ensayo:{ titulo:'Fractura', bloques:[
      {tipo:'subtitulo', texto:'El error como método'},
      {tipo:'parrafo', texto:'La memoria digital es frágil, pero el olvido está programado.'},
      {tipo:'parrafo', texto:'Lo que no se repite se pierde en el ruido de fondo.'},
      {tipo:'cita', texto:'"Toda base de datos es también una máquina de olvido selectivo."'},
      {tipo:'parrafo', texto:'Cada versión corrompida es honesta: así se ve la memoria real.'}
    ]}},
  { label:'DERIVA', x:4.5, z:3.5, color:0x00e676, forma:'flotante',
    escala:[220,246,293,329,392,440], onda:'sine',
    ensayo:{ titulo:'Deriva', bloques:[
      {tipo:'subtitulo', texto:'El flujo sin dueño'},
      {tipo:'parrafo', texto:'La cultura se siembra, no se torrentea.'},
      {tipo:'parrafo', texto:'La piratería no es un crimen: es una respuesta a una estructura injusta.'},
      {tipo:'cita', texto:'"Compartir una semilla no es lo mismo que despojar."'},
      {tipo:'parrafo', texto:'El flujo no tiene dueño. La deriva es el único destino.'}
    ]}}
];

export const BANCO_ERROR_PARRAFO = [
  '[ARCHIVO_PERDIDO :: este fragmento fue reclamado por el olvido programado]',
  '[ACCESO_DENEGADO :: contenido bajo licencia irrecuperable]',
  '[ENLACE_ROTO :: 404 en tu nombre]',
  '[DATA_LOSS :: este párrafo ya no pertenece a nadie]',
  '[ERROR 404 :: el texto no puede ser leído]'
];

export const BANCO_BLOQUEO_CITA = [
  '[USO JUSTO NO APLICA AQUÍ :: según el criterio de otro algoritmo]',
  '[ESTE FRAGMENTO NO NOS PERTENECE :: se omite por respeto a su autora]',
  '[SOLICITUD DE RETIRO ATENDIDA :: contenido no disponible en tu región]',
  '[LICENCIA EXPIRADA :: el permiso para citar esto ya no existe]',
  '[MARCADO POR EL SISTEMA :: no toda cita sobrevive a la moderación]'
];