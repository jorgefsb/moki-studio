#!/bin/bash
# P40i corte 2: bots-p15 (master y rama), cobros 390/1280 en rama, tiras ciego-p40ea rama contra master (390 reto/primera, 1280 reto). Un flock.
cd /home/jorgefsb/Work/moki-rig/.worktrees/p40i
Q=/home/jorgefsb/Work/moki-rig/.worktrees/p40i/.qa-p40i
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
flock /tmp/moki-pesado.lock bash -c '
  Q='$Q'
  npx vite preview --outDir $Q/master --port 5302 --strictPort >$Q/prev-m.log 2>&1 & PM=$!
  npx vite preview --outDir $Q/dist --port 5303 --strictPort >$Q/prev-r.log 2>&1 & PR=$!
  sleep 5
  echo == BOTS MASTER; node herramientas/bots-p15.mjs http://localhost:5302 $Q/bots-m.json | tail -4
  echo == BOTS RAMA; node herramientas/bots-p15.mjs http://localhost:5303 $Q/bots-r.json | tail -4
  for t in 390x844 1280x720; do echo == COBROS $t; node herramientas/sonda-p40-cobros.mjs http://localhost:5303 $t $Q/cobros-$t.json | tail -3; done
  echo == TIRAS
  node herramientas/ciego-p40ea.mjs http://localhost:5303 http://localhost:5302 390x844 reto-pild $Q/ciego/reto-390 | tail -2
  node herramientas/ciego-p40ea.mjs http://localhost:5303 http://localhost:5302 390x844 primera-pild $Q/ciego/primera-390 | tail -2
  node herramientas/ciego-p40ea.mjs http://localhost:5303 http://localhost:5302 1280x720 reto-pild $Q/ciego/reto-1280 | tail -2
  kill $PM $PR
'
