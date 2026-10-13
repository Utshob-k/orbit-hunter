// numbers of the sequence of the 52 end orbits of the upper branch (n = 5 to 56), collected from stored files and from the output of tools/satellite-sequence.mjs and tools/satellite-candidates.mjs
// (both run here, about 40 seconds): ranges of T* and L*, multipliers, closures, the end orbit against its member of R (T*/n and L*), the 30 digit orbits and their REBOUND check, the words
// and alignments. node tools/results-numbers.mjs
import fs from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
const PUB = fileURLToPath(new URL('../', import.meta.url));      // the top folder of the repository
const run = (tool) => execFileSync(process.execPath, [PUB + 'tools/' + tool], { cwd: PUB, encoding: 'utf8', maxBuffer: 1 << 28 });
const read = (f) => JSON.parse(fs.readFileSync(PUB + 'data/' + f, 'utf8'));
const mm = (a) => `${Math.min(...a)} to ${Math.max(...a)}`;
const e = (v) => v.toExponential(2);
// ---- the table of tools/satellite-sequence.mjs
const tab = run('satellite-sequence.mjs').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((c) => /^\d+$/.test(c[0]))
  .map((c) => ({ n: +c[0], senses: c[1], T: +c[2], L: +c[3], mult: c[6] === '?' ? null : +c[6], clos: +c[8], close: +c[9], closeE: +c[10] }));
console.log(`rows: ${tab.length}, n = ${tab[0].n} to ${tab[tab.length - 1].n}`);
console.log(`T*: ${tab[0].T} (n=5) to ${tab[tab.length - 1].T} (n=56); L*: ${tab[0].L} to ${tab[tab.length - 1].L}`);
const dT = tab.slice(1).map((r, i) => r.T - tab[i].T), dL = tab.slice(1).map((r, i) => r.L - tab[i].L);
console.log(`T*(n+1) - T*(n): ${dT[0].toFixed(3)} (5 to 6), ${dT[dT.length - 1].toFixed(3)} (55 to 56); min ${Math.min(...dT).toFixed(3)} max ${Math.max(...dT).toFixed(3)}`);
console.log(`L*(n+1) - L*(n): ${dL[0].toFixed(5)} (5 to 6), ${dL[dL.length - 1].toFixed(5)} (55 to 56); all positive: ${dL.every((v) => v > 0)}; decreasing: ${dL.every((v, i) => i === 0 || v < dL[i - 1])}`);
console.log(`T*/n: ${(tab[0].T / 5).toFixed(4)} (n=5), ${(tab[tab.length - 1].T / 56).toFixed(4)} (n=56)`);
const ms = tab.filter((r) => r.mult !== null);
console.log(`multipliers known for n = ${ms.map((r) => r.n).join(' ')}`);
const un = tab.filter((r) => r.mult !== null && r.mult > 1.0001);
const inc = un.slice(1).map((r, i) => r.mult - un[i].mult);
console.log(`unstable from n = ${un[0].n}: ${un[0].mult} (n=${un[0].n}), ${tab.find((r) => r.n === 20).mult} (20), ${tab.find((r) => r.n === 36).mult} (36), ${tab[tab.length - 1].mult} (56); increments per n: min ${Math.min(...inc).toFixed(2)} (n=${un[1 + inc.indexOf(Math.min(...inc))].n}), max ${Math.max(...inc).toFixed(2)} (n=${un[1 + inc.indexOf(Math.max(...inc))].n}); first ${inc[0].toFixed(3)}, last ${inc[inc.length - 1].toFixed(3)}`);
console.log(`senses reaching rotation 0: both for n = ${tab.filter((r) => r.senses.startsWith('2')).map((r) => r.n).join(' ')}; one for n = ${tab.filter((r) => r.senses.startsWith('1'))[0].n} to ${tab[tab.length - 1].n} (${tab.filter((r) => r.senses.startsWith('1')).length} values)`);
console.log(`double precision closure (full period) from the table: n <= 36 ${mm(tab.filter((r) => r.n <= 36).map((r) => r.clos))}; n = 37 to 56 ${mm(tab.filter((r) => r.n >= 37).map((r) => r.clos))}`);
console.log(`closest approach x |E|: ${tab[0].closeE} (n=5), ${tab[tab.length - 1].closeE} (n=56); monotone decreasing: ${tab.every((r, i) => i === 0 || r.closeE < tab[i - 1].closeE)}; closest approach (start units): ${tab[0].close} (n=5), ${tab[tab.length - 1].close} (n=56)`);
// ---- the member and the zero: T*/n and L*
const rows = [];
for (let n = 5; n <= 56; n++) { const d = read(`branch-points/${n}-upper.json`); const t = tab.find((r) => r.n === n); rows.push({ n, mT: d.member.Tstar, mL: d.member.Lstar, T: t.T, L: t.L }); }
const rel = rows.map((r) => (r.mT - r.T / r.n) / r.mT);
const pick = (n) => rel[n - 5];
console.log(`(T*_member - T*_zero / n) / T*_member (relative): n=5 ${e(pick(5))}, n=13 ${e(pick(13))}, n=20 ${e(pick(20))}, n=36 ${e(pick(36))}, n=56 ${e(pick(56))}; largest at n = ${5 + rel.indexOf(Math.max(...rel))} (${e(Math.max(...rel))}); smallest ${e(Math.min(...rel))} at n = ${5 + rel.indexOf(Math.min(...rel))}`);
const dLm = rows.map((r) => r.mL - r.L);
console.log(`L*_member - L*_zero: n=5 ${dLm[0].toFixed(4)}, n=13 ${dLm[8].toFixed(4)}, n=20 ${dLm[15].toFixed(4)}, n=36 ${dLm[31].toFixed(4)}, n=56 ${dLm[51].toFixed(4)}; all positive: ${dLm.every((v) => v > 0)}; member L*: ${rows[0].mL.toFixed(4)} to ${rows[51].mL.toFixed(4)}`);
// ---- the 30 digit orbits and their checks
const cand = read('satellite-candidates.json').orbits, chk = read('satellite-check.json').orbits;
const up = (o) => o.label.includes(`nu = 1/${o.n} (upper branch`) && o.n >= 7;
const ups = cand.filter(up);
console.log(`30 digit orbits of the upper sequence in satellite-candidates.json: ${ups.length} (n = ${ups.map((o) => o.n).join(' ')})`);
console.log(`closure of the full period on the stored 30 digit values: ${mm(ups.map((o) => +o.closure_full_period))}; n = 7, 9 to 12: ${mm(ups.filter((o) => o.n <= 12).map((o) => +o.closure_full_period))}; n >= 13: ${mm(ups.filter((o) => o.n >= 13).map((o) => +o.closure_full_period))}`);
console.log(`residual of the refinement: ${mm(ups.map((o) => +o.residual))}; closure tiers: ${[...new Set(ups.map((o) => o.closureTier))].map((t) => t + ' ' + ups.filter((o) => o.closureTier === t).length).join(', ')}`);
const cm = ups.map((o) => ({ n: o.n, c: chk.find((x) => x.label === o.label) })).filter((x) => x.c);
console.log(`REBOUND check (data/satellite-check.json): ${cm.length} of ${ups.length} matched by label; closure from the double precision start ${mm(cm.map((x) => x.c.closure))}; n <= 12: ${mm(cm.filter((x) => x.n <= 12).map((x) => x.c.closure))}; n >= 13: ${mm(cm.filter((x) => x.n >= 13).map((x) => x.c.closure))}`);
const mrel = cm.filter((x) => x.n >= 13).map((x) => Math.abs(x.c.largestMultiplier - x.c.largestMultiplierMine) / x.c.largestMultiplierMine);
console.log(`largest multiplier REBOUND against the repository's: relative difference ${mrel.length ? mm(mrel.map((v) => +v.toExponential(2))) : '-'} (n >= 13); symplectic deviation ${mm(cm.map((x) => +x.c.symplecticDeviation.toExponential(2)))}`);
// ---- words, alignments, repeat test from the output of tools/satellite-candidates.mjs
const lines = run('satellite-candidates.mjs').split('\n');
const info = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/nu = 1\/(\d+) \(upper branch/);
  if (!m || +m[1] < 7) continue;
  const w = lines[i + 2].match(/word \(01\)\^(\d+), (\d+) alignments; repeat test \(T\/n, n up to 200\): (\d+) \(in own places\), (\d+) \(relabelled\)/);
  info.push({ n: +m[1], ok: w && +w[1] === +m[1] && +w[2] === 2 * +m[1] && +w[3] === 1 && +w[4] === 1, w: w && w[0] });
}
console.log(`word (01)^n with 2n alignments and no repeat (return test, n up to 200): ${info.filter((x) => x.ok).length} of ${info.length}; failing: ${info.filter((x) => !x.ok).map((x) => x.n).join(', ') || 'none'}`);
// ---- the three orbits with a 30 digit file in data/refined (n = 5, 6, 8)
for (const [n, f] of [[5, 'T17.847'], [6, 'T19.769'], [8, 'T47.065']]) {
  const j = read('refined/' + f + '.json'), s = read('refined/summary.json').find((x) => x.file.endsWith(f + '.json'));
  console.log(`n = ${n}: data/refined/${f}.json, ${j.digits} digits, residual ${j.residual}, closure of the full period ${j.closure_full_period}, status ${s.status}, T* ${s.Tstar.toFixed(8)}, change of T* by the refinement ${s.dT.toExponential(2)}, same word ${s.sameWord}, same repeat ${s.sameRepeat}`);
}
