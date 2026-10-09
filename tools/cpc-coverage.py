# where the verified branch points lie in (T*, L*) relative to the table of Jankovic et al. 2020 (CPC): for every branch point with at least one verified arm (tools/verify-summary.py)
# (a) does the (T*, L*) range of an arm (reduced to the minimal period) overlap the region spanned by the 99 satellites,
# (b) does the box of an arm contain a satellite with the same total exponent (the "tested" rule of tools/recall-cpc.py): only then a comparison was possible at all
# python tools/cpc-coverage.py
import json, glob, collections, sys
cpc = [(c['N'], c['k'], c['ts_theirs'], c['ls_theirs']) for c in json.load(open('data/cpc-converted.json'))]
ver = set(tuple(x) for x in json.load(open('data/verified-branch-points.json')))
rep = json.load(open('data/arm-repeats.json'))
EXPONENT = {4.96: 1, 9.658: 3, 17.847: 5, 19.769: 6, 29.31: 8, 33.745: 9, 47.065: 16}
parent_ts = {}
for f in ('data/stability-perp-3.json', 'data/stability-arc.json'):
    for o in json.load(open(f)):
        if o['stable'] and round(o['ts'], 3) not in [round(x, 3) for x in parent_ts.values()]: parent_ts[len(parent_ts)] = o['ts']
def kp_of(orbit):
    ts = parent_ts[orbit]
    for k, v in EXPONENT.items():
        if abs(k - ts) < 0.01: return v
Tmin, Tmax = min(c[2] for c in cpc), max(c[2] for c in cpc); Lmin, Lmax = min(c[3] for c in cpc), max(c[3] for c in cpc)
print('region of the 99 CPC satellites: T* %.2f to %.2f, L* %.3f to %.3f' % (Tmin, Tmax, Lmin, Lmax))
arms = {}
for f in sorted(glob.glob('data/satellite-results[4-7].jsonl')):
    for line in open(f):
        r = json.loads(line); j = r['job']
        for b in r['branches']:
            if not b['ok']: continue
            key = '%d|%d|%.4f|%d' % (j['orbit'], j['k'], b['lamBP'], b['sgn'])
            a = rep.get(key)
            if not a or a['onRepeatCurve']: continue
            c = [(q[1] / a['nRepeat'], q[2]) for q in b['curve'] if q[3] < 1e-7 and len(q) >= 8]
            if len(c) >= 3: arms[key] = (j['orbit'], j['k'], round(b['lamBP'], 3), a['nRepeat'], c)
byBP = collections.defaultdict(list)
for key, (o, k, bp, nr, c) in arms.items(): byBP[(o, k, bp)].append((nr, c))
n_ver = n_overlap = n_tested = 0; tested_list = []
for bp in sorted(ver):
    if bp not in byBP: continue
    n_ver += 1
    kp = kp_of(bp[0]); overlap = tested = False
    for nr, c in byBP[bp]:
        T = [p[0] for p in c]; L = [p[1] for p in c]
        if max(T) >= Tmin and min(T) <= Tmax and max(L) >= Lmin and min(L) <= Lmax: overlap = True
        ktot = (kp * bp[1]) // nr
        for N, k, ts, ls in cpc:
            if k == ktot and min(T) * 0.98 <= ts <= max(T) * 1.02 and min(L) * 0.98 <= ls <= max(L) * 1.02: tested = True; tested_list.append((bp, N))
    n_overlap += overlap; n_tested += tested
if n_ver == 0: sys.exit('no verified branch point with stored arms: nothing was compared')
print('%d verified branch points (with stored arms in results4 to 7)' % n_ver)
print('%d have an arm whose (T*, L*) range overlaps the region of the CPC table' % n_overlap)
print('%d have an arm whose box contains a CPC satellite of the same total exponent (a comparison was possible): %s' % (n_tested, sorted(set(tested_list))))
print('so for the other %d "matches no satellite" means "there was no satellite of that exponent to compare with"' % (n_ver - n_tested))
