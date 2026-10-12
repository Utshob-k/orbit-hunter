# multiple precision monodromy of an orbit of class I (the isosceles start, rotation 0 at its zero of theta): the same method and the tier A parameters of
# monodromy-mp.py (50 digits, tolerance 1e-36, h = 1e-10), with the start state replaced by the isosceles start.
# python tools/iso-monodromy-mp.py refined.json out.json   (refined.json from iso-refine.py with fields p w h t; out.json must be new; about 7 minutes)
import importlib.util, json, os, sys, time
from mpmath import mpf

TOOLS = os.path.dirname(os.path.abspath(__file__)) + '/'
spec = importlib.util.spec_from_file_location('monodromymp', TOOLS + 'monodromy-mp.py')
M = importlib.util.module_from_spec(spec); spec.loader.exec_module(M)


def iso_start(p, w, h):
    half = mpf(1) / 2
    return [mpf(1), mpf(0), -half, h, -half, -h, mpf(0), w, p, -w / 2, -p, -w / 2]


if __name__ == '__main__':
    src = json.load(open(sys.argv[1])); outf = sys.argv[2]
    t0 = time.time()
    res = M.monodromy_block(src['p'], src['w'], src['h'], src['t'], 50, '1e-36', '1e-10', start=iso_start)
    res.update(orbit_src=sys.argv[1], total_seconds=round(time.time() - t0, 1))
    json.dump(res, open(outf, 'x'), indent=1)
    r = res['result']['R']
    print('closure %s; max | |mu|-1 | %s; invariance defect %s; |Mv-v| %s; |Mg-g| %s; det-1 %s; seconds %s' % (res['closure'], r['max_mod_dev'], r['invariance_defect_z'], r['Mv_minus_v'], r['Mg_minus_g'], r['det_minus_1'], res['total_seconds']))
    for m in r['mu']:
        print('  mu: re %s im %s |mu|-1 %s angle %s' % (m['re'][:24], m['im'][:24], m['mod_minus_1'], m['angle'][:24]))
