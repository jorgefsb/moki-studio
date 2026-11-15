#!/bin/bash
# P42c puerta: sonda-p42c 1280 (m y rama), sonda-p40i 390 (m y rama) y 1280 rama, bots-p15 (m y rama), cobros 390/1280 rama,
# tiras ciego-p40ea (A/A 390, A/B 390, A/B 1280). Sirve .qa-p42c en :5291 (python). Un flock por paso.
cd /home/jorgefsb/Work/moki-rig/.worktrees/p42c
U=http://127.0.0.1:5291
E=evidencia/p42c
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
F="flock /tmp/moki-pesado.lock"
echo == SONDA 1280; for v in m b; do $F node herramientas/sonda-p42c.mjs $U/$v 1280x720 $E/sonda-$v-1280.json | tail -4; done
echo == P40I; for v in m b; do $F node herramientas/sonda-p40i.mjs $U/$v 390x844 $E/p40i-$v-390.json | tail -6; done
$F node herramientas/sonda-p40i.mjs $U/b 1280x720 $E/p40i-b-1280.json | tail -6
echo == BOTS; for v in m b; do $F node herramientas/bots-p15.mjs $U/$v $E/bots-$v.json | tail -4; done
echo == COBROS; for t in 390x844 1280x720; do $F node herramientas/sonda-p40-cobros.mjs $U/b $t $E/cobros-$t.json | tail -3; done
echo == TIRAS
$F node herramientas/ciego-p40ea.mjs $U/m $U/m 390x844 reto-pild $E/ciego/aa-reto-390 | tail -2
$F node herramientas/ciego-p40ea.mjs $U/b $U/m 390x844 reto-pild $E/ciego/ab-reto-390 | tail -2
$F node herramientas/ciego-p40ea.mjs $U/b $U/m 390x844 aterriza-reto $E/ciego/ab-aterriza-390 | tail -2
$F node herramientas/ciego-p40ea.mjs $U/b $U/m 1280x720 reto-pild $E/ciego/ab-reto-1280 | tail -2
echo == FIN
