# counts of the branch points of data/bifurcation-points.json by what is known about their arms (data/arm-repeats.json), and the table of the arms by parent orbit and repeat count
# a branch point has two arms (sign + and -); an arm is only known when its states were stored (the reruns), the others are leads that I could not check
# python tools/branch-census.py
import json, collections, sys
rows = json.load(open('data/bifurcation-points.json'))
rep = json.load(open('data/arm-repeats.json'))
if not rows or not rep: sys.exit('empty table: nothing was counted')
PARENT = {0: 4.96, 1: 33.745, 2: 17.847, 3: 19.769, 4: 47.065, 5: 9.658, 6: 29.31}
def arms_of(r):
    out = []
    for sgn in (1, -1):
        a = rep.get('%d|%d|%.4f|%d' % (r['orbit'], r['k'], r['lamBP'], sgn))
        if a: out.append(a)
    return out
cat = collections.Counter()
per_row = []
for r in rows:
    arms = arms_of(r)
    if not arms: kind = 'no stored states (unverified lead)'
    elif all(a['onRepeatCurve'] for a in arms): kind = 'only the repeat curve of the parent'
    elif any(a['onRepeatCurve'] for a in arms): kind = 'one arm is the repeat curve, the other is not'
    elif any(a['nRepeat'] > 1 for a in arms): kind = 'checked, an arm is a repeat of a shorter orbit (not the parent curve)'
    else: kind = 'checked, primitive orbits'
    cat[kind] += 1
    per_row.append((r, arms, kind))
print(len(rows), 'branch points (rows of data/bifurcation-points.json)')
for k, v in sorted(cat.items(), key=lambda x: -x[1]): print('  %4d  %s' % (v, k))
n_rep_arms = sum(1 for a in rep.values() if a['onRepeatCurve'])
print('arms with stored states:', len(rep), ' of which on the repeat curve of the parent:', n_rep_arms)
unver = cat['no stored states (unverified lead)']
anyrep = cat['only the repeat curve of the parent'] + cat['one arm is the repeat curve, the other is not']
print('branch points that may be just the parent curve: %d are known to have a repeat-curve arm, %d more could not be checked (upper bound %d of %d)' % (anyrep, unver, anyrep + unver, len(rows)))
print('branch points with at least one arm that is not the repeat curve and passed the repeat check:', cat['checked, primitive orbits'] + cat['checked, an arm is a repeat of a shorter orbit (not the parent curve)'] + cat['one arm is the repeat curve, the other is not'])
# table by parent orbit: number of branch points, and number of arms by minimal repeat count
print()
print('by parent orbit: branch points, checked arms by repeat count nRepeat of the orbits of the arm (R = repeat curve of the parent)')
for o in sorted(PARENT):
    rs = [x for x in per_row if x[0]['orbit'] == o]
    c = collections.Counter()
    for r, arms, kind in rs:
        for a in arms: c['R' if a['onRepeatCurve'] else a['nRepeat']] += 1
    unchecked = sum(1 for x in rs if not x[1])
    print('  T* %7.3f  branch points %3d  unchecked %3d  arms %s' % (PARENT[o], len(rs), unchecked, ' '.join('%s:%d' % (k, c[k]) for k in sorted(c, key=lambda z: (isinstance(z, str), z)))))
print()
print('by the pass in which the branch point was first found (file of the row), same columns')
for f in sorted(set(r['file'].replace('\\', '/') for r in rows)):
    for o in sorted(PARENT):
        rs = [x for x in per_row if x[0]['file'].replace('\\', '/') == f and x[0]['orbit'] == o]
        if not rs: continue
        c = collections.Counter()
        for r, arms, kind in rs:
            for a in arms: c['R' if a['onRepeatCurve'] else a['nRepeat']] += 1
        print('  %-28s T* %7.3f  branch points %3d  unchecked %3d  arms %s' % (f.split('/')[-1], PARENT[o], len(rs), sum(1 for x in rs if not x[1]), ' '.join('%s:%d' % (k, c[k]) for k in sorted(c, key=lambda z: (isinstance(z, str), z)))))
