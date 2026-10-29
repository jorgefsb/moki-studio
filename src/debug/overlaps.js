// Traslapes en pantalla entre los eventos de fondo (globo, pajaritos, avioncito, Moki chiquito, mariposas) y obstáculos, piezas y Moki,
// contados por cuadro a lo largo del demo (sin god). Solo con ?debug.
export async function measureOverlaps(s, variants = [0, 1, 2]) {
  const out = {};
  const inter = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  for (const v of variants) {
    s.demoVariant = v;
    s.startDemo();
    s.god = false;
    const cnt = {};
    let f = 0;
    let crashed = false;
    while (!s.demoStripping && f < 3000) {
      s.update(0, 16.667);
      f++;
      if (s.screen === 'dead') {
        crashed = true;
        break;
      }
      const am = s.ambient;
      const evs = [];
      if (am.active) evs.push([am.active.kind, am.active.sprites]);
      if (am.slow) evs.push(['globo', am.slow.sprites]);
      if (am.flutter) evs.push(['mariposas', am.flutter.sprites]);
      if (!evs.length) continue;
      const tg = [];
      s.obstacles.forEach((o) => o.sprite && o.sprite.visible && tg.push(['obstaculo', o.sprite.getBounds()]));
      (s.pickups || []).forEach((k) => k.sprite && k.sprite.visible && !k.taken && tg.push(['pieza', k.sprite.getBounds()]));
      if (s.rig && s.rig.container) tg.push(['moki', s.rig.container.getBounds()]);
      for (const [kind, sprs] of evs) {
        const seen = new Set();
        for (const sp of sprs) {
          if (!sp.visible || sp.alpha < 0.05) continue;
          const b = sp.getBounds();
          for (const [tn, tb] of tg) if (inter(b, tb)) seen.add(`${kind}>${tn}`);
        }
        seen.forEach((k) => (cnt[k] = (cnt[k] || 0) + 1));
      }
    }
    cnt.total = Object.values(cnt).reduce((a, b) => a + b, 0);
    cnt.pieces = `${s.pieces}/${s.level.pieceTotal}`;
    cnt.choque = crashed;
    out[`demo${'ABC'[v]}`] = cnt;
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}
