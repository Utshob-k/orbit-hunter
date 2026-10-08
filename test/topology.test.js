// syzygy words: the figure-8 is 012 twice, and a BHH satellite has 2k syzygies in the word (01)^k
import { syzygyWord } from '../src/topology.js';
import { perpInitial } from '../src/perp.js';
import { KNOWN } from '../src/known.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };

const f8 = KNOWN.find((o) => o.name === 'figure-8');
const w = syzygyWord(Float64Array.from([-1, 0, 1, 0, 0, 0, f8.v1, f8.v2, f8.v1, f8.v2, -2 * f8.v1, -2 * f8.v2]), f8.T);
check('figure-8 is 012 twice', w && w.root === '012' && w.power === 2, JSON.stringify(w));

// satellite N = 2 of Jankovic et al. (k = 3), period 2t
const s = syzygyWord(perpInitial(-0.9082792465198175, 1.7254453207653662, 0.5393586724779005), 2 * 4.2842770176189475);
check('k = 3 satellite is (01)^3', s && s.root === '01' && s.power === 3, JSON.stringify(s));
process.exit(fail ? 1 : 0);
