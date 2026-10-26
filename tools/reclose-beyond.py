# re-closes the three creeping traces (t35 -, t44 -, t81 -) BEYOND the last lam of the trace with tools/reclose.py (50 digits): for each trace a linear least squares fit of u1, u2, t against lam over
# the last 300 accepted steps (recorded points and unrecorded steps by loop step), extrapolated to lam_last and to lam_last - 1e-6, - 1e-5, - 1e-4 (the three traces go towards falling lam), and
# reclose.py started from the extrapolated values; if it converges the family goes on there. Then the w1 witness (tools/witness.py) of the orbit at lam_last - 1e-4.
#   python tools/reclose-beyond.py prepare DIR           DIR must be new: the jobs (DIR/<trace>_d<delta>.job.json), DIR/queue.json for tools/run-queue.py and DIR/fit-info.json
#   python tools/run-queue.py DIR/queue.json 3           the re-closings (12 jobs, 50 to 290 s each)
#   python tools/reclose-beyond.py witness-jobs DIR      writes DIR/witness-queue.json for the three orbits at lam_last - 1e-4;  python tools/run-queue.py DIR/witness-queue.json 3  (about a minute each)
#   python tools/reclose-beyond.py report DIR OUT.json   OUT.json (new): per trace and delta whether it converged, the updates, the residual, the distance of the result from the extrapolation (relative, the largest of
#                                                        u1, u2, t), at lam_last the change against the stored orbit, and the witness (closure, smallest pair distance)
import sys, os, json
import numpy as np

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
TR = ('t35m', 't44m', 't81m')
DELTAS = [('0', 0.0), ('1em06', 1e-6), ('1em05', 1e-5), ('0.0001', 1e-4)]


def prepare(folder):
    os.makedirs(folder); queue = []; info = {}
    for name in TR:
        tr = json.load(open(os.path.join(root, 'data', 'deep', 'traces', name + '.json')))
        acc = sorted(tr['points'] + tr['unrecorded'], key=lambda p: p['step']); last = acc[-300:]
        lam0 = last[-1]['lam']; x = np.array([p['lam'] for p in last]) - lam0; fit = {}
        for k in ('u1', 'u2', 't'):
            c = np.polyfit(x, np.array([p[k] for p in last]), 1); fit[k] = (float(c[0]), float(c[1]))
        info[name] = dict(accepted=len(acc), last_step=last[-1]['step'], lam_last=lam0, lam_range_of_fit=float(x.max() - x.min()), slope={k: fit[k][0] for k in fit}, stored_last={k: last[-1][k] for k in ('u1', 'u2', 't')})
        for tag, d in DELTAS:
            vals = {k: fit[k][0] * (-d) + fit[k][1] for k in fit}
            jid = '%s_d%s' % (name, tag); r = {k: repr(vals[k]) for k in vals}
            jf = os.path.join(folder, jid + '.job.json'); json.dump(dict(id=jid, lam=repr(lam0 - d), ref=dict(r), **r), open(jf, 'x'))
            queue.append(dict(id=jid, cmd=[os.path.join(here, 'reclose.py'), jf, os.path.join(folder, jid + '.out.json'), '--minutes', '30'], out=os.path.join(folder, jid + '.out.json'), limit_min=30))
    json.dump(queue, open(os.path.join(folder, 'queue.json'), 'x'), indent=1); json.dump(info, open(os.path.join(folder, 'fit-info.json'), 'x'), indent=1)
    print(len(queue), 'jobs in', os.path.join(folder, 'queue.json'))


def res(folder, name, tag): return json.load(open(os.path.join(folder, '%s_d%s.out.json' % (name, tag))))


def witness_jobs(folder):
    q = []
    for name in TR:
        r = res(folder, name, '0.0001')
        if not r['converged']: sys.exit('not converged: ' + name)
        jid = name + '_w1'; jf = os.path.join(folder, jid + '.job.json')
        json.dump(dict(id=jid, u1=r['u1_float'], u2=r['u2_float'], lam=float(r['lam']), t=r['t_float']), open(jf, 'x'))
        q.append(dict(id=jid, cmd=[os.path.join(here, 'witness.py'), jf, os.path.join(folder, jid + '.out.json'), '--preset', 'w1', '--minutes', '30'], out=os.path.join(folder, jid + '.out.json'), limit_min=30))
    json.dump(q, open(os.path.join(folder, 'witness-queue.json'), 'x'), indent=1)


def report(folder, out):
    info = json.load(open(os.path.join(folder, 'fit-info.json'))); rep = {}
    for name, fi in info.items():
        rows = []
        for tag, d in DELTAS:
            r = res(folder, name, tag)
            item = dict(delta_lam=d, lam=float(r['lam']), converged=r['converged'], updates=len(r['iterations']) - 1, residual=r['residual'], distance_from_extrapolation=max(r['rel_diff_ref'].values()), seconds=r['elapsed_s'])
            if d == 0.0: item['change_against_stored_orbit'] = max(abs(r[k + '_float'] - fi['stored_last'][k]) / abs(fi['stored_last'][k]) for k in ('u1', 'u2', 't'))
            rows.append(item)
        wf = os.path.join(folder, name + '_w1.out.json'); wit = None
        if os.path.exists(wf):
            w = json.load(open(wf)); wit = {k: w[k] for k in ('closure', 'dmin_parabolic', 'dmin', 'e_half') if k in w}
        rep[name] = dict(lam_last=fi['lam_last'], last_loop_step=fi['last_step'], lam_range_of_the_fit=fi['lam_range_of_fit'], reclose=rows, witness_w1_at_lam_last_minus_1e_4=wit)
    json.dump(dict(what='the creeping traces re-closed beyond their last lam with tools/reclose.py (50 digits) from a linear extrapolation over the last 300 accepted steps (tools/reclose-beyond.py)', traces=rep), open(out, 'x'), indent=1)


if len(sys.argv) == 3 and sys.argv[1] == 'prepare': prepare(sys.argv[2])
elif len(sys.argv) == 3 and sys.argv[1] == 'witness-jobs': witness_jobs(sys.argv[2])
elif len(sys.argv) == 4 and sys.argv[1] == 'report': report(sys.argv[2], sys.argv[3])
else: sys.exit('usage: python tools/reclose-beyond.py prepare DIR | witness-jobs DIR | report DIR OUT.json')
