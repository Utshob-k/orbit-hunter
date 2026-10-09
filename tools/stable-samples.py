# stability along the branch arms of the first verified run (data/satellite-results4.jsonl, the 36 arms of tools/verify-branches.mjs, 30 of which pass the checks of tools/verify-summary.py):
# for the arms that pass, how many have at least one linearly stable sample (largest multiplier modulus below 1 + 1e-6, column 4 of the points of the arm; null = not computed),
# in how many of them the sample next to the branch point (the first point of the arm) is stable, and in how many it is the only stable one.
# the same without the arms that are the repeat curve of their parent (data/satellite-results4.repeats-0-21.json).   python tools/stable-samples.py
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load(p): return json.load(open(os.path.join(root, p)))
PARENT_REPEAT = {0: 1, 1: 9, 2: 1, 3: 1, 4: 2, 5: 1, 6: 1}      # repeat count of the parent orbit by index, as in tools/arm-repeats-summary.py
arms = {}
for l in open(os.path.join(root, 'data/satellite-results4.jsonl')):
    r = json.loads(l)
    for b in r.get('branches', []): arms[(r['job']['orbit'], r['job']['k'], round(b['lamBP'], 4), b['sgn'])] = b
on_repeat_curve = {}
for a in load('data/satellite-results4.repeats-0-21.json'):
    if a['anyFailed']: continue
    on_repeat_curve[(a['orbit'], a['k'], round(a['lamBP'], 4), a['sgn'])] = min(p['nRepeat'] for p in a['points']) == PARENT_REPEAT[a['orbit']] * a['k']
def passes(x):
    word_ok = all(c.get('syzygies') == c.get('expected') for c in x['checks'])
    close_ok = all(c['reclosed'] < 1e-9 and c['dTs'] is not None and c['dTs'] < 1e-8 for c in x['checks'] if 'reclosed' in c)
    return word_ok and close_ok and x['maxJumpOverMedian'] is not None and x['maxJumpOverMedian'] <= 50
ok = [x for x in load('data/satellite-results4.verified.json') if passes(x)]
def count(sel, label):
    n = stable = first = only = 0
    for x in sel:
        key = (x['orbit'], x['k'], round(x['lamBP'], 4), x['sgn'])
        st = [p[4] is not None and p[4] <= 1 + 1e-6 for p in arms[key]['curve']]
        n += 1
        if any(st): stable += 1; first += st[0]; only += st[0] and sum(st) == 1
    print('%s: %d arms, %d with a stable sample, in %d of them the sample at the branch point is stable, in %d it is the only stable one' % (label, n, stable, first, only))
count(ok, 'arms that pass the checks')
count([x for x in ok if not on_repeat_curve.get((x['orbit'], x['k'], round(x['lamBP'], 4), x['sgn']))], 'without the arms on the repeat curve of their parent')
