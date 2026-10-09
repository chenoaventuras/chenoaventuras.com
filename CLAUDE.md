# chenoaventuras.com — instrucciones para Claude

Web estática (HTML/CSS/JS) + blog en Markdown que se compila con `npm run build`. Se despliega sola en Vercel al hacer push a `main`.

## Trabajo en paralelo: una carpeta por conversación (OBLIGATORIO)

El usuario suele tener **varias conversaciones con Claude a la vez** sobre este proyecto. Si todas editan la misma carpeta, los cambios se mezclan. Por eso:

1. **Antes de modificar ningún archivo**, crea tu propia carpeta de trabajo:
   ```bash
   scripts/sesion.sh nueva <nombre-corto-de-la-tarea>
   ```
   Te crea `../chenoaventuras-sesiones/<nombre>/` con la rama `sesion/<nombre>` y un puerto de pruebas propio (`.claude/launch.json`). **Trabaja siempre dentro de esa carpeta**, nunca en la carpeta principal. (Alternativa: la herramienta `EnterWorktree`.)
2. Dentro de tu carpeta funciona todo igual: `npm run build`, el servidor de pruebas (`preview_start`), commits.
3. **Al terminar y con el visto bueno del usuario**: haz commit de tus archivos (`git add <archivos concretos>`, nunca `git add -A`) y ejecuta `scripts/sesion.sh terminar`. Eso pone tu rama al día con `origin/main` y hace push a `main`.
4. Cuando ya esté subido: `scripts/sesion.sh limpiar <nombre>` borra tu carpeta y tu rama.
5. La **carpeta principal** (`chenoaventuras.com/`) es solo de integración: no se edita en ella. Si ves cambios sin commitear ahí que no son tuyos, no los toques ni los subas; avisa al usuario.

## Reglas del proyecto

- Enseña los cambios visuales en el navegador (localhost) y espera el visto bueno del usuario antes de hacer push.
- Se compilan al desplegar y están en `.gitignore`: `blog/`, `destinos/`, `blog.html`, `mapa.html`, `sitemap.xml`. No se commitean.
- No subir al repositorio los PDF de guías de la raíz (`Guia-*.pdf`), vídeos ni fotos sueltas: las guías públicas van en `assets/guias/`.
- El repositorio de GitHub es **público**: nunca claves, tokens ni datos personales.
- Hablar con el usuario en español, de forma breve y sin jerga.
