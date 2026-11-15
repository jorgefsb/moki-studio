#!/bin/bash
# P40i corte 1: sonda en juego de la píldora del pago sobre Moki, 390 y 1280, sobre el build de master (un flock).
cd /home/jorgefsb/Work/moki-rig/.worktrees/p40i
Q=/home/jorgefsb/Work/moki-rig/.worktrees/p40i/.qa-p40i
D=${1:-master}
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
flock /tmp/moki-pesado.lock bash -c '
  Q='$Q'; D='$D'
  npx vite preview --outDir $Q/$D --port 5301 --strictPort >$Q/prev-$D.log 2>&1 & P=$!
  sleep 5
  for t in 390x844 1280x720; do echo == $D $t; node herramientas/sonda-p40i.mjs http://localhost:5301 $t $Q/sonda-$D-$t.json; done
  kill $P
'
