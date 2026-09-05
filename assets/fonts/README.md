# Tipografías de marca — Cheno Aventuras

Archivos facilitados por el usuario ("son las de @chenoaventuras").

| Archivo | Familia CSS | Peso / estilo | Uso en la web |
|---|---|---|---|
| `Inter-Black.otf` | `"Inter Black"` | 900 normal | Titulares: hero, `<h1>` de página, `.title`, cifras grandes, wordmark |
| `Inter-BlackItalic.otf` | `"Inter Black"` | 900 italic | Cursiva de titulares (si se usa) |
| `Poppins-SemiBold.ttf` | `"Poppins"` | 600 normal | Subtítulos, menú, botones, etiquetas, `h3`/`h4` |
| `Poppins-MediumItalic.ttf` | `"Poppins"` | 500 italic | Cursiva de énfasis / notas |

**Poppins 400 y 500 rectos** (cuerpo de texto) se cargan desde Google Fonts
mediante el `<link>` de cada página — no hacía falta el archivo local.

Declaraciones `@font-face` en `assets/css/styles.css` (arriba del todo).

## Licencias

Tanto **Inter** como **Poppins** se distribuyen bajo **SIL Open Font License 1.1**,
que permite el uso e incrustación en webs sin coste. Inter descargado de
Fontmirror; Poppins es de Google Fonts.

## Optimización pendiente (opcional)

Los archivos van en `.otf`/`.ttf` (~140–240 KB cada uno). Convertir a **WOFF2**
reduce el peso ~50–70 %. En este equipo no había herramienta de conversión
(`woff2_compress` / `fonttools`); hacerlo cuando se pueda y actualizar las
rutas de `@font-face`.
