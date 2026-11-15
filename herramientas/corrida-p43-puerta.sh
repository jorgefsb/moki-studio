#!/bin/bash
# P43 puerta: bots-p15 (master y rama), cobros 390/1280 en rama, tiras ciego-p40ea (390 reto y primera rama vs master,
# 1280 reto rama vs master = debe dar total 0, A/A 390 master vs master). Un flock, headless. Usa los builds de corrida-p43-sonda.
cd /home/jorgefsb/Work/moki-rig/.worktrees/p43
Q=/home/jorgefsb/Work/moki-rig/.worktrees/p43/.qa-p43
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
flock /tmp/moki-pesado.lock bash -c '
  Q='$Q'
  npx vite preview --outDir $Q/master --port 5312 --strictPort >$Q/prev-m.log 2>&1 & PM=$!
  npx vite preview --outDir $Q/dist --port 5313 --strictPort >$Q/prev-r.log 2>&1 & PR=$!
  sleep 5
  echo == TIRAS
  node herramientas/ciego-p40ea.mjs http://localhost:5313 http://localhost:5312 390x844 reto-pild $Q/ciego/reto-390 | tail -3
  node herramientas/ciego-p40ea.mjs http://localhost:5313 http://localhost:5312 390x844 primera-pild $Q/ciego/primera-390 | tail -3
  node herramientas/ciego-p40ea.mjs http://localhost:5313 http://localhost:5312 1280x720 reto-pild $Q/ciego/reto-1280 | tail -3
  node herramientas/ciego-p40ea.mjs http://localhost:5312 http://localhost:5312 390x844 reto-pild $Q/ciego/aa-390 | tail -3
  echo == BOTS MASTER; node herramientas/bots-p15.mjs http://localhost:5312 $Q/bots-m.json | tail -4
  echo == BOTS RAMA; node herramientas/bots-p15.mjs http://localhost:5313 $Q/bots-r.json | tail -4
  for t in 390x844 1280x720; do echo == COBROS $t; node herramientas/sonda-p40-cobros.mjs http://localhost:5313 $t $Q/cobros-$t.json | tail -3; done
  kill $PM $PR
'
