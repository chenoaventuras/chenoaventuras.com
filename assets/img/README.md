# Imágenes — mapa de sustitución

**IMPORTANTE:** todas las imágenes de esta carpeta son **provisionales**.
Son recortes de baja resolución de las maquetas de Figma (imágenes generadas por
IA, con texto/UI incrustado en algunos bordes). Sirven solo para ver la
estructura. Sustitúyelas por fotos propias de alta calidad manteniendo **el mismo
nombre de archivo** y no habrá que tocar el HTML.

| Archivo | Dónde se usa | Tamaño recomendado | Encuadre |
|---|---|---|---|
| `hero-cala.jpg` | Portada: fondo del hero · cabeceras de Servicios y Contacto | 2400×1600 (horizontal) | Persona pequeña en el tercio izquierdo, paisaje a la derecha (el texto va encima a la izquierda) |
| `equipo-gear.jpg` | Portada: bloque "Equipo" · cabecera y bloque de Equipo | 1600×1200 | Equipo sobre roca, aire a los lados |
| `newsletter-van.jpg` | Portada y Destinos: fondo oscuro de la newsletter | 2000×1000 (horizontal) | Furgoneta/atardecer, admite oscurecido fuerte |
| `dron-vuelo.jpg` | Servicios: bloque de dron · tira de portada | 1400×900 | Dron en vuelo con cielo limpio |
| `dron-piloto.jpg` | Aventuras / Equipo / Sobre mí: cabeceras y bloques | 1400×1600 (vertical) | Piloto de espaldas, montaña detrás |
| `sobre-mi-retrato.jpg` | Sobre mí: foto tipo polaroid | 1200×1200 (cuadrada) | Cheno sentado mirando el paisaje |
| `destinos/cola-de-caballo.jpg` | Destacados / Destinos / Aventuras | 900×1200 (vertical 3:4) | Cascada |
| `destinos/altea.jpg` | Destacados / Destinos | 900×1200 (vertical 3:4) | Cúpula azul de Altea |
| `destinos/bateria-castillitos.jpg` | Destacados / Destinos | 900×1200 (vertical 3:4) | Cañón de la batería |
| `blog/blog-hero.jpg` | Cabeceras de Blog y Destinos | 2400×1000 | Cadena montañosa, admite oscurecido |
| `blog/cola-de-caballo.jpg` | Blog: entrada · Aventuras | 1200×800 (3:2) | Cascada |
| `blog/altea.jpg` | Blog: entrada · Aventuras | 1200×800 (3:2) | Pueblo blanco |
| `blog/planificar-viaje.jpg` | Blog: entrada · Aventuras | 1200×800 (3:2) | Lago de montaña |
| `blog/furgoneta.jpg` | Blog: entrada · Aventuras | 1200×800 (3:2) | Furgoneta al atardecer |

## Logo

No hay logo real. El wordmark "Cheno / AVENTURAS" del header y el footer está hecho
con tipografía (`Sacramento` + `Oswald`). Cuando exista el logo definitivo (SVG o
PNG con transparencia), añádelo como `assets/img/logo.svg` y reemplaza el bloque
`.brand` en las cabeceras.

## Bordes de papel rasgado

`edges/torn-paper.svg` y `edges/torn-dark.svg` son decorativos (divisores entre
secciones). El color del relleno debe coincidir con el de la sección siguiente:
`#efece7` (papel) y `#20261f` (noche). Si cambias la paleta, edita el `fill` del SVG.
