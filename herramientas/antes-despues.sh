#!/usr/bin/env bash
# antes-despues.sh: video corto de ANTES contra AHORA con barrida, y un número que lo prueba.
# Idea tomada de DualView (gokayfem, MIT), hecha con ffmpeg para que corra por script, sin navegador.
#
# Uso (desde ~/Work/moki-rig, una llamada, con el candado de cosas pesadas):
#   flock /tmp/moki-pesado.lock herramientas/antes-despues.sh ANTES.png AHORA.png salida.mp4
# Opcional: 4o y 5o argumento = ancho y alto (por defecto 1280 720; para Shorts 1080 1920).
#
# Sale:
#   salida.mp4  6 s: 2 s ANTES, 2 s barrida de izquierda a derecha, 2 s AHORA.
#   En la terminal: "SSIM=0.xx" (1.00 = idénticas; entre más bajo, más cambió lo que se ve).
#   Sirve para la regla 12 de build-in-public: qué había, qué hay y un número.
set -euo pipefail

if [ $# -lt 3 ]; then
  sed -n '2,13p' "$0"
  exit 1
fi

ANTES="$1"; AHORA="$2"; SALIDA="$3"; W="${4:-1280}"; H="${5:-720}"
for f in "$ANTES" "$AHORA"; do
  [ -f "$f" ] || { echo "No existe: $f"; exit 1; }
done

# Letra: Outfit del brandkit si está en node_modules; si no, la de sistema.
DIR="$(cd "$(dirname "$0")/.." && pwd)"
FUENTE="$(ls "$DIR"/node_modules/@fontsource/outfit/files/outfit-latin-700-normal.woff 2>/dev/null | head -1 || true)"
[ -n "$FUENTE" ] || FUENTE="$(fc-match -f '%{file}' 'sans:bold')"

# Cada imagen se ajusta al cuadro sin deformarse, con fondo crema del kit.
AJUSTE="scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0xF5EBDD,setsar=1,fps=30,format=yuv420p"
TAM=$(( H / 14 ))
ETQ="fontfile='${FUENTE}':fontsize=${TAM}:fontcolor=0xF5EBDD:box=1:boxcolor=0x2B2118@0.85:boxborderw=$(( TAM / 3 )):x=w-tw-${TAM}:y=${TAM}"

nice -n 10 ffmpeg -hide_banner -loglevel error -y \
  -loop 1 -t 4 -i "$ANTES" -loop 1 -t 4 -i "$AHORA" \
  -filter_complex "[0:v]${AJUSTE},drawtext=text='ANTES':${ETQ}[a];[1:v]${AJUSTE},drawtext=text='AHORA':${ETQ}[b];[a][b]xfade=transition=wiperight:duration=2:offset=2,format=yuv420p[v]" \
  -map "[v]" -c:v libx264 -preset veryfast -crf 20 -movflags +faststart "$SALIDA"

# El número: SSIM entre las dos imágenes al mismo tamaño.
SSIM=$(nice -n 10 ffmpeg -hide_banner -i "$ANTES" -i "$AHORA" \
  -lavfi "[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1[x];[1:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1[y];[x][y]ssim" \
  -f null - 2>&1 | grep -o 'All:[0-9.]*' | cut -d: -f2)
echo "Listo: $SALIDA"
echo "SSIM=${SSIM}"
# Rastro de uso (lo cuenta herramientas/uso-herramientas.sh cada viernes).
mkdir -p "$DIR/evidencia/uso-herramientas"
printf '%s\tantes-despues\t%s\t%s\n' "$(date +%F)" "$SALIDA" "${SSIM}" >> "$DIR/evidencia/uso-herramientas/log.tsv"
