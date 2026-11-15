#!/bin/bash
# P43b: builds rama y master (6f6777d); sonda-p40i 390 (hueco casco-píldora, arriba, HUD) en ambos; tiras ciego-p40ea 390
# reto/primera rama vs master y 1280 reto (debe dar total 0); bots p15; cobros 390/1280. Un flock, headless.
cd /home/jorgefsb/Work/moki-rig/.worktrees/p43b
Q=/home/jorgefsb/Work/moki-rig/.worktrees/p43b/.qa-p43b
M=/home/jorgefsb/Work/moki-rig/.worktrees/p43-master
mkdir -p $Q
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
flock /tmp/moki-pesado.lock env SKIPM=$SKIPM bash -c '
  Q='$Q'; M='$M'
  echo == BUILD RAMA; npx vite build --outDir $Q/dist --emptyOutDir >$Q/build-r.log 2>&1 || { tail -20 $Q/build-r.log; exit 1; }
  [ -n "$SKIPM" ] || { echo == BUILD MASTER; (cd $M && npx vite build --outDir $Q/master --emptyOutDir) >$Q/build-m.log 2>&1 || { tail -20 $Q/build-m.log; exit 1; }; }
  npx vite preview --outDir $Q/master --port 5322 --strictPort >$Q/prev-m.log 2>&1 & PM=$!
  npx vite preview --outDir $Q/dist --port 5323 --strictPort >$Q/prev-r.log 2>&1 & PR=$!
  sleep 5
  echo == SONDA RAMA 390; node herramientas/sonda-p40i.mjs http://localhost:5323 390x844 $Q/sonda-r-390.json | tail -6
  [ -n "$SKIPM" ] || echo == SONDA MASTER 390; [ -n "$SKIPM" ] || node herramientas/sonda-p40i.mjs http://localhost:5322 390x844 $Q/sonda-m-390.json | tail -6
  echo == TIRAS
  node herramientas/ciego-p40ea.mjs http://localhost:5323 http://localhost:5322 390x844 reto-pild $Q/ciego/reto-390 | tail -2
  node herramientas/ciego-p40ea.mjs http://localhost:5323 http://localhost:5322 390x844 primera-pild $Q/ciego/primera-390 | tail -2
  node herramientas/ciego-p40ea.mjs http://localhost:5323 http://localhost:5322 1280x720 reto-pild $Q/ciego/reto-1280 | tail -2
  echo == BOTS MASTER; node herramientas/bots-p15.mjs http://localhost:5322 $Q/bots-m.json | tail -2
  echo == BOTS RAMA; node herramientas/bots-p15.mjs http://localhost:5323 $Q/bots-r.json | tail -2
  for t in 390x844 1280x720; do echo == COBROS $t; node herramientas/sonda-p40-cobros.mjs http://localhost:5323 $t $Q/cobros-$t.json | tail -1; done
  kill $PM $PR
'
