#!/bin/bash
# P40b puerta: build master (5761fd2) y rama, peso gz, bots-p15 1280 y 390 (m y rama), cobros 390/1280 (rama y master),
# sonda-p40i 390 y 1280 (rama). Sirve .qa-p40b en :5293 (python). Un flock por paso.
cd /home/jorgefsb/Work/moki-rig/.worktrees/p40b
M=/home/jorgefsb/Work/moki-rig/.worktrees/p40b-master
Q=/home/jorgefsb/Work/moki-rig/.qa-p40b
E=${E:-evidencia/p40b-constructor}
U=http://127.0.0.1:5293
mkdir -p $Q $E
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
F="flock /tmp/moki-pesado.lock"
echo == BUILD RAMA; $F npx vite build --outDir $Q/b --emptyOutDir >$Q/build-b.log 2>&1 || { tail -20 $Q/build-b.log; exit 1; }
echo == BUILD MASTER; (cd $M && $F npx vite build --outDir $Q/m --emptyOutDir) >$Q/build-m.log 2>&1 || { tail -20 $Q/build-m.log; exit 1; }
echo == PESO; for v in m b; do echo $v $(cat $Q/$v/assets/*.js | gzip -9n | wc -c); done
(cd $Q && python3 -m http.server 5293 --bind 127.0.0.1 >/dev/null 2>&1) &
SRV=$!
sleep 2
echo == BOTS 1280; for v in m b; do $F node herramientas/bots-p15.mjs $U/$v $E/bots-$v-1280.json | tail -4; done
echo == BOTS 390; for v in m b; do VP=390x844 $F node herramientas/bots-p15.mjs $U/$v $E/bots-$v-390.json | tail -4; done
echo == COBROS; for t in 390x844 1280x720; do $F node herramientas/sonda-p40-cobros.mjs $U/b $t $E/cobros-b-$t.json | tail -9; done
$F node herramientas/sonda-p40-cobros.mjs $U/m 390x844 $E/cobros-m-390x844.json | tail -9
echo == P40I; for t in 390x844 1280x720; do $F node herramientas/sonda-p40i.mjs $U/b $t $E/p40i-b-$t.json | tail -6; done
kill $SRV
echo == FIN
