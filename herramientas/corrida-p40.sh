#!/bin/bash
# P40: build de la rama, sonda de cobros 390 y 1280, p36lb (encimes) 390 y 1280, bots-p15 rama y master x2, peso gz.
cd /home/jorgefsb/Work/moki-rig/.worktrees/p40
export TMPDIR=/home/jorgefsb/Work/moki-rig/.worktrees/p40/.qa-p40/tmp
mkdir -p "$TMPDIR"
Q=.qa-p40
until ! grep -q 'semáforo=ROJO' /tmp/moki-recursos.txt; do sleep 20; done
flock /tmp/moki-pesado.lock bash -c '
  Q=.qa-p40
  npx vite build --outDir $Q/dist-rama --emptyOutDir >$Q/build-rama.log 2>&1 || { echo BUILD FALLA; tail -20 $Q/build-rama.log; exit 1; }
  npx vite preview --outDir $Q/dist-rama --port 5292 --strictPort >$Q/preview-rama.log 2>&1 &
  PR=$!
  npx vite preview --outDir $Q/dist-master --port 5291 --strictPort >$Q/preview-master.log 2>&1 &
  PM=$!
  sleep 5
  node herramientas/sonda-p40-cobros.mjs http://localhost:5292 390x844 $Q/cobros-390.json
  node herramientas/sonda-p40-cobros.mjs http://localhost:5292 1280x720 $Q/cobros-1280.json
  node herramientas/sonda-p36lb.mjs http://localhost:5292 390x844 $Q/p36lb-rama-390.json | tail -3
  node herramientas/sonda-p36lb.mjs http://localhost:5291 390x844 $Q/p36lb-master-390.json | tail -3
  node herramientas/sonda-p36lb.mjs http://localhost:5292 1280x720 $Q/p36lb-rama-1280.json | tail -3
  node herramientas/sonda-p36lb.mjs http://localhost:5291 1280x720 $Q/p36lb-master-1280.json | tail -3
  node herramientas/bots-p15.mjs http://localhost:5292 $Q/bots-rama.json
  node herramientas/bots-p15.mjs http://localhost:5291 $Q/bots-master-a.json
  node herramientas/bots-p15.mjs http://localhost:5291 $Q/bots-master-b.json
  kill $PR $PM; pkill -f "vite preview --outDir $Q"
'
for d in dist-master dist-rama; do
  f=$(ls $Q/$d/assets/index-*.js)
  echo "$d $(stat -c %s $f) B, gz $(gzip -9 -c $f | wc -c) B"
done
