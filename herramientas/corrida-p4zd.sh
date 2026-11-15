#!/bin/bash
# P4z-d: previews de master y rama, igualdad de sombra 1280/390, bots-p15 (master y rama), cobros 390/1280, tiras ciego-p4y 390 (un flock).
cd /home/jorgefsb/Work/moki-rig/.worktrees/p4zd
Q=/home/jorgefsb/Work/moki-rig/.worktrees/p4zd/.qa-p4zd
mkdir -p $Q/tmp
export TMPDIR=$Q/tmp
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
flock /tmp/moki-pesado.lock bash -c '
  Q='$Q'
  npx vite preview --outDir $Q/master --port 5298 --strictPort >$Q/prev-m.log 2>&1 & PM=$!
  npx vite preview --outDir $Q/dist --port 5299 --strictPort >$Q/prev-r.log 2>&1 & PR=$!
  sleep 5
  echo == IGUALDAD; node herramientas/sonda-p4zd-igual.mjs http://localhost:5298 http://localhost:5299 $Q/igual.json
  echo == BOTS MASTER; node herramientas/bots-p15.mjs http://localhost:5298 $Q/bots-m.json | tail -4
  echo == BOTS RAMA; node herramientas/bots-p15.mjs http://localhost:5299 $Q/bots-r.json | tail -4
  for t in 390x844 1280x720; do echo == COBROS $t; node herramientas/sonda-p40-cobros.mjs http://localhost:5299 $t $Q/cobros-$t.json | tail -3; done
  echo == TIRAS 390
  node herramientas/ciego-p4y.mjs http://localhost:5298 390x844 $Q/ciego/master-390 | tail -1
  node herramientas/ciego-p4y.mjs http://localhost:5299 390x844 $Q/ciego/rama-390 | tail -1
  kill $PM $PR
'
