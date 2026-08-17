# Archivo de Señal — sitio del proyecto

Este es un sitio web estático: solo HTML, CSS y JavaScript. No tiene PHP,
no tiene base de datos, no necesita servidor propio ni dominio pagado.
Puede alojarse gratis y queda navegable para cualquiera que tenga el link,
sin estar indexado en buscadores si así lo prefieres.

---

## Estructura de archivos
sitio/
├── index.html → página principal (el archivo/índice)
├── lectura.html → plantilla de lectura (se usa para TODAS las entradas)
├── about.html → página "Sobre el Archivo de Señal"
├── entradas.json ← ESTE es el archivo que editas para subir contenido
├── robots.txt → control de indexación en buscadores
├── feed.xml → RSS feed (actualizar CADA VEZ que agregues una entrada)
├── assets/
│ ├── styles.css → diseño visual
│ ├── index.js → lógica del índice
│ ├── lectura.js → lógica de la página de lectura
│ └── img/ → carpeta para todas las imágenes
│ ├── logo.png → logotipo en la esquina superior izquierda
│ ├── logo@2x.png → versión retina del logotipo
│ ├── boton.png → imagen decorativa en el footer (easter egg)
│ ├── memoriarota.png → portada entrada 1
│ ├── arquitectura.png → portada entrada 2
│ └── dataverso.png → portada entrada 3
└── contenido/
├── memoria-rota.json
├── arquitectura-sonora.json
└── datos-masivos.json

text

---

## Características principales

- ✅ **Logo personalizado** en el header
- ✅ **Easter egg**: hacer clic en la imagen del footer (`boton.png`) lleva a la página "About"
- ✅ **Página About** separada con el manifiesto completo del proyecto
- ✅ **Mapa conceptual interactivo** (Force-Directed Graph con D3.js)
  - Cada nodo es un tag que aparece en al menos 2 entradas
  - Las conexiones muestran entradas que comparten conceptos
  - Arrastrable y clickeable para buscar
- ✅ **Sección transmedia** con QR y enlaces a videos de Instagram/TikTok
- ✅ **Búsqueda en tiempo real** en el índice
- ✅ **Modo oscuro/claro** con persistencia en localStorage
- ✅ **Botón "volver arriba"** que aparece al hacer scroll
- ✅ **Vista grid/lista** con persistencia en localStorage
- ✅ **Botones de compartir** en redes sociales (X, Bluesky, LinkedIn, WhatsApp, Facebook, Reddit, Instagram, Substack)
- ✅ **Redes sociales del autor** en el footer (Instagram, TikTok, Demo Reel)
- ✅ **Skeleton screens** mientras cargan los datos
- ✅ **Animación de entrada** en las filas del archivo
- ✅ **Open Graph meta tags** para previsualización en redes sociales
- ✅ **Favicon** personalizado
- ✅ **Robots.txt** configurado para indexación controlada
- ✅ **Feed RSS** para suscripciones

---

## 📝 Cómo agregar una pieza nueva (PASO A PASO)

### Paso 1: Crear el archivo de contenido

Dentro de la carpeta `contenido/`, crea un nuevo archivo JSON con el nombre que elegiste para tu entrada (ej. `mi-nuevo-ensayo.json`).

**Estructura del archivo de contenido:**

```json
{
  "cuerpo": [
    { "tipo": "parrafo", "texto": "Primer párrafo del texto." },
    { "tipo": "subtitulo", "texto": "Un subtítulo dentro del texto" },
    { "tipo": "parrafo", "texto": "Otro párrafo." },
    { "tipo": "cita", "texto": "Una frase destacada o cita textual." },
    { "tipo": "destacado", "texto": "Un bloque destacado visualmente." },
    { "tipo": "imagen", "src": "assets/img/mi-imagen.jpg", "alt": "Descripción", "pie": "Figura 1: Pie de imagen" }
  ]
}
Tipos de bloques disponibles:

Tipo	Uso
parrafo	Texto normal
subtitulo	Subtítulo dentro del texto (h3)
cita	Cita textual con borde lateral
destacado	Bloque resaltado con fondo y borde
imagen	Imagen con pie opcional (src, alt, pie)
Paso 2: Agregar la entrada a entradas.json
Abre entradas.json y agrega un nuevo objeto dentro del array "entradas".

Estructura mínima:

json
{
  "id": "mi-nuevo-ensayo",
  "archivo": "mi-nuevo-ensayo.json",
  "portada": "assets/img/mi-portada.png",
  "pieza": "39913EM-DOC-003",
  "titulo": "Título de la pieza",
  "subtitulo": "Subtítulo o bajada (opcional, puedes borrar esta línea)",
  "fecha": "2026-09-01",
  "categoria": "Ensayo",
  "extracto": "Resumen de 1-2 líneas que aparece en el índice.",
  "tags": ["tag1", "tag2", "tag3"],
  "transmedia": {
    "videos": [
      {
        "semana": 1,
        "titulo": "Título del video complementario",
        "plataforma": "instagram",
        "url": "https://www.instagram.com/p/...",
        "embed": "https://www.instagram.com/p/.../embed",
        "extracto": "Extracto del video"
      }
    ],
    "hashtag": "#MiHashtag"
  }
}
Reglas importantes:

El id debe ser único y sin espacios ni acentos (usa guiones: mi-nuevo-ensayo).

El archivo debe coincidir con el nombre del archivo JSON que creaste en el Paso 1.

La sección transmedia es opcional. Si no tienes videos, puedes omitirla.

No olvides la coma , al final de la entrada anterior si agregas una nueva.

Si tu texto tiene comillas dentro, escríbelas así: \"como esto\".

Paso 3: Subir imágenes (si las hay)
Si tu entrada tiene imágenes de portada o imágenes dentro del cuerpo:

Coloca las imágenes en la carpeta assets/img/

Asegúrate de que las rutas en entradas.json y en el archivo de contenido sean correctas:

Portada: "portada": "assets/img/mi-portada.png"

Imagen en el cuerpo: "src": "assets/img/mi-imagen.jpg"

Paso 4: Actualizar el feed RSS (feed.xml)
IMPORTANTE: El feed RSS no se actualiza automáticamente. Debes agregar manualmente un nuevo <item> para cada entrada nueva.

Abre feed.xml y agrega un nuevo bloque <item> dentro de <channel>:

xml
<!-- ENTRADA NUEVA: Mi nuevo ensayo -->
<item>
  <title>Título de la pieza</title>
  <link>https://39913em.github.io/archivo-de-senal/lectura.html?id=mi-nuevo-ensayo</link>
  <guid>https://39913em.github.io/archivo-de-senal/lectura.html?id=mi-nuevo-ensayo</guid>
  <pubDate>Sun, 01 Sep 2026 12:00:00 GMT</pubDate>
  <description><![CDATA[
    <img src="https://39913em.github.io/archivo-de-senal/assets/img/mi-portada.png" alt="Título de la pieza" style="max-width:100%; border-radius:8px; margin-bottom:16px;">
    <p>Aquí va el extracto de la entrada...</p>
    <p>📹 <a href="https://www.instagram.com/p/..." target="_blank">Ver video complementario en Instagram</a></p>
  ]]></description>
  <category>Ensayo</category>
</item>
Formato de fecha para <pubDate>:

Día	Formato
Lunes	Mon
Martes	Tue
Miércoles	Wed
Jueves	Thu
Viernes	Fri
Sábado	Sat
Domingo	Sun
Ejemplo: Sun, 01 Sep 2026 12:00:00 GMT

Actualiza también la fecha de lastBuildDate al inicio del archivo:

xml
<lastBuildDate>Sun, 01 Sep 2026 12:00:00 GMT</lastBuildDate>
Paso 5: Validar el JSON
Antes de subir los archivos, valida que el JSON esté bien escrito:

Copia el contenido de entradas.json

Pégalo en jsonlint.com

Si hay errores, corrígelos

Paso 6: Subir a GitHub
bash
git add .
git commit -m "Agregar nueva entrada: Título de la pieza"
git push
Paso 7: Verificar en el sitio
Espera 1-2 minutos a que GitHub Pages se actualice

Visita tu sitio: https://39913em.github.io/archivo-de-senal/

Confirma que la nueva entrada aparece en el índice

Haz clic en la entrada para verificar que el contenido se carga correctamente

Si tienes videos en la sección transmedia, verifica que aparezcan con QR y enlaces

Cómo alojarlo gratis (sin dominio propio)
Opción recomendada: GitHub Pages
Crea una cuenta gratis en github.com si no tienes una.

Crea un repositorio nuevo (botón "New repository"), público, con cualquier nombre (ej. archivo-de-senal).

Sube todos los archivos de esta carpeta (index.html, lectura.html, about.html, entradas.json, la carpeta assets/, la carpeta contenido/) arrastrándolos a la página del repositorio.

Ve a Settings → Pages, en "Branch" elige main y guarda.

En unos minutos tu sitio queda disponible en:
https://tu-usuario.github.io/archivo-de-senal/

Esa URL es la que pones en el link de bio. No necesitas pagar nada, no
necesitas dominio, y nadie llega ahí a menos que tenga el link directo —
no aparece en buscadores a menos que Google lo rastree por sí mismo
(puedes pedir que no se indexe agregando un archivo robots.txt, te lo
dejo abajo por si lo necesitas).

Alternativas igual de válidas
Netlify (netlify.com): arrastras la carpeta entera a su panel y te da una URL al instante.

Vercel (vercel.com): similar a Netlify, conecta con GitHub o subes la carpeta directo.

Cualquiera de las tres es gratuita para este uso y no expira mientras
sigas usando la cuenta.

Personalización del sitio
Logo en el header
El logotipo aparece en la esquina superior izquierda. Para cambiarlo:

Reemplaza los archivos assets/img/logo.png y assets/img/logo@2x.png con tus propias imágenes.

Mantén el mismo tamaño aproximado (40px de alto) o ajusta el CSS en styles.css.

Imagen decorativa en el footer (Easter Egg)
La imagen assets/img/boton.png aparece centrada en la parte inferior de todas las páginas.

Hacer clic en ella → te lleva a la página about.html (easter egg).

En la página About, hacer clic en ella → te devuelve a index.html.

Para cambiarla: reemplaza el archivo assets/img/boton.png con tu nueva imagen.

Página About
La página about.html contiene el manifiesto completo del proyecto. Para modificarla:

Abre about.html

Edita el texto dentro de <div class="about-contenido">

Guarda y sube los cambios

Imágenes dentro de los ensayos
Puedes agregar imágenes en el cuerpo de cualquier entrada usando el bloque imagen:

json
{ "tipo": "imagen", "src": "assets/img/mi-foto.jpg", "alt": "Descripción", "pie": "Figura 1: Título de la imagen" }
Las imágenes deben estar en la carpeta assets/img/.

Imágenes de portada
Cada entrada puede tener una imagen de portada que aparece en la parte superior de la página de lectura. Agrega el campo "portada" en entradas.json:

json
"portada": "assets/img/mi-portada.png"
Mapa conceptual
El mapa conceptual se genera automáticamente a partir de los tags de todas las entradas.

Solo aparecen tags que se repiten en al menos 2 entradas.

Solo aparecen tags que tienen al menos 1 conexión con otro tag.

El tamaño del nodo refleja su frecuencia.

Al hacer clic en un nodo, se activa la búsqueda de ese tag.

Modo oscuro/claro
El tema se guarda en el navegador y persiste entre sesiones. El botón de toggle está en el header.

Si quieres que NO aparezca en buscadores
Crea un archivo llamado robots.txt en la misma carpeta raíz con este contenido:

text
User-agent: *
Disallow: /
Esto le pide a los buscadores que no indexen el sitio. No es una garantía
absoluta de privacidad (alguien con el link siempre puede entrar), pero
evita que aparezca en resultados de búsqueda.

Configuración actual de robots.txt
El sitio está configurado para permitir indexación:

text
User-agent: *
Allow: /
Allow: /lectura.html
Disallow: /assets/
Disallow: /contenido/
Probarlo en tu computadora antes de subirlo
Si abres index.html haciendo doble clic, es posible que el navegador
bloquee la carga de entradas.json por seguridad (esto es normal en
archivos locales). Para probarlo bien en tu computadora:

Si tienes Python instalado: abre una terminal en esta carpeta y corre
python3 -m http.server, luego visita http://localhost:8000 en tu navegador.

O simplemente sube los archivos a GitHub Pages / Netlify directamente:
ahí no tendrás ese problema, porque ya es un servidor real (aunque gratuito).

Estado actual del sitio
✅ Logo personalizado en el header

✅ Página About con manifiesto completo

✅ Easter egg: imagen del footer → About

✅ Mapa conceptual interactivo con discriminación inteligente de nodos

✅ Sección transmedia con QR y enlaces a videos

✅ 3 piezas publicadas (Memoria rota, Arquitectura sonora, DATARTVERSO)

✅ Modo oscuro/claro con persistencia

✅ Búsqueda en tiempo real

✅ Vista grid/lista con persistencia

✅ Botones de compartir en redes sociales

✅ Redes sociales del autor en el footer

✅ Open Graph meta tags para previsualización

✅ Favicon personalizado

✅ Feed RSS

✅ Estructura estática y autónoma

✅ Alojado en GitHub Pages

Checklist para agregar una nueva entrada
□ Crear archivo JSON en contenido/ con el cuerpo de la entrada
□ Agregar entrada en entradas.json (id, archivo, portada, título, extracto, tags, etc.)
□ Subir imágenes de portada y/o cuerpo a assets/img/
□ Agregar nuevo <item> en feed.xml
□ Actualizar lastBuildDate en feed.xml
□ Validar JSON en jsonlint.com
□ Subir cambios a GitHub (git add ., git commit, git push)
□ Esperar 1-2 minutos y verificar en el sitio
Última actualización: Agosto 2026

text

---

## Resumen de cambios en el README

| Sección | Cambio |
|---------|--------|
| Estructura de archivos | Agregado `about.html` |
| Características principales | **NUEVA** - Lista completa de funcionalidades |
| Cómo agregar una pieza nueva | **NUEVA** - Guía paso a paso (7 pasos) |
| Actualizar feed RSS | **NUEVA** - Instrucciones detalladas |
| Personalización | Agregada sección sobre la página About y el easter egg |
| Robots.txt | Actualizada la configuración actual |
| Estado actual | Actualizado con todas las funcionalidades |
| Checklist | **NUEVA** - Lista de verificación para agregar entradas |

---

**Copia y pega este contenido en tu archivo `README.md` y sube los cambios a GitHub.**
