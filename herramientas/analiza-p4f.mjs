// P4f: lee la traza de sonda-p4f y saca la puerta técnica. Uso: node herramientas/analiza-p4f.mjs <sonda.json>
import { readFileSync } from 'node:fs';
const { casos, errores } = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const T = 0, Y = 1, VY = 2, PX = 3, TK = 5, NL = 6, FL = 7, BX = 8, BY = 9, SX = 10, SY = 11;
const par = {};
for (const c of casos) (par[c.nombre.replace(/^(master|rama) /, '')] ??= {})[c.lado] = c;
const at = (fr, t) => fr.reduce((b, f) => (Math.abs(f[T] - t) < Math.abs(b[T] - t) ? f : b));
for (const [nombre, { master: m, rama: r }] of Object.entries(par)) {
  let fis = 0, far = 0, maxNl = 0;
  const porT = new Map(r.fr.map((f) => [Math.round(f[T] * 60 / 1000), f]));
  for (const a of m.fr) {
    const b = porT.get(Math.round(a[T] * 60 / 1000));
    if (!b) continue;
    for (const k of [T, Y, VY, PX, TK, SX, SY]) if (a[k] !== b[k]) fis++;
    if (Math.abs(a[FL] - b[FL]) > 1e-9) far++;
    maxNl = Math.max(maxNl, Math.abs(a[NL] - b[NL]));
  }
  const tks = [...new Set(m.fr.map((f) => f[TK]).filter((t) => t > 0))];
  const cuenta = { 33: [0, 0], 50: [0, 0], 67: [0, 0] };
  let d200 = 0, dpx = [];
  for (const tk of tks) {
    for (const ms of [33, 50, 67]) {
      if (at(m.fr, tk + ms)[NL] <= -28) cuenta[ms][0]++;
      if (at(r.fr, tk + ms)[NL] <= -28) cuenta[ms][1]++;
    }
    d200 = Math.max(d200, Math.abs(at(m.fr, tk + 200)[NL] - at(r.fr, tk + 200)[NL]));
    const a = at(m.fr, tk + 50), b = at(r.fr, tk + 50);
    dpx.push(Math.hypot(a[BX] - b[BX], a[BY] - b[BY]));
  }
  dpx.sort((x, y) => x - y);
  console.log(`${nombre}: despegues ${tks.length}; nearLeg<=-28 a +33/+50/+67 master ${cuenta[33][0]}/${cuenta[50][0]}/${cuenta[67][0]} rama ${cuenta[33][1]}/${cuenta[50][1]}/${cuenta[67][1]}; |Δ| +200 máx ${d200.toFixed(2)}°; bota +50 ms px pantalla min ${dpx[0].toFixed(1)} mediana ${dpx[dpx.length >> 1].toFixed(1)}; Δ nearLeg máx ${maxNl.toFixed(2)}°; difs física/escala ${fis}; difs pierna lejana ${far}`);
}
console.log('errores', errores.length, [...new Set(errores.map((e) => e.replace(/^(master|rama) /, '')))].join(' | '));
