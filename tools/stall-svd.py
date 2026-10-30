# SPDX-License-Identifier: MIT
# singular values of the extended Jacobian [J | dF/dlam] (279 x 280) written by tools/stall-matrix.mjs: the smallest, the second and third smallest and the largest of the whole matrix, and the
# two smallest of J alone, with the closing residual of the point.
# python tools/stall-svd.py OUT.json STALL.json [STALL.json ...]
#   STALL.json: the output of tools/stall-matrix.mjs (its .bin files are read from the folder of the json file). OUT.json must be new; it holds "what", the command and one row for every matrix.
#   Needs numpy. About 1 s for a matrix.
import sys, os, json
import numpy as np

if len(sys.argv) < 3:
    sys.exit('usage: python tools/stall-svd.py OUT.json STALL.json [STALL.json ...]')
out = sys.argv[1]
if os.path.exists(out):
    sys.exit('exists, not overwriting: ' + out)
rows = []
for jf in sys.argv[2:]:
    d = json.load(open(jf))
    for it in d['items']:
        if 'bin' not in it:
            print('%s step %d: no matrix (%s)' % (d['label'], it['taken_step'], it.get('error') or it['close'].get('why')))
            continue
        n = it['system']['rows']
        b = os.path.join(os.path.dirname(os.path.abspath(jf)), os.path.basename(it['bin']))
        A = np.fromfile(b, dtype='<f8').reshape(n, n + 1)
        sv = np.linalg.svd(A, compute_uv=False)
        svJ = np.linalg.svd(A[:, :n], compute_uv=False)
        rows.append(dict(label=d['label'], target=it['target'], step=it['taken_step'], kind=it['kind'], lam=it['lam'], residual=it['close']['res'], n_sv=len(sv),
                         sigma_min=float(sv[-1]), sigma_2=float(sv[-2]), sigma_3=float(sv[-3]), sigma_max=float(sv[0]), J_sigma_min=float(svJ[-1]), J_sigma_2=float(svJ[-2]), seconds=it['close']['seconds']))
        r = rows[-1]
        print('%s step %5d  lam %.8f  residual %.2e  sigma_min %.3e  sigma_max %.3e  ratio %.2e' % (r['label'], r['step'], r['lam'], r['residual'], r['sigma_min'], r['sigma_max'], r['sigma_min'] / r['sigma_max']))
what = ('singular values of the extended Jacobian [J | dF/dlam] (279 x 280, 24 pieces) of the multiple shooting system at stored accepted steps of ' + ', '.join(sorted(set(r['label'] for r in rows))) +
        ' after closing each step at its lam with the ias route: smallest, second and third smallest and largest singular value of the whole matrix, the two smallest of J alone, the closing residual '
        'and the seconds of the closing. These are the stored results of the commands in "command"; the matrices are in the raw files (stall/).')
cmd = ['node tools/stall-matrix.mjs LABEL STEPS stall/LABEL (once for each label)', 'python tools/stall-svd.py OUT.json stall/LABEL.json ...']
json.dump(dict(what=what, command=cmd, rows=rows), open(out, 'x'), indent=1)
print('written', out, len(rows), 'rows')
