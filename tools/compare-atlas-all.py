# my 85 orbits and the 17 of the arclength list against ALL equal-mass orbits with L != 0 of the Three Body Orbits atlas (415 entries on 2026-10-09).
# the atlas list is not stored in this repository: download https://data.threebodyorbits.com/catalogue.json and run  python tools/compare-atlas-all.py path/to/catalogue.json
# entries used: masses 1, 1, 1 and L* above 1e-7 (the list of 2026-10-09 had 415; one more entry with L* of 1e-8 is left out), T* = T |E|^1.5, L* = |L| |E|^0.5, syz = number of alignments per period.
# a match: L* equal to 1e-5 (relative), T* equal to 1e-5 when one of the two is run n times (n up to 12), and the number of syzygies of my orbit times n (or divided by n) equal to the alignments of the atlas orbit
# "near": the same with 5e-3 (a different orbit of a neighbouring family, not a match).
# the result of the run of 2026-10-09 is in data/atlas-comparison-all.json (keys as in the catalogue).
import json, sys, hashlib
if len(sys.argv) != 2: sys.exit('usage: python tools/compare-atlas-all.py catalogue.json')
raw = open(sys.argv[1], 'rb').read()
print('catalogue.json: %d bytes, sha256 %s' % (len(raw), hashlib.sha256(raw).hexdigest()))
cat = json.loads(raw.decode('utf8'))['orbits']
atlas = []
for x in cat:
    if x['masses'] != [1.0, 1.0, 1.0]: continue
    ls = abs(x['L']) * abs(x['E']) ** 0.5
    if ls > 1e-7: atlas.append({'key': x['key'], 'Tstar': x['T'] * abs(x['E']) ** 1.5, 'Lstar': ls, 'syz': x['syz']})
print('equal-mass entries with L* > 1e-7:', len(atlas))
if len(atlas) != 415: print('WARNING: the list of 2026-10-09 had 415 entries, this catalogue gives %d' % len(atlas))
tab = json.load(open('data/orbit-table.json')); arc = json.load(open('data/perp-arc-orbits.json'))
def syz(o): return len(o['wordRoot']) * o['wordPower'] // o['repeatOf']
mine = [('t%02d' % i, o['primitiveTstar'], o['Lstar'], syz(o), o['group']) for i, o in enumerate(tab)]
# the arclength list has no words in the table: compare T*, L* only (syz None)
mine += [('a%02d' % i, a['ts'], abs(a['ls']), None, 'arc') for i, a in enumerate(arc)]
def best(m, tol):
    out = []
    for a in atlas:
        dL = abs(a['Lstar'] - m[2]) / max(m[2], 0.02)
        if dL > tol: continue
        for n in range(1, 13):
            for who, x, y in (('atlas = n x mine', a['Tstar'], m[1] * n), ('mine = n x atlas', a['Tstar'] * n, m[1])):
                dT = abs(x - y) / y
                if dT > tol: continue
                s = None if m[3] is None else (m[3] * n == a['syz'] if who.startswith('atlas') else m[3] == a['syz'] * n)
                out.append((max(dT, dL), a['key'], who, n, dT, dL, s))
    return sorted(out)
match, near = {}, {}
for m in mine:
    r = best(m, 1e-5)
    r = [x for x in r if x[6] is not False]
    if r: match[m[0]] = r[0]
    elif True:
        q = [x for x in best(m, 5e-3) if x[6] is True]
        if q: near[m[0]] = q[0]
print('matches (1e-5 and the number of syzygies agrees):', len(match))
for k, v in match.items(): print('  %s T*=%.5f L*=%.5f  <->  %s (%s, n=%d)  dT %.1e dL %.1e syz-check %s' % (k, [m for m in mine if m[0] == k][0][1], [m for m in mine if m[0] == k][0][2], v[1], v[2], v[3], v[4], v[5], v[6]))
print('near but not equal (5e-3, the number of syzygies agrees):', len(near))
for k, v in near.items(): print('  %s  <->  %s (%s, n=%d)  dT %.1e dL %.1e' % (k, v[1], v[2], v[3], v[4], v[5]))
t_match = [k for k in match if k[0] == 't']
unm = [m for m in mine if m[0][0] == 't' and m[4] == 'unmatched']
still = [m for m in unm if m[0] not in match]
print('of the 81 that matched nothing in the old 37 entries: %d now match an atlas orbit, %d still match none' % (len(unm) - len(still), len(still)))
cpc = json.load(open('data/cpc-converted.json')); Lmin = min(c['ls_theirs'] for c in cpc)
print('of those %d, %d have L* below the CPC range (%.4f)' % (len(still), sum(1 for m in still if m[2] < Lmin), Lmin))
json.dump({'matches': {k: v[1] for k, v in match.items()}, 'near': {k: v[1] for k, v in near.items()}, 'still_unmatched': [m[0] for m in still]}, open('data/atlas-comparison-all.json', 'w'), indent=1)
