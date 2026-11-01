// Valida cada bloque solo, sin navegador: node scripts/bloques.mjs
// Por bloque y por cada tramo en que puede salir (min-max, a su velocidad): 3-6.5 s, cola >= 1.2 s, legible,
// mantener->mantener >= 1 s, torre->viga >= 1.0 s y viga->torre >= 0.9 s, el bot adjust lo libra con ±40 ms y
// holgura >= 4 px, y el bot pasivo (nunca salta) choca. Sale 1 si algún bloque falla.
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { CONFIG: C } = await import('../src/config.js');
const { buildLevel } = await import('../src/tramos.js');
const { validateLevel, popupFalla } = await import('../src/niveles/validar.js');
const { legible, holdHold } = await import('../src/niveles/generar.js');
const { BLOQUES } = await import('../src/niveles/bloques.js');

// Ya estaban antes de la pieza 5b; se reportan pero no hacen fallar: respiro y viga-arco no piden salto (son descanso
// y la viga con arco), y la cola de ambar es 1.1 s. No se tocan aquí para no mover el Reto/Libre por fuera del pool.
const LEGADO = { respiro: ['pasivo'], 'viga-arco': ['pasivo'], ambar: ['cola'] };
const OFF = 2; // el bloque empieza a los 2 s de la página, como tras la calma
const bad = [];
const legado = [];
for (const b of BLOQUES) {
  const fallas = [];
  if (b.dur < 3 - 1e-9 || b.dur > 6.5 + 1e-9) fallas.push(`dur ${b.dur}`);
  let cola = Infinity;
  for (let tramo = b.min; tramo <= b.max; tramo++) {
    const speed = C.tramos[tramo - 1].speed;
    const script = b.ev.map(([t, code]) => [OFF + t, code]);
    const level = buildLevel([{ speed, len: 30, script }]);
    const fin = Math.max(...level.entities.map((e) => e.D)) / speed - OFF;
    cola = Math.min(cola, b.dur - fin);
    if (!legible(level)) fallas.push(`T${tramo} ilegible`);
    if (!holdHold(level)) fallas.push(`T${tramo} mantener-mantener`);
    const obs = level.entities.filter((e) => e.kind === 'obs');
    for (let i = 1; i < obs.length; i++) {
      const gap = (obs[i].D - obs[i - 1].D) / speed;
      if (obs[i - 1].type === 'torre' && obs[i].type === 'viga' && gap < 1.0 - 1e-6) fallas.push(`T${tramo} torre->viga ${gap.toFixed(2)}`);
      if (obs[i - 1].type === 'viga' && obs[i].type === 'torre' && gap < 0.9 - 1e-6) fallas.push(`T${tramo} viga->torre ${gap.toFixed(2)}`);
    }
    for (const j of [0, -40, 40]) {
      const r = validateLevel(level, null, j);
      if (!r.ok || r.minClear < 4) fallas.push(`T${tramo} bot ${j}ms ${r.ok ? `holgura ${r.minClear}` : r.cause}`);
    }
    const pasivo = { ...level, entities: level.entities.map((e) => (e.kind === 'obs' ? { ...e, plan: 'none' } : e)) };
    if (validateLevel(pasivo).ok) fallas.push(`T${tramo} el pasivo pasa`);
    // Pop-up: aviso y separación justos, y un bot que salta todo menos los pop-up choca con cada uno
    if (b.tags.includes('popup')) {
      const pf = popupFalla(level);
      if (pf) fallas.push(`T${tramo} ${pf}`);
      for (const p of level.entities.filter((e) => e.pop)) {
        const sinP = { ...level, entities: level.entities.map((e) => (e === p ? { ...e, plan: 'none' } : e)) };
        const r = validateLevel(sinP);
        if (r.ok || r.D !== Math.round(p.D)) fallas.push(`T${tramo} ignorar el pop-up en ${Math.round(p.D)} no choca con él`);
      }
    }
  }
  if (cola < 1.2 - 1e-9) fallas.push(`cola ${cola.toFixed(2)}`);
  const pops = b.ev.filter(([, c]) => c.split('+')[0] === 'U');
  if (pops.length && !b.tags.includes('popup')) fallas.push('U sin tag popup');
  if (pops.length && (b.dif < 2 || b.min < 2)) fallas.push('pop-up con dificultad < 2 o en T1');
  if (pops.some(([t]) => t === 0)) fallas.push('pop-up a los 0 s del bloque');
  const propias = fallas.filter((f) => !(LEGADO[b.id] || []).some((k) => f.includes(k)));
  if (fallas.length > propias.length) legado.push([b.id, [...new Set(fallas)]]);
  if (propias.length) bad.push([b.id, [...new Set(propias)]]);
}
const regulares = BLOQUES.filter((b) => !b.tags.includes('sorpresa'));
const porDif = {};
for (const b of regulares) porDif[b.dif] = (porDif[b.dif] || 0) + 1;
const porTramo = [1, 2, 3, 4].map((t) => regulares.filter((b) => b.min <= t && t <= b.max).length);
console.log({ bloques: regulares.length, popup: regulares.filter((b) => b.tags.includes('popup')).length, sorpresas: BLOQUES.length - regulares.length, porDif, candidatosPorTramo: porTramo, fallan: bad.length });
for (const [id, f] of legado) console.log('legado', id, f.join(' · '));
for (const [id, f] of bad) console.log('FALLA', id, f.join(' · '));
process.exit(bad.length ? 1 : 0);
