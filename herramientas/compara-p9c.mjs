// Compara medida-master.jsonl contra medida-rama.jsonl de la sonda P9c: recortes, cajas JUGAR/Vota/MEGA (±1 px),
// pie, choques, orden de la tira y consola. Uso: node herramientas/compara-p9c.mjs <master.jsonl> <rama.jsonl>
import { readFileSync } from 'node:fs';
const lee = (f) => readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const [M, R] = process.argv.slice(2).map(lee);
const key = (o) => `${o.tam} n${o.nivel}`;
const mm = Object.fromEntries(M.filter((o) => o.tam).map((o) => [key(o), o]));
const dif = (a, b) => (a && b ? Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(a[k] - b[k]))) : a === b ? 0 : 99);
let mal = 0;
for (const r of R.filter((o) => o.tam)) {
  const m = mm[key(r)];
  const d = { hero: dif(r.hero, m.hero), voto: dif(r.voto, m.voto), mega: dif(r.mega, m.mega), pie: dif(r.pie, m.pie) };
  const fallo = [];
  if (r.recorte && (r.recorte.span > 0 || r.recorte.pie > 0)) fallo.push('RECORTE');
  if (d.hero > 1 || d.voto > 1 || d.mega > 1) fallo.push('CAJA');
  if (r.choques.length) fallo.push('CHOQUE');
  if (fallo.length) mal++;
  console.log(`${key(r).padEnd(14)} ${fallo.join(',') || 'ok'.padEnd(4)} dJUGAR ${d.hero} dVota ${d.voto} dMEGA ${d.mega} dPie ${d.pie} aire ${r.recorte?.aire} (m ${m.recorte?.aire})`);
  console.log(`   rama:   ${r.orden} | ${r.pieTxt}`);
  console.log(`   master: ${m.orden} | ${m.pieTxt}`);
}
const er = (X) => X.find((o) => o.errores)?.errores || [];
console.log(`consola rama ${er(R).length} master ${er(M).length}; filas con falla: ${mal}`);
