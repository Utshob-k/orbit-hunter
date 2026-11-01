# SPDX-License-Identifier: MIT
# Checks on the runs past the guards (data/deep/extra/guards-record.json) from the per-attempt records of the two runs: how often the corrector failed in attempts with and without a guard trip, how the five re-closed points were chosen
# and where they lie, the first trip and the turn of lam, the missed flags, and the one attempt with a trip at d1 = 1.07e-12 (step 32 of t72 -): whether it was accepted and recorded, the re-closing of its orbit in 50 digits and the
# w1b witness of the re-closed orbit (smallest pair distance, closure, the change of E and L, and whether the w1b acceptance of docs/deep.md holds: minimum pair distance at least 1e-10, closure below 1e-6, E and L to 1e-14).
# It also reads where a trip is counted (src/ias/bridge.js) and the counts of the cross-check in the stored traces (guards.cross_check_pieces, guards.cross_check_replaced).
# Inputs: REL (the repository: data/deep/extra/guards-record.json, data/deep/traces/<label>.json, src/ias/bridge.js) and, from the raw deposit, the outputs of the two runs (BEYOND_T62M, BEYOND_T72M = the output of
# tools/family-follow-ias.mjs --guards=record with its .diag.jsonl) and the re-closing and the witness of step 32 of t72 -.
#   python tools/guards-record-checks.py REL BEYOND_T62M BEYOND_T72M STEP32_JOB STEP32_RECLOSE STEP32_WITNESS_JOB STEP32_WITNESS OUT.json       OUT.json must be new
#   (STEP32_WITNESS_JOB holds the re-closed orbit that the witness integrated; E and L of its start are the reference of the check)
import sys, os, json, math
from mpmath import mp, mpf, sqrt
mp.dps = 50
BS = chr(92)
REL = sys.argv[1].replace(BS, '/').rstrip('/') + '/'
BEYOND = {'t62m': sys.argv[2], 't72m': sys.argv[3]}
JOB, REC, WJOB, WIT, OUT = sys.argv[4:9]
if os.path.exists(OUT): sys.exit('exists, not overwriting: ' + OUT)
L = lambda p: json.load(open(p, encoding='utf8'))
D = REL + 'data/deep/'
gr = L(D + 'extra/guards-record.json')

def rate(a, b): return a / b if b else None

res = dict(what='', commands=[], inputs={}, runs={})
for label in ('t62m', 't72m'):
    b = L(BEYOND[label])
    rows = [json.loads(l) for l in open(BEYOND[label] + '.diag.jsonl', encoding='utf8') if l.strip()]
    g = gr['runs'][label]
    trip = [r for r in rows if r.get('guardTrips', 0) > 0]
    no = [r for r in rows if not r.get('guardTrips', 0)]
    fail = lambda rs: sum(1 for r in rs if r['outcome'] != 'accepted')
    assert len(trip) == g['guards_would_have_tripped']['attempts_with_a_trip'] and len(rows) == g['attempts'] and fail(rows) == g['failed_attempts'], label
    assert sum(1 for r in trip if r['outcome'] == 'accepted') == g['guards_would_have_tripped']['accepted_attempts_with_a_trip']
    # lam after every attempt (the lam of the last accepted step for a failed one)
    lam_prev, lam_at = b['start']['lam'] if 'lam' in b['start'] else None, {}
    for r in rows:
        if r['outcome'] == 'accepted': lam_prev = r['lamNew']
        lam_at[r['step']] = lam_prev
    acc = [r for r in rows if r['outcome'] == 'accepted']
    lam_turn = min(r['lamNew'] for r in acc)
    first_trip = trip[0]
    rec = sorted(b['points'], key=lambda p: p['step'])
    unrec_steps = set(u['step'] for u in b['unrec'])
    n = len(rec)
    idx = [round((n - 1) * j / 5) for j in range(1, 6)]
    chosen = [rec[i] for i in idx]
    for c, p in zip(chosen, g['reclosed_points']): assert c['lam'] == p['lam'] or abs(c['lam'] - p['lam']) < 1e-15, (label, c['lam'], p['lam'])
    first_rc = chosen[0]
    before = [r for r in acc if r['step'] < first_rc['step']]
    miss_rows = [r for r in rows if r.get('missedCounted', 0)]
    res['runs'][label] = dict(
        attempts=len(rows), accepted=len(acc), failed=fail(rows), recorded_accepted_steps=len(rec), unrecorded_accepted_steps=len(b['unrec']),
        attempts_with_a_trip=dict(attempts=len(trip), accepted=len(trip) - fail(trip), failed=fail(trip), failure_rate=rate(fail(trip), len(trip))),
        attempts_without_a_trip=dict(attempts=len(no), accepted=len(no) - fail(no), failed=fail(no), failure_rate=rate(fail(no), len(no))),
        failed_reasons=sorted(set(str(r.get('why')) for r in rows if r['outcome'] != 'accepted')),
        turn=dict(lam=lam_turn, loop_step=next(r['step'] for r in acc if r['lamNew'] == lam_turn)),
        first_trip=dict(loop_step=first_trip['step'], lam_of_the_last_accepted_step_before_it=lam_at[first_trip['step']] if first_trip['outcome'] != 'accepted' else first_trip['lamNew'], kinds_in_that_attempt=first_trip.get('guardByKind')),
        five_reclosed_points=dict(rule='the recorded points of the run sorted by loop step, at the indices round((n - 1) j / 5), j = 1..5, n recorded points (the last recorded point is the fifth); ref = the run\'s own u1, u2, t',
                                  recorded_points=n, indices=idx, loop_steps=[c['step'] for c in chosen], lam=[c['lam'] for c in chosen], all_recorded=all(c['step'] not in unrec_steps for c in chosen),
                                  accepted_steps_before_the_first_one=len(before), of_them_unrecorded=sum(1 for r in before if r['step'] in unrec_steps), of_them_with_a_trip=sum(1 for r in before if r.get('guardTrips', 0) > 0),
                                  lam_of_the_first_one=first_rc['lam'], lam_turn=lam_turn),
        missed_flags=dict(counted_in_the_run_output=b['guards']['missedCounted'], sum_of_the_missedCounted_field_of_the_attempt_records=sum(r.get('missedCounted', 0) for r in rows),
                          attempts_with_the_field_above_zero=[dict(loop_step=r['step'], outcome=r['outcome'], with_a_trip=r.get('guardTrips', 0) > 0, lam_before=lam_at[r['step']]) for r in miss_rows], missed_stops=b['guards']['missedStops']),
        regularised_integrator=dict(reg_failures=b['guards']['regFailures'], bridge_errors=b['bridge']['errors'], timeouts=b['bridge']['timeouts']))
    res['inputs'][label] = os.path.basename(BEYOND[label]) + ' and .diag.jsonl'
    if label == 't72m':
        tl = [t for t in b['guards']['tripList'] if t['kind'] == 'G2']
        low = min(tl, key=lambda t: t['d1'])
        s = low['step']
        arow = [r for r in rows if r['step'] == s][0]
        ur = [u for u in b['unrec'] if u['step'] == s]
        job, rc, wt = L(WJOB), L(REC), L(WIT)
        def perp(u1, u2, lam):
            cm = mpf(lam) / 3
            return [-1 - cm, 0, mpf(lam) - cm, 0, 1 - cm, 0, 0, mpf(u1), 0, mpf(u2), 0, -mpf(u1) - mpf(u2)]
        def el(x):
            E = L_ = mpf(0)
            for i in range(3):
                E += (mpf(x[6 + 2 * i]) ** 2 + mpf(x[7 + 2 * i]) ** 2) / 2; L_ += mpf(x[2 * i]) * mpf(x[7 + 2 * i]) - mpf(x[2 * i + 1]) * mpf(x[6 + 2 * i])
            for i in range(3):
                for j in range(i + 1, 3): E -= 1 / sqrt((mpf(x[2 * j]) - mpf(x[2 * i])) ** 2 + (mpf(x[2 * j + 1]) - mpf(x[2 * i + 1])) ** 2)
            return E, L_
        dE = dL = None
        if wt.get('x_full'):
            E0, L0 = el(perp(job['u1'], job['u2'], job['lam'])); E1, L1 = el(wt['x_full'])
            dE, dL = float(abs(E1 - E0) / abs(E0)), float(abs(L1 - L0) / max(abs(L0), mpf('1e-3')))
        acc_ok = wt.get('status') == 'done' and wt.get('dmin') is not None and wt['dmin'] >= 1e-10 and wt['closure'] < 1e-6 and dE is not None and dE <= 1e-14 and dL <= 1e-14
        res['runs'][label]['step_32'] = dict(
            trip=low, attempt=dict(loop_step=s, outcome=arow['outcome'], iters=arow['iters'], guard_trips_in_the_attempt=arow.get('guardTrips'), guard_trips_by_kind=arow.get('guardByKind'), final_residual=arow.get('finalResid')),
            accepted=arow['outcome'] == 'accepted', recorded=not ur, unrecorded_reason=(ur[0].get('reason') if ur else None), lam_of_the_step=(ur[0]['lam'] if ur else arow.get('lamNew')),
            reclosing=dict(converged=rc.get('converged'), updates=len(rc.get('iterations', [])) - 1, residual=rc.get('residual'), seconds=rc.get('elapsed_s'), same_orbit_as_the_step=rc.get('same_orbit'), relative_difference_to_the_step=rc.get('rel_diff_ref')),
            witness_w1b=dict(status=wt.get('status'), dmin=wt.get('dmin'), dmin_parabolic=wt.get('dmin_parabolic'), dmin_pair=wt.get('dmin_pair'), closure=wt.get('closure'), dE=dE, dL=dL, inside_the_w1b_acceptance=acc_ok,
                             acceptance='minimum pair distance at least 1e-10, closure below 1e-6, change of E and L at most 1e-14 (docs/deep.md, tools/witness-acceptance.py)'))
# where a trip is counted
br = open(REL + 'src/ias/bridge.js', encoding='utf8').read()
lines = br.split('\n')
def line_of(text): return next(i + 1 for i, l in enumerate(lines) if text in l)
res['where_trips_are_counted'] = dict(
    reading=('trip() is called inside the evaluation of the pieces of a corrector call (each call of the piece evaluator, so at every iteration of the corrector and at the final orbit), for G3 on the start of a piece, for G1a, G1b and G2 on the flags of the IAS15 piece; '
             'in the default mode it throws and the attempt fails, with guards=record it counts and lists the trip and the evaluation goes on'),
    lines=dict(trip_function=line_of('function trip(kind, info)'), count=line_of('gstats.trips[kind]++'), list=line_of('gstats.tripList.push'), record_returns=line_of("if (record) return;"), G3=line_of("trip('G3'"), G1a=line_of("trip('G1a'"), G1b=line_of("trip('G1b'"), G2=line_of("if (a[10]) trip('G2'")))
res['cross_check_in_the_stored_traces'] = {l: dict(cross_check_pieces=L(D + 'traces/%s.json' % l)['guards'].get('cross_check_pieces'), cross_check_replaced=L(D + 'traces/%s.json' % l)['guards'].get('cross_check_replaced')) for l in ('t35m', 't44m', 't62m', 't72m')}
res['what'] = ('checks on the two runs past the guards: the failure rate of the corrector in attempts with and without a guard trip, the rule and the place of the five re-closed points, the first trip and the turn, the missed flags, '
               'step 32 of t72 - (the attempt with a trip at d1 = 1.07e-12: accepted, unrecorded, re-closed and witnessed), where a trip is counted in src/ias/bridge.js, and the cross-check counts of the four stored traces')
res['commands'] = ['python tools/guards-record-checks.py REL BEYOND_T62M BEYOND_T72M STEP32_JOB STEP32_RECLOSE STEP32_WITNESS_JOB STEP32_WITNESS OUT.json   (the run outputs, the re-closing and the witness are in the raw deposit)',
                   'python tools/reclose.py STEP32_JOB STEP32_RECLOSE   (u1, u2, lam, t of step 32 from the unrecorded list of the t72 - run, ref = the same values)', 'python tools/witness.py STEP32_WITNESS_JOB STEP32_WITNESS --preset w1b   (the re-closed orbit)']
json.dump(res, open(OUT, 'x', encoding='utf8'), indent=1)
print('written', OUT)
for l, r in res['runs'].items():
    print(l, 'with a trip', r['attempts_with_a_trip'], 'without', r['attempts_without_a_trip'], 'missed', r['missed_flags']['sum_of_the_missedCounted_field_of_the_attempt_records'], r['five_reclosed_points']['loop_steps'])
if 'step_32' in res['runs']['t72m']: print(json.dumps(res['runs']['t72m']['step_32'], indent=1)[:2500])
