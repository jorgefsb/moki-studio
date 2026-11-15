#!/bin/bash
# P40b tiras para el ciego (1.ª partida de jugador nuevo, cada cierre de horquilla +75 ms): rama sola (A/A: los 3 cierres
# x1, x2, x3) y rama contra master (B/M: solo empata el 1.º, master trae 1 horquilla). 390x844 y 1280x720.
cd /home/jorgefsb/Work/moki-rig/.worktrees/p40b
Q=/home/jorgefsb/Work/moki-rig/.qa-p40b
E=evidencia/p40b-constructor/ciego
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
(cd $Q && python3 -m http.server 5293 --bind 127.0.0.1 >/dev/null 2>&1) &
SRV=$!
sleep 2
U=http://127.0.0.1:5293
F="flock /tmp/moki-pesado.lock"
for t in 390x844 1280x720; do
  $F node herramientas/ciego-p40ea.mjs $U/b $U/b $t primera-hq $E/aa-$t | tail -2
  $F node herramientas/ciego-p40ea.mjs $U/b $U/m $t primera-hq $E/bm-$t | tail -2
done
kill $SRV
echo == FIN
