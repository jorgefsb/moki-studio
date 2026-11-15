#!/bin/bash
# P40e-a puerta: globo, cobros, p40i y bots de la rama (b2) contra master (m) a 1280 y 390. Sirve .qa-p40e en :5294.
cd /home/jorgefsb/Work/moki-rig/.worktrees/p40e
Q=/home/jorgefsb/Work/moki-rig/.qa-p40e
U=http://127.0.0.1:5294
F="flock /tmp/moki-pesado.lock"
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
echo == GLOBO; for v in m b2; do for t in 390x844 1280x720; do $F node herramientas/sonda-p40ea-globo.mjs $U/$v $t $Q/globo-$v-$t.json | cut -c1-140; done; done
echo == COBROS; for t in 390x844 1280x720; do $F node herramientas/sonda-p40-cobros.mjs $U/b2 $t $Q/cobros-b2-$t.json | tail -9; done
echo == P40I; for t in 390x844 1280x720; do $F node herramientas/sonda-p40i.mjs $U/b2 $t $Q/p40i-b2-$t.json | tail -6; done
echo == BOTS 1280; $F node herramientas/bots-p15.mjs $U/b2 $Q/bots-b2-1280.json | tail -4
echo == BOTS 390; for v in m b2; do VP=390x844 $F node herramientas/bots-p15.mjs $U/$v $Q/bots-$v-390.json | tail -4; done
echo == FIN
