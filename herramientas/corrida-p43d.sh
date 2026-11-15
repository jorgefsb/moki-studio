#!/bin/bash
# P43d puerta: builds (rama y master ea200e3 desde .worktrees/p43c, src igual a master), sonda-p43c 390/1280 en las dos,
# tiras ciego-p40ea a 390 (aterriza con la semilla del ciego de P44 = la escena del borde; primera-pild y reto-pild),
# A/A 390, 1280 rama vs master (total 0), bots-p15, cobros. Un flock, headless.
cd /home/jorgefsb/Work/moki-rig/.worktrees/p43d
Q=/home/jorgefsb/Work/moki-rig/.worktrees/p43d/.qa-p43d
mkdir -p $Q
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
flock /tmp/moki-pesado.lock bash -c '
  Q='$Q'
  echo == BUILD RAMA; npx vite build --outDir $Q/dist --emptyOutDir >$Q/build-r.log 2>&1 || { tail -20 $Q/build-r.log; exit 1; }
  echo == BUILD MASTER; (cd ../p43c && npx vite build --outDir $Q/master --emptyOutDir >$Q/build-m.log 2>&1) || { tail -20 $Q/build-m.log; exit 1; }
  npx vite preview --outDir $Q/master --port 5342 --strictPort >$Q/prev-m.log 2>&1 & PM=$!
  npx vite preview --outDir $Q/dist --port 5343 --strictPort >$Q/prev-r.log 2>&1 & PR=$!
  sleep 5
  for t in 390x844 1280x720; do
    echo == SONDA RAMA $t; BORDE=16 node herramientas/sonda-p43c.mjs http://localhost:5343 $t $Q/sonda-r-$t.json | tail -6
    echo == SONDA MASTER $t; BORDE=16 node herramientas/sonda-p43c.mjs http://localhost:5342 $t $Q/sonda-m-$t.json | tail -6
  done
  echo == TIRAS
  node herramientas/ciego-p40ea.mjs http://localhost:5343 http://localhost:5342 390x844 aterriza $Q/ciego/borde-390 404164866 | tail -3
  node herramientas/ciego-p40ea.mjs http://localhost:5343 http://localhost:5342 390x844 primera-pild $Q/ciego/primera-390 | tail -3
  node herramientas/ciego-p40ea.mjs http://localhost:5343 http://localhost:5342 390x844 reto-pild $Q/ciego/reto-390 | tail -3
  node herramientas/ciego-p40ea.mjs http://localhost:5342 http://localhost:5342 390x844 aterriza $Q/ciego/aa-390 | tail -3
  node herramientas/ciego-p40ea.mjs http://localhost:5343 http://localhost:5342 1280x720 aterriza $Q/ciego/borde-1280 | tail -3
  echo == BOTS MASTER; node herramientas/bots-p15.mjs http://localhost:5342 $Q/bots-m.json | tail -4
  echo == BOTS RAMA; node herramientas/bots-p15.mjs http://localhost:5343 $Q/bots-r.json | tail -4
  for t in 390x844 1280x720; do echo == COBROS $t; node herramientas/sonda-p40-cobros.mjs http://localhost:5343 $t $Q/cobros-$t.json | tail -3; done
  kill $PM $PR
'
