#!/usr/bin/env bash
# uso-herramientas.sh: cuenta si de verdad se usa cada herramienta o método que adoptó el estudio. Sin IA.
# Canon: Jorge 11-nov 02:15 ("que sí funcione mejor Moki Studio cada vez"). Lección del 9 al 11-nov:
# lo que entró a COLA se hizo (P6a); lo que solo quedó como regla o script casi no se usó.
#
# Lee herramientas/ADOPTADAS.tsv (nombre, tipo, patrón, dueño, cuándo se usa, desde).
#   tipo=herramienta: cuenta solo lo que la herramienta misma anota en evidencia/uso-herramientas/log.tsv.
#   tipo=metodo: cuenta commits y líneas nuevas de BITACORA.md y DECISIONES.md que lo nombran.
# Escribe evidencia/uso-herramientas/AAAA-MM-DD.md.
# Con --cola agrega a COLA.md una pieza KAIZEN por cada una en 0 usos (si no hay ya una abierta).
# Uso: herramientas/uso-herramientas.sh [--cola]   (DIAS=7 por defecto; ADOPTADAS=otra.tsv para pruebas)
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
DIAS="${DIAS:-7}"; HOY=$(date +%F); DIR=evidencia/uso-herramientas
TSV="${ADOPTADAS:-herramientas/ADOPTADAS.tsv}"; LOG="$DIR/log.tsv"; OUT="$DIR/$HOY.md"
mkdir -p "$DIR"; touch "$LOG"
DESDE=$(date -d "$DIAS days ago" +%F)

# Rastro de métodos: commits y líneas nuevas (guardadas o no), sin las notas de alta ni las propias piezas KAIZEN.
RASTRO=$( { git log --since="$DIAS days ago" --format='%s%n%b'
            git log --since="$DIAS days ago" -p --format= -- BITACORA.md DECISIONES.md | grep '^+'
            git diff HEAD -- BITACORA.md DECISIONES.md | grep '^+'; } 2>/dev/null \
          | grep -v -i -E 'gokayfem|KAIZEN|ADOPTADAS|uso-herramientas' )

{ echo "# Uso de herramientas adoptadas · $HOY"
  echo
  echo "Ventana: $DESDE a $HOY ($DIAS días). Script sin IA: herramientas/uso-herramientas.sh."
  echo
  echo "| Herramienta | Tipo | Usos | Dueño | Se usa cuando | Estado |"
  echo "|---|---|---|---|---|---|"; } > "$OUT"

CEROS=()
while IFS=$'\t' read -r NOM TIPO PAT DUENO CUANDO ALTA; do
  [ -z "${NOM:-}" ] && continue; [[ "$NOM" == \#* ]] && continue
  if [ "$TIPO" = "herramienta" ]; then
    N=$(awk -F'\t' -v n="$NOM" -v d="$DESDE" '$2==n && $1>=d' "$LOG" | wc -l)
  else
    N=$(printf '%s\n' "$RASTRO" | grep -c -i -E "$PAT")
  fi
  if [ "$N" -gt 0 ]; then EST="viva"; else EST="**0 usos: usar o archivar**"; CEROS+=("$NOM	$DUENO	$CUANDO"); fi
  echo "| $NOM | $TIPO | $N | $DUENO | $CUANDO | $EST |" >> "$OUT"
done < "$TSV"

echo >> "$OUT"; echo "En 0 usos: ${#CEROS[@]}." >> "$OUT"
echo "Listo: $OUT (en 0 usos: ${#CEROS[@]})"

if [ "${1:-}" = "--cola" ] && [ "${#CEROS[@]}" -gt 0 ]; then
  for L in "${CEROS[@]}"; do
    IFS=$'\t' read -r NOM DUENO CUANDO <<< "$L"
    grep -q "^- \[ \] KAIZEN \[herramientas\] USAR O ARCHIVAR: $NOM " COLA.md && continue
    echo "- [ ] KAIZEN [herramientas] USAR O ARCHIVAR: $NOM · uso-herramientas $HOY: 0 usos en $DIAS días (dueño: $DUENO; se usa: $CUANDO). Reporte: $OUT. · Puerta: antes del siguiente viernes, o una pieza la usa y queda en commit, BITACORA o el log de uso, o el director la archiva en DECISIONES con su razón y la quita de herramientas/ADOPTADAS.tsv." >> COLA.md
    echo "COLA: KAIZEN $NOM"
  done
fi
