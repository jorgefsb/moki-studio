#!/bin/bash
# P43 corte 1: builds de rama y master (c7cca6a) y sonda-p43 a 390 Reto en ambos. Un flock, headless.
cd /home/jorgefsb/Work/moki-rig/.worktrees/p43
Q=/home/jorgefsb/Work/moki-rig/.worktrees/p43/.qa-p43
M=/home/jorgefsb/Work/moki-rig/.worktrees/p43-master
mkdir -p $Q
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
flock /tmp/moki-pesado.lock bash -c '
  Q='$Q'; M='$M'
  echo == BUILD RAMA; npx vite build --outDir $Q/dist --emptyOutDir >$Q/build-r.log 2>&1 || { tail -20 $Q/build-r.log; exit 1; }
  echo == BUILD MASTER; (cd $M && npx vite build --outDir $Q/master --emptyOutDir) >$Q/build-m.log 2>&1 || { tail -20 $Q/build-m.log; exit 1; }
  npx vite preview --outDir $Q/master --port 5312 --strictPort >$Q/prev-m.log 2>&1 & PM=$!
  npx vite preview --outDir $Q/dist --port 5313 --strictPort >$Q/prev-r.log 2>&1 & PR=$!
  sleep 5
  echo == SONDA RAMA 390; SOLO=reto node herramientas/sonda-p43.mjs http://localhost:5313 390x844 $Q/sonda-r-390.json | tail -3
  echo == SONDA MASTER 390; SOLO=reto node herramientas/sonda-p43.mjs http://localhost:5312 390x844 $Q/sonda-m-390.json | tail -3
  kill $PM $PR
'
