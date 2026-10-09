#!/usr/bin/env bash
# Trabajo en paralelo: una carpeta (worktree) y una rama por conversación.
#
#   scripts/sesion.sh nueva <nombre>   crea la carpeta de trabajo y la rama sesion/<nombre>
#   scripts/sesion.sh terminar         (desde la carpeta de trabajo) sube lo hecho a main
#   scripts/sesion.sh limpiar <nombre> borra la carpeta de trabajo y su rama (ya subida)
#   scripts/sesion.sh estado           lista las carpetas de trabajo
set -euo pipefail

MAIN="$(git worktree list --porcelain | awk '/^worktree /{print substr($0,10); exit}')"
BASE="$(dirname "$MAIN")/chenoaventuras-sesiones"
cmd="${1:-}"

case "$cmd" in
  nueva)
    name="${2:-}"
    [[ "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Uso: scripts/sesion.sh nueva <nombre-corto>   (minúsculas, números y guiones)"; exit 1; }
    dir="$BASE/$name"
    branch="sesion/$name"
    [ ! -e "$dir" ] || { echo "Ya existe $dir"; exit 1; }
    git -C "$MAIN" fetch -q origin
    mkdir -p "$BASE"
    git -C "$MAIN" worktree add -q -b "$branch" "$dir" origin/main

    # node_modules compartido (se ignora en todos los worktrees)
    if [ -d "$MAIN/node_modules" ]; then
      ln -s "$MAIN/node_modules" "$dir/node_modules"
      grep -qx 'node_modules' "$MAIN/.git/info/exclude" 2>/dev/null || echo 'node_modules' >> "$MAIN/.git/info/exclude"
    fi

    # servidor de pruebas con puerto propio (para no chocar con otras conversaciones)
    port=$((8200 + $(printf %s "$name" | cksum | cut -d' ' -f1) % 700))
    if [ -f "$MAIN/.claude/launch.json" ]; then
      mkdir -p "$dir/.claude"
      sed "s/8123/$port/g" "$MAIN/.claude/launch.json" > "$dir/.claude/launch.json"
    fi

    echo "Carpeta de trabajo: $dir"
    echo "Rama:               $branch"
    echo "Puerto de pruebas:  $port"
    echo "Trabaja SIEMPRE dentro de esa carpeta. Al terminar: scripts/sesion.sh terminar"
    ;;

  terminar)
    top="$(git rev-parse --show-toplevel)"
    [ "$top" != "$MAIN" ] || { echo "Estás en la carpeta principal. Ejecútalo desde una carpeta de trabajo (scripts/sesion.sh nueva ...)."; exit 1; }
    if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
      echo "Hay cambios sin commitear. Haz commit primero (git add <tus archivos> && git commit)."; exit 1
    fi
    git fetch -q origin
    if ! git rebase origin/main; then
      echo; echo "Conflicto al ponerlo al día con main. Resuélvelo (git status), haz 'git rebase --continue' y repite este comando."; exit 1
    fi
    git push origin HEAD:main
    echo "Subido a main. Si ya no la necesitas: scripts/sesion.sh limpiar $(basename "$top")"
    ;;

  limpiar)
    name="${2:-}"
    [ -n "$name" ] || { echo "Uso: scripts/sesion.sh limpiar <nombre>"; exit 1; }
    dir="$BASE/$name"
    git -C "$MAIN" fetch -q origin
    # solo se borra si todo lo de la rama ya está en main
    if [ -n "$(git -C "$MAIN" log origin/main..sesion/$name --oneline 2>/dev/null)" ]; then
      echo "La rama sesion/$name tiene commits que NO están en main. No la borro."; exit 1
    fi
    if [ -d "$dir" ] && [ -n "$(git -C "$dir" status --porcelain --untracked-files=no)" ]; then
      echo "La carpeta tiene cambios sin commitear. No la borro."; exit 1
    fi
    rm -f "$dir/node_modules"
    git -C "$MAIN" worktree remove --force "$dir"
    git -C "$MAIN" branch -D "sesion/$name" -q
    echo "Borrada la carpeta y la rama de '$name'."
    ;;

  estado)
    git worktree list
    ;;

  *)
    sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
