# chenoaventuras.com

Sitio estático de **Cheno Aventuras** — marca de contenido de viajes en Instagram.
Sin framework ni paso de build: HTML + CSS + un JS pequeño. Se sirve tal cual
(desplegado en Vercel).

## Estructura

```
index.html          Inicio (hero + curiosidades + destacados + equipo + descuentos + últimas publicaciones + newsletter)
aventuras.html      Destinos, rutas y aventuras (antes "Destinos" y "Aventuras", ahora unificadas)
curiosidades.html   Vídeos de Instagram sobre curiosidades
servicios.html      Servicios + #dron (certificación A1/A3) + #descuentos
equipo.html         Equipo con el que viaja
contacto.html       "Soy Cheno" + cifras + formulario (demo) — unifica Sobre mí y Contacto
vercel.json         Redirecciones 301 de las URLs antiguas (/destinos, /blog, /sobre-mi)
assets/
  css/styles.css    Toda la hoja de estilos (tokens de color y tipografía arriba)
  js/main.js         Menú, "¿Sabías que…?", últimas publicaciones IG, reveal, año
  fonts/             Inter Black + Poppins self-host (ver su README)
  img/               Imágenes PROVISIONALES (ver assets/img/README.md)
  img/edges/         Divisores SVG de "papel rasgado"
  img/instagram/     Miniaturas descargadas por la GitHub Action (se crea sola)
  data/instagram.json  Últimas 3 publicaciones (la actualiza la Action a diario)
scripts/fetch-instagram.mjs         Descarga las publicaciones vía API de Instagram
.github/workflows/instagram.yml     Cron diario que ejecuta el script y hace push
```

## Menú

`Inicio · Aventuras · Curiosidades · Servicios · Equipo · Contacto`.
Arriba, iconos de **Instagram y TikTok**; en el pie, los cuatro:
Instagram, YouTube, TikTok y Facebook.

## Curiosidades del hero ("¿Sabías que…?")

`assets/js/main.js` tiene un array `CURIOSIDADES` (ciudades españolas, cultura,
fauna, pueblos, demografía). Cada día se eligen **3** de forma determinista según
la fecha y la barra va alternando entre ellas. Añadir/editar frases en ese array.

## Últimas publicaciones de Instagram (automático)

`.github/workflows/instagram.yml` corre **cada día**: llama a la API de Instagram,
descarga las 3 últimas publicaciones y sus miniaturas, escribe
`assets/data/instagram.json` y hace `git push` si hay cambios. Vercel redespliega.

**Falta configurar** (en *Settings → Secrets and variables → Actions* del repo):

| Secret | Qué es |
|---|---|
| `IG_ACCESS_TOKEN` | *Long-lived access token* de la **API de Instagram con Instagram Login** (cuenta profesional). Caduca a los ~60 días → hay que refrescarlo. |
| `IG_USER_ID` | *(opcional)* ID del usuario de Instagram; por defecto `me`. |

Sin el secret, la Action no falla: simplemente no toca nada y la web muestra los
3 posts de ejemplo de `instagram.json`.

## Pendiente (marcado como *placeholder* en el propio sitio)

- **Fotos y logo reales.** Todo `assets/img/` son recortes temporales de las
  maquetas de Figma. Mapa en [`assets/img/README.md`](assets/img/README.md).
- **Códigos de descuento reales** (Holafly, GetYourGuide, Insta360) y sus enlaces.
- **Formularios.** Newsletter y contacto solo muestran "¡Vamos a la aventura!";
  todavía no guardan el correo ni avisan. Pendiente elegir servicio/backend.
- **Contenido real** de aventuras, equipo, biografía y cifras.
- **Refresco del token de Instagram** cada ~50 días (o automatizarlo).

## Diseño

Basado en la "Opción 2" del Figma. Paleta: verde oliva `#77854f`, papel
`#efece7`, verde-azulado profundo en fotos, footer `#20261f`.

Tipografías de marca (las de @chenoaventuras): **Inter Black 900** para titulares
y el wordmark, **Poppins** (600 subtítulos/menú/botones, 400/500 cuerpo). Inter y
Poppins 600/500‑ital self-hosted en `assets/fonts/`; Poppins 400/500 rectos desde
Google Fonts.
