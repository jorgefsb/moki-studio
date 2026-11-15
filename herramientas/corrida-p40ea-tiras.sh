#!/bin/bash
# P40e-a tiras para el ciego: 1.ª partida, cada cierre de horquilla, JUSTO ANTES del cobro y +75 ms (ANTES=1), una moneda
# por tira (TIRA=1: cada tira es una sola versión). A/A (rama sola) y rama (b2) contra master (m), 390x844 y 1280x720.
cd /home/jorgefsb/Work/moki-rig/.worktrees/p40e
U=http://127.0.0.1:5294
E=evidencia/p40e-constructor/ciego-a
F="flock /tmp/moki-pesado.lock"
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
for t in 390x844 1280x720; do
  TIRA=1 ANTES=1 $F node herramientas/ciego-p40ea.mjs $U/b2 $U/b2 $t primera-hq $E/aa-$t | tail -2
  TIRA=1 ANTES=1 $F node herramientas/ciego-p40ea.mjs $U/b2 $U/m $t primera-hq $E/bm-$t | tail -2
done
echo == FIN
