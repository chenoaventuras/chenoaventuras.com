# chenoaventuras.com

Sitio estático de **Cheno Aventuras** — marca de contenido de viajes en Instagram.
Sin framework ni paso de build: HTML + CSS + un JS pequeño. Se puede abrir
`index.html` directamente o servir la carpeta tal cual (GitHub Pages, Netlify…).

## Estructura

```
index.html          Inicio (hero + curiosidades + destacados + equipo + newsletter)
destinos.html       Rejilla de destinos
aventuras.html      Rutas y experiencias
servicios.html      Servicios + #dron (certificación A1/A3) + #descuentos
blog.html           Listado de entradas
equipo.html         Equipo con el que viaja
sobre-mi.html       "Soy Cheno" + cifras
contacto.html       Formulario (demo, sin backend)
assets/
  css/styles.css    Toda la hoja de estilos (tokens de color y tipografía arriba)
  js/main.js        Menú móvil, rotador de curiosidades, reveal on scroll, año
  img/              Imágenes PROVISIONALES (ver assets/img/README.md)
  img/edges/        Divisores SVG de "papel rasgado"
```

## Pendiente (marcado como *placeholder* en el propio sitio)

- **Fotos y logo reales.** Todo lo de `assets/img/` es un recorte temporal de las
  maquetas de Figma. Mapa de sustitución en [`assets/img/README.md`](assets/img/README.md).
- **Curiosidades.** La barra rotativa del hero y las 6 tarjetas de la sección
  "Curiosidades" usan texto de relleno. Editar:
  - barra del hero → array `CURIOSIDADES_PLACEHOLDER` en `assets/js/main.js`
    (o atributo `data-curiosidades='["...","..."]'` en `.curiosbar`).
  - tarjetas → sección `.curios` en `index.html`.
- **Contenido real** de destinos, aventuras, blog, equipo y biografía.
- **Formularios.** Newsletter y contacto son demo (no envían nada). Conectar a un
  servicio tipo Formspree / Netlify Forms / API propia.
- **Enlaces sociales.** Instagram ya apunta a `@chenoaventuras`; YouTube y TikTok
  son `#`.
- **Email de contacto** por confirmar.

## Diseño

Basado en la "Opción 2" del Figma. Paleta: verde oliva `#77854f`, papel
`#efece7`, verde-azulado profundo en fotos, footer `#20261f`. Tipografías de
Google Fonts: **Anton** (títulos grandes), **Oswald** (titulares), **Barlow**
(texto), **Sacramento** (wordmark).
