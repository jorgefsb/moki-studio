#!/bin/bash
# P40h: prueba A/A del ciego (master contra master, misma URL) en las escenas pedidas. Un flock. Uso: bash herramientas/corrida-p40h.sh [escena WxH]...
cd /home/jorgefsb/Work/moki-rig/.worktrees/p40h
Q=/home/jorgefsb/Work/moki-rig/.worktrees/p40h/.qa-p40h
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
ARGS="$*"
flock /tmp/moki-pesado.lock bash -c '
  Q='$Q'
  npx vite preview --outDir $Q/master --port 5304 --strictPort >$Q/prev-m.log 2>&1 & P=$!
  sleep 5
  set -- '"$ARGS"'
  while [ $# -ge 2 ]; do
    echo == AA $1 $2; timeout 900 node herramientas/ciego-p40ea.mjs http://localhost:5304 http://localhost:5304 $2 $1 $Q/aa | tail -2
    shift 2
  done
  kill $P
'
