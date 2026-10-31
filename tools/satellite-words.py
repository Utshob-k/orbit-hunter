# SPDX-License-Identifier: MIT
# The syzygy words of the four checked stretches and of Henon's family m, and the satellite test (are the four families satellites of Henon's family m in the sense of Jankovic and Dmitrasinovic 2016).
# 1. Stretches: each of t35 -, t44 -, t62 -, t72 - is cut at the collision orbits (the minima of data/deep/extra/collision-orbits.json with a sign change of h; the cut is the middle of the bracket of lam), and in each stretch the three
#    checked points with the largest 40-digit minimum are picked (data/deep/witnesses, data/deep/traces).
# 2. Words: the syzygy word (src/topology.js, syzygyWord of the start of the orbit over its period) of every picked point and of every unflagged row of Table I of Henon (1976), as the canonical word, its root and power, and the
#    word with the stutters removed (pairs of equal adjacent letters of the cyclic word deleted one pair at a time). Run with node; it takes some minutes (four points give null after 44 to 54 s: the integration gives up).
# 3. The test: a stretch is a satellite of family m if its word has the root of the words of family m (01 in every row) and its T*, L* match an entry of Table I of Jankovic and Dmitrasinovic (2016) for that k; the file gives the verdict
#    of every stretch and, apart from the words, the T*, L* of every entry of that table inside the L* range of a stretch.
# The inputs that are not in the other files of the release are in the file itself, key "inputs": the 45 rows of Table I of Henon (1976) (orbits 2 to 46) converted to (u1, u2, lam, t) and the 57 rows of Table I of Jankovic and
# Dmitrasinovic (2016), typed from the printed tables. OUT.json is new; the result is the file data/deep/extra/satellite-words.json (keys what, commands, inputs, words, satellites; no timings, so that a rerun gives the same file).
#   python tools/satellite-words.py OUT.json [--inputs FILE] [--words FILE] [--check]
#   --inputs FILE  the file with the key inputs (default data/deep/extra/satellite-words.json)
#   --words FILE   take the words from the key words of that file instead of computing them with node
#   --check        compare OUT.json with the default file after writing it (exit 1 if they differ)
import json, math, os, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE) + '/'
R = ROOT + 'data/deep/'; STORED = R + 'extra/satellite-words.json'
args = sys.argv[1:]
opt = {}
for k in ('--inputs', '--words'):
    if k in args: i = args.index(k); opt[k] = args[i + 1]; del args[i:i + 2]
check = '--check' in args
args = [a for a in args if a != '--check']
if len(args) != 1 or os.path.exists(args[0]): sys.exit('usage: python tools/satellite-words.py OUT.json [--inputs FILE] [--words FILE] [--check]   (OUT.json must be new)')
OUT = args[0]
INP = json.load(open(opt.get('--inputs', STORED), encoding='utf8'))['inputs']
CONV = {r['orbit']: r for r in INP['henon_rows']}; JD = INP['jd_table']

def strip_seconds(o):
    if isinstance(o, dict): return {k: strip_seconds(v) for k, v in o.items() if k != 'seconds'}
    if isinstance(o, list): return [strip_seconds(v) for v in o]
    return o

# ---- 1. the stretches
def stretches():
    co = json.load(open(R + 'extra/collision-orbits.json', encoding='utf8')); res = {}
    for lab in ('t35m', 't44m', 't62m', 't72m'):
        cuts = []
        for m in co['traces'][lab]:
            for iv in m['intervals']:
                if iv['result'] == 'sign change':
                    a, b = iv['bracket']['lam']; cuts.append(dict(minimum=m['minimum'], bracket=[a, b], cut=(a + b) / 2, dmin_w1_of_the_minimum=m['dmin_w1']))
        cuts.sort(key=lambda c: c['cut'])
        W = json.load(open(R + 'witnesses/%s.json' % lab, encoding='utf8'))['points']
        T = json.load(open(R + 'traces/%s.json' % lab, encoding='utf8'))
        edges = [-1e9] + [c['cut'] for c in cuts] + [1e9]; st = []
        for i in range(len(edges) - 1):
            lo, hi = edges[i], edges[i + 1]
            wp = [p for p in W if lo < p['lam'] <= hi and p.get('w1') and p['w1'].get('dmin') is not None]
            tp = [p for p in T['points'] if lo < p['lam'] <= hi]
            top = sorted(wp, key=lambda p: -p['w1']['dmin'])[:3]
            st.append(dict(index=i, lam_lo=None if lo < -1e8 else lo, lam_hi=None if hi > 1e8 else hi, picks=[dict(id=p['id'], step=p['step'], lam=p['lam'], u1=p['u1'], u2=p['u2'], t=p['t'], dmin_w1=p['w1']['dmin']) for p in top],
                           trace_curve=[dict(lam=p['lam'], Tstar=p['Tstar'], Lstar=abs(p['Lstar'])) for p in sorted(tp, key=lambda p: p['lam'])]))
        res[lab] = dict(cuts=cuts, stretches=st)
    return res
S = stretches()

# ---- 2. the words (node, src/topology.js)
NODE = r"""
import fs from 'fs';
import { pathToFileURL } from 'url';
const root = process.argv[2];
const { syzygyWord, canonical, primitive } = await import(pathToFileURL(root + 'src/topology.js').href);
const { perpInitial } = await import(pathToFileURL(root + 'src/perp.js').href);
function reduceCyclic(str) {
  let s = str.split(''), steps = 0;
  for (;;) {
    const n = s.length; if (n < 2) break;
    let hit = -1;
    for (let i = 0; i < n; i++) if (s[i] === s[(i + 1) % n]) { hit = i; break; }
    if (hit < 0) break;
    const j = (hit + 1) % n;
    s = s.filter((_, k) => k !== hit && k !== j); steps++;
    if (n === 2) break;
  }
  return { word: s.join(''), pairs_deleted: steps };
}
function words(u1, u2, lam, t) {
  let r;
  try { r = syzygyWord(perpInitial(u1, u2, lam), 2 * t); } catch (e) { return { error: String(e) }; }
  if (!r) return { word: null, note: 'syzygyWord returned null' };
  const red = reduceCyclic(r.word);
  let reduced;
  if (red.word.length === 0) reduced = { length: 0, word: '', root: '', power: 0, note: 'empty after the reduction', pairs_deleted: red.pairs_deleted };
  else if (red.word.length === 1) reduced = { length: 1, word: red.word, root: red.word, power: 1, note: 'single letter', pairs_deleted: red.pairs_deleted };
  else { const c = canonical(red.word.split('').map(Number)); reduced = { length: c.length, word: c, ...primitive(c), pairs_deleted: red.pairs_deleted }; }
  return { length: r.length, word: r.word, root: r.root, power: r.power, reduced };
}
const tasks = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
fs.writeFileSync(process.argv[4], JSON.stringify(tasks.map((k) => words(k.u1, k.u2, k.lam, k.t))));
"""
def compute_words():
    tasks = []
    for lab in S:
        for st in S[lab]['stretches']:
            for p in st['picks']: tasks.append(dict(u1=p['u1'], u2=p['u2'], lam=p['lam'], t=p['t']))
    for r in sorted(INP['henon_rows'], key=lambda r: r['orbit']):
        if not r['flagged']: tasks.append(dict(u1=r['u1'], u2=r['u2'], lam=r['lam'], t=r['t']))
    with tempfile.TemporaryDirectory() as d:
        json.dump(tasks, open(d + '/tasks.json', 'w')); open(d + '/w.mjs', 'w').write(NODE)
        r = subprocess.run(['node', d + '/w.mjs', ROOT, d + '/tasks.json', d + '/out.json'], capture_output=True, text=True)
        if r.returncode: sys.exit('node failed: ' + r.stderr[-400:])
        res = json.load(open(d + '/out.json'))
    it = iter(res); W = dict(what='syzygy words (raw canonical and stutter-reduced) of the picked checked points of the four traces and of the unflagged rows of Table I of Henon (1976)', traces={}, henon=[])
    for lab in S:
        W['traces'][lab] = [dict(index=st['index'], lam_lo=st['lam_lo'], lam_hi=st['lam_hi'], points=[dict(id=p['id'], step=p['step'], lam=p['lam'], dmin_w1=p['dmin_w1'], **next(it)) for p in st['picks']]) for st in S[lab]['stretches']]
    for r in sorted(INP['henon_rows'], key=lambda r: r['orbit']):
        if r['flagged']: W['henon'].append(dict(orbit=r['orbit'], flagged=True, lam=r['lam']))
        else: W['henon'].append(dict(orbit=r['orbit'], flagged=False, lam=r['lam'], A=r['A'], Tstar=r['Tstar'], Lstar=r['Lstar'], branch=r['branch'], **next(it)))
    return W
W = json.load(open(opt['--words'], encoding='utf8'))['words'] if '--words' in opt else compute_words()

# ---- 3. the satellite test
def tsls(u1, u2, lam, t):   # T*, L* from the start values
    cm = lam / 3; x = [-1 - cm, lam - cm, 1 - cm]; v = [u1, u2, -u1 - u2]
    E = 0.5 * sum(a * a for a in v) - (1 / abs(x[1] - x[0]) + 1 / abs(x[2] - x[0]) + 1 / abs(x[2] - x[1]))
    L = sum(a * b for a, b in zip(x, v))
    return 2 * t * abs(E) ** 1.5, abs(L) * abs(E) ** 0.5
hen = [r for r in W['henon'] if not r.get('flagged')]
fam = dict(rows_with_words=len(hen), flagged_orbits=[r['orbit'] for r in W['henon'] if r.get('flagged')], null_orbits=[r['orbit'] for r in hen if not r.get('word')])
def group(rows, kind):
    g = {}
    for r in rows:
        if not r.get('word'): continue
        w = r['word'] if kind == 'raw' else r['reduced']['word']
        root = r['root'] if kind == 'raw' else r['reduced']['root']; pw = r['power'] if kind == 'raw' else r['reduced']['power']
        g.setdefault((w, root, pw), []).append(r['orbit'])
    return [dict(word=k[0], length=len(k[0]), root=k[1], power=k[2], orbits=v) for k, v in sorted(g.items(), key=lambda kv: kv[1][0])]
fam['raw'] = group(hen, 'raw'); fam['reduced'] = group(hen, 'reduced')
fam['by_branch'] = {}
for br in sorted({r['branch'] for r in hen}):
    rows_ = [r for r in hen if r['branch'] == br]
    fam['by_branch'][br] = dict(raw=group(rows_, 'raw'), reduced=group(rows_, 'reduced'))
fam['constant_raw'] = len(fam['raw']) == 1; fam['constant_reduced'] = len(fam['reduced']) == 1
henon_raw_roots = {g['root']: g for g in fam['raw']}; henon_red_roots = {g['root']: g for g in fam['reduced']}
rows = sorted(CONV.values(), key=lambda r: r['orbit'])
branches = {'b1 (orbits 2 to 15, A rising)': [r for r in rows if r['orbit'] <= 15], 'b2 (orbits 15 to 28, A falling)': [r for r in rows if 15 <= r['orbit'] <= 28], 'b3 (orbits 28 to 46, A rising)': [r for r in rows if r['orbit'] >= 28]}
def henon_T_at(Ls):
    out = {}
    for name, rs in branches.items():
        pts = sorted(((r['Lstar'], r['Tstar']) for r in rs))
        for (l0, t0), (l1, t1) in zip(pts, pts[1:]):
            if l0 <= Ls <= l1 and l1 > l0: out[name] = t0 + (t1 - t0) * (Ls - l0) / (l1 - l0)
    return out
def curve_of(lab, st):
    lo = -1e9 if st['lam_lo'] is None else st['lam_lo']; hi = 1e9 if st['lam_hi'] is None else st['lam_hi']
    pts = {}
    for p in S[lab]['stretches'][st['index']]['trace_curve']: pts[round(p['lam'], 15)] = (p['lam'], p['Tstar'], p['Lstar'])
    for p in json.load(open(R + 'witnesses/%s.json' % lab, encoding='utf8'))['points']:
        if lo < p['lam'] <= hi:
            T, L = tsls(p['u1'], p['u2'], p['lam'], p['t']); pts.setdefault(round(p['lam'], 15), (p['lam'], T, L))
    return sorted(pts.values())
def crossings(curve, Ls):
    out = []
    for (l0, T0, L0), (l1, T1, L1) in zip(curve, curve[1:]):
        if (L0 - Ls) * (L1 - Ls) <= 0 and L1 != L0: out.append(T0 + (T1 - T0) * (Ls - L0) / (L1 - L0))
    return out
res = {}
for lab in ('t35m', 't44m', 't62m', 't72m'):
    res[lab] = []
    for st in W['traces'][lab]:
        pts = st['points']; sx = next(s for s in S[lab]['stretches'] if s['index'] == st['index'])
        e = dict(trace=lab, stretch=st['index'], lam_lo=st['lam_lo'], lam_hi=st['lam_hi'], points=[dict(id=p['id'], dmin_w1=p['dmin_w1'], length=p.get('length'), word=p.get('word'), root=p.get('root'), power=p.get('power'), reduced_word=(p.get('reduced') or {}).get('word'), reduced_root=(p.get('reduced') or {}).get('root'), reduced_power=(p.get('reduced') or {}).get('power'), note=p.get('note') or p.get('error')) for p in pts])
        nulls = [p['id'] for p in pts if not p.get('word')]
        e['null_points'] = nulls
        raws = {p['word'] for p in pts if p.get('word')}; reds = {p['reduced']['word'] for p in pts if p.get('word')}
        e['raw_words_distinct'] = len(raws); e['reduced_words_distinct'] = len(reds)
        determined = not nulls and len(raws) == 1
        e['word_determined'] = determined
        if not determined:
            e['verdict'] = 'word not determined'
            e['why'] = ('syzygyWord returned null for %s' % ', '.join(nulls)) if nulls else '%d different raw words among the 3 points' % len(raws)
            if not nulls and len(reds) == 1: e['note'] = 'the 3 stutter-reduced words are the same although the raw words differ; no verdict is drawn from that'
            res[lab].append(e); continue
        p0 = pts[0]
        e.update(raw_word=p0['word'], raw_length=p0['length'], raw_root=p0['root'], raw_power=p0['power'], reduced_word=p0['reduced']['word'], reduced_root=p0['reduced']['root'], reduced_power=p0['reduced']['power'])
        which = []
        if p0['root'] in henon_raw_roots: which.append('raw')
        if p0['reduced']['root'] and p0['reduced']['root'] in henon_red_roots: which.append('reduced')
        e['root_equals_family_m_in'] = which
        e['family_m_raw_roots'] = [g['root'] for g in fam['raw']]; e['family_m_reduced_roots'] = [g['root'] for g in fam['reduced']]
        if not which:
            e['verdict'] = 'different root'; res[lab].append(e); continue
        kinds = []
        for kind in which:
            if kind == 'raw': pw, hg = p0['power'], henon_raw_roots[p0['root']]
            else: pw, hg = p0['reduced']['power'], henon_red_roots[p0['reduced']['root']]
            kinds.append(dict(kind=kind, our_power=pw, henon_power=hg['power'], henon_orbits_with_that_root=hg['orbits'], k=pw / hg['power']))
        e['k_candidates'] = kinds
        ratios = []
        for p in pts:
            src = next(q for q in sx['picks'] if q['id'] == p['id'])
            T, L = tsls(src['u1'], src['u2'], src['lam'], src['t']); ht = henon_T_at(L)
            ratios.append(dict(id=p['id'], Tstar=T, Lstar=L, henon_T_star_at_this_L_by_branch=ht, ratio_by_branch={b: T / v for b, v in ht.items()}))
        e['T_star_ratio'] = ratios
        curve = curve_of(lab, st)
        e['curve_points_used'] = len(curve); e['curve_L_range'] = [min(c[2] for c in curve), max(c[2] for c in curve)] if curve else None
        jdres = []
        for kd in kinds:
            k = kd['k']
            if abs(k - round(k)) > 1e-9: kd['jd'] = 'k is not an integer'; jdres.append(kd); continue
            k = int(round(k)); ents = [r for r in JD if r['k'] == k]
            kd['jd_entries_with_that_k'] = len(ents); hits = []
            for r in ents:
                for Tc in crossings(curve, r['Lstar']):
                    hits.append(dict(T_JD=r['T'], L_JD=r['L'], Tstar_JD=r['Tstar'], Lstar_JD=r['Lstar'], Tstar_ours_at_that_L=Tc, rel_diff=abs(Tc - r['Tstar']) / r['Tstar']))
            kd['jd_hits_in_L_range'] = sorted(hits, key=lambda h: h['rel_diff'])
            if curve and ents:
                near = min(ents, key=lambda r: min(abs(r['Lstar'] - c[2]) for c in curve))
                kd['nearest_entry_in_L'] = dict(T_JD=near['T'], L_JD=near['L'], Lstar_JD=near['Lstar'], Tstar_JD=near['Tstar'], distance_in_Lstar=min(abs(near['Lstar'] - c[2]) for c in curve))
            jdres.append(kd)
        e['jd'] = jdres
        best = min((h for kd in jdres for h in kd.get('jd_hits_in_L_range', [])), key=lambda h: h['rel_diff'], default=None)
        e['jd_best_hit'] = best
        if best and best['rel_diff'] <= 1e-5: e['verdict'] = 'satellite of family m with k = %s (matches a JD entry, rel. diff %.1e)' % ('/'.join(str(int(round(kd['k']))) if abs(kd['k'] - round(kd['k'])) < 1e-9 else '%.3g' % kd['k'] for kd in kinds), best['rel_diff'])
        elif best and best['rel_diff'] <= 1e-3: e['verdict'] = 'same root, no JD entry (nearest JD entry %.1e in T*: near, not a match); k = %s' % (best['rel_diff'], '/'.join('%.4g' % kd['k'] for kd in kinds))
        else: e['verdict'] = 'same root, no JD entry; k = %s' % '/'.join('%.4g' % kd['k'] for kd in kinds)
        res[lab].append(e)
glob = []
for lab in res:
    for e in res[lab]:
        st = next(s for s in W['traces'][lab] if s['index'] == e['stretch']); curve = curve_of(lab, st)
        for r in JD:
            for Tc in crossings(curve, r['Lstar']):
                glob.append(dict(trace=lab, stretch=e['stretch'], k_JD=r['k'], T_JD=r['T'], L_JD=r['L'], Tstar_JD=r['Tstar'], Lstar_JD=r['Lstar'], Tstar_ours=Tc, rel_diff=abs(Tc - r['Tstar']) / r['Tstar']))
glob.sort(key=lambda g: g['rel_diff'])
sat = dict(what='the satellite test: are the stretches of the four traces satellites of family m', family_m=fam, jd_reading='T* = T 2^-1.5 and L* = L 2^-0.5 (the table prints T and L at E = -1/2)', stretches=res, jd_entries_in_the_L_range_of_any_stretch=len(glob), jd_global_best_10=glob[:10])
out = dict(
    what='The syzygy words of the four checked stretches (cut at the collision orbits of collision-orbits.json) and of Henon (1976) family m, and the satellite test against Table I of Jankovic and Dmitrasinovic (2016): key inputs = the typed tables (Henon: 45 rows converted to u1, u2, lam, t, with the energy and A checks and the rows flagged by them, orbits 2, 3, 4, 6, 11, which are left out of the words because the printed 8 decimals give about 1e-7 in the energy there; Jankovic and Dmitrasinovic: 57 rows, T and L at E = -1/2), words = the words of the picked points and of the unflagged rows, satellites = the verdicts. No timings are stored.',
    commands=['python tools/satellite-words.py OUT.json    (OUT.json must be new; the inputs are the key inputs of this file; the words are computed with node and src/topology.js, some minutes; --words FILE takes them from the key words of FILE; --check compares OUT.json with this file)'],
    inputs=INP, words=strip_seconds(W), satellites=strip_seconds(sat))
open(OUT, 'x', encoding='utf8').write(json.dumps(out, indent=1))
print('written', OUT, '| family m rows with words:', fam['rows_with_words'], '| determined stretches:', sum(1 for lab in res for e in res[lab] if e['word_determined']), 'of', sum(len(res[lab]) for lab in res), '| JD entries inside an L* range:', len(glob))
if check:
    a = json.load(open(OUT, encoding='utf8')); b = json.load(open(STORED, encoding='utf8'))
    same = a == b; print('check against', STORED, ':', 'SAME' if same else 'DIFFERENT')
    sys.exit(0 if same else 1)
