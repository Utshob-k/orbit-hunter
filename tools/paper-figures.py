# SPDX-License-Identifier: MIT
# makes the four figures of the paper as SVG from the data of data/deep (read only): figure1.svg = the orbit of t35 - at step 10 with an inset of the close pair, figure2.svg = the checked minimum d against lam (four panels),
# figure3.svg = sqrt(d) against lam for t35 - with the fitted lines, figure4.svg = progress in lam against the accepted steps. Every plotted point is an element with data-x, data-y and data-cx, data-cy and every tick has data-value and
# data-px or data-py, so that the drawing can be read back against the data files.
#   python tools/paper-figures.py OUTDIR      OUTDIR must exist; the four files must not
import sys, os, json, re, math
sys.stdout.reconfigure(encoding='utf-8')
if len(sys.argv) < 2: sys.exit('usage: python tools/paper-figures.py OUTDIR')
HERE = sys.argv[1].replace(chr(92), '/').rstrip('/') + '/'
PUB = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace(chr(92), '/') + '/'
D = PUB + 'data/deep/'
for f in ('figure1.svg', 'figure2.svg', 'figure3.svg', 'figure4.svg'):
    if os.path.exists(HERE + f): sys.exit('refusing to overwrite ' + f)
J = lambda p: json.load(open(D + p, encoding='utf-8'))
def chosen(p): return p['w1b'] if p.get('w1b') and p['w1']['dmin_parabolic'] < 1e-7 else p['w1']
MINUS = '\u2212'
def fe(v, d=3):
    m, e = ('%.*e' % (d, v)).split('e'); return m + 'e' + str(int(e))
def tick_e(v):
    if v == 0: return '0'
    s = '%.0e' % v
    m, e = s.split('e'); return m + 'e' + str(int(e))
FONT = 'font-family="Arial, Helvetica, sans-serif"'
def head(w, h, mmw, desc):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%dmm" height="%gmm" %s>\n<desc>%s</desc>\n<rect x="0" y="0" width="%d" height="%d" fill="#fff"/>\n' % (w, h, mmw, h * mmw / w, FONT, desc, w, h))
def esc(t): return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
def txt(x, y, s, size=11, anchor='start', weight='normal', fill='#111', extra=''):
    return '<text x="%.2f" y="%.2f" font-size="%g" text-anchor="%s" font-weight="%s" fill="%s" %s>%s</text>\n' % (x, y, size, anchor, weight, fill, extra, esc(s))
def nice_step(span, n):
    raw = span / n; e = 10 ** math.floor(math.log10(raw)); f = raw / e
    return (1 if f < 1.5 else 2 if f < 3.5 else 5 if f < 7.5 else 10) * e

# ---------------------------------------------------------------- F2: d against lam, log d, one panel for each family
FAM = [('t35m', 't35 ' + MINUS), ('t44m', 't44 ' + MINUS), ('t62m', 't62 ' + MINUS), ('t72m', 't72 ' + MINUS)]
wp = {l: J('witnesses/%s.json' % l)['points'] for l, _ in FAM}
midrows = [r for r in J('reclose/t35m.json')['rows'] if r['type'] == 'mid']
nw = [r for r in midrows if not r['w1b']['witnessed']]
assert len(nw) == 1
W2, H2 = 520, 470
PW, PH = 185, 150
PANELS = {'t35m': (62, 28), 't44m': (312, 28), 't62m': (62, 246), 't72m': (312, 246)}
o = head(W2, H2, 150, 'F2: checked minimum d of the pair distance against lambda for t35 -, t44 -, t62 -, t72 - (logarithmic vertical axis, one panel each). Source: data/deep/witnesses/*.json, data/deep/reclose/t35m.json')
def circ(cx, cy, r, filled, attrs=''):
    return '<circle %s cx="%.2f" cy="%.2f" r="%g" fill="%s" stroke="#222" stroke-width="0.9"/>\n' % (attrs, cx, cy, r, '#222' if filled else '#fff')
CROSS = None
for l, name in FAM:
    X0, Y0 = PANELS[l]; X1, Y1 = X0 + PW, Y0 + PH
    pts = [(p['step'], p['kind'], p['lam'], chosen(p)['dmin_parabolic']) for p in wp[l]]
    lams = [p[2] for p in pts]; ds = [p[3] for p in pts]
    if l == 't35m': ds = ds + [nw[0]['w1b']['dmin_parabolic']]; lams = lams + [nw[0]['lam']]
    lo_y, hi_y = math.floor(math.log10(min(ds))), math.ceil(math.log10(max(ds)))
    lstep = nice_step(max(lams) - min(lams), 4); lo_l, hi_l = math.floor(min(lams) / lstep + 1e-9) * lstep, math.ceil(max(lams) / lstep - 1e-9) * lstep
    xm = lambda lam: X0 + (lam - lo_l) / (hi_l - lo_l) * (X1 - X0)
    ym = lambda v: Y1 - (math.log10(v) - lo_y) / (hi_y - lo_y) * (Y1 - Y0)
    o += txt(X0, Y0 - 8, name, 12, weight='bold')
    o += '<rect x="%d" y="%d" width="%d" height="%d" fill="none" stroke="#222" stroke-width="1"/>\n' % (X0, Y0, PW, PH)
    for e in range(lo_y, hi_y + 1):
        py = ym(10.0 ** e)
        o += '<line class="tick" data-panel="%s" data-axis="y" data-value="%.6e" data-py="%.2f" x1="%d" y1="%.2f" x2="%d" y2="%.2f" stroke="#222" stroke-width="1"/>\n' % (l, 10.0 ** e, py, X0 - 4, py, X0, py)
        if lo_y < e < hi_y: o += '<line x1="%d" y1="%.2f" x2="%d" y2="%.2f" stroke="#ddd" stroke-width="0.6"/>\n' % (X0, py, X1, py)
        o += txt(X0 - 7, py + 3.5, '1e%d' % e, 9.5, 'end', extra='data-panel="%s" data-label-for="%.6e"' % (l, 10.0 ** e))
    dec = max(0, int(math.ceil(-math.log10(lstep) - 1e-9)))
    v = lo_l; n = 0
    while v <= hi_l + 1e-12 * abs(hi_l):
        px = xm(v)
        o += '<line class="tick" data-panel="%s" data-axis="x" data-value="%.8f" data-px="%.2f" x1="%.2f" y1="%d" x2="%.2f" y2="%d" stroke="#222" stroke-width="1"/>\n' % (l, v, px, px, Y1, px, Y1 + 4)
        o += txt(px, Y1 + 15, '%.*f' % (dec, v), 9.5, 'middle', extra='data-panel="%s" data-label-for="%.8f" data-dec="%d"' % (l, v, dec)); v += lstep; n += 1
    o += txt((X0 + X1) / 2, Y1 + 30, '\u03bb', 11, 'middle')
    if l in ('t35m', 't62m'): o += txt(X0 - 44, (Y0 + Y1) / 2, 'd', 11, 'middle', extra='transform="rotate(-90 %g %g)"' % (X0 - 44, (Y0 + Y1) / 2))
    for step, kind, lam, d in sorted(pts, key=lambda p: p[1] == 'unrecorded'):
        cx, cy = xm(lam), ym(d)
        o += circ(cx, cy, 2.1, True, 'class="m" data-fig="4" data-panel="%s" data-kind="%s" data-step="%d" data-x="%.12g" data-y="%.12g" data-cx="%.2f" data-cy="%.2f"' % (l, kind, step, lam, d, cx, cy))
    if l == 't35m':
        lam, d = nw[0]['lam'], nw[0]['w1b']['dmin_parabolic']; cx, cy = xm(lam), ym(d); a = 3.4
        o += '<g class="m" data-fig="4" data-panel="t35m" data-kind="mid-not-witnessed" data-step="%d-%d" data-x="%.12g" data-y="%.12g" data-cx="%.2f" data-cy="%.2f" stroke="#222" stroke-width="1.6"><path d="M%.2f,%.2f L%.2f,%.2f M%.2f,%.2f L%.2f,%.2f"/></g>\n' % (nw[0]['steps'][0], nw[0]['steps'][1], lam, d, cx, cy, cx - a, cy - a, cx + a, cy + a, cx - a, cy + a, cx + a, cy - a)
# legend below the panels, outside the data
ly = H2 - 22; lx = 70
o += circ(lx, ly, 2.8, True) + txt(lx + 8, ly + 3.5, 'checked point', 10.5)
a = 3.8; xx = lx + 120
o += '<path d="M%g,%g L%g,%g M%g,%g L%g,%g" stroke="#222" stroke-width="1.6"/>\n' % (xx - a, ly - a, xx + a, ly + a, xx - a, ly + a, xx + a, ly - a)
o += txt(xx + 8, ly + 3.5, 'unchecked midpoint of t35 %s' % MINUS, 10.5)
o += '</svg>\n'
open(HERE + 'figure2.svg', 'w', encoding='utf-8', newline='\n').write(o)
# ---------------------------------------------------------------- F3: sqrt(d) against lam for t35 -, two fitted lines and lam_c
steps = [(p['step'], p['lam'], chosen(p)['dmin_parabolic']) for p in wp['t35m'] if p['step'] <= 25]
assert len(steps) == 25
mids = [(r['steps'], r['lam'], r['w1b']['dmin_parabolic'], r['w1b']['witnessed']) for r in midrows]
assert len(mids) == 24
# the fit of the text: the elements are the witnessed steps and midpoints (w1b where the w1 minimum is below 1e-7), the minimum, six nearest on each side below 1e-7
def element_list():
    el = []
    for p in wp['t35m']:
        v = p['w1']['dmin_parabolic']
        if v < 1e-7 and 'w1b' in p: v = p['w1b']['dmin_parabolic']
        el.append((float(p['step']), p['lam'], v))
    for r in midrows:
        if r['w1b']['witnessed']: el.append(((r['steps'][0] + r['steps'][1]) / 2.0, r['lam'], r['w1b']['dmin_parabolic']))
    return sorted(el)
def side(el, i, sgn):
    pts = []; prev = el[i][2]; lamdir = None; j = i + sgn
    while 0 <= j < len(el) and len(pts) < 6:
        pos, lam, d = el[j]
        if not d < 1e-7 or d < prev: break
        dl = lam - (pts[-1][1] if pts else el[i][1])
        if dl != 0:
            s = 1 if dl > 0 else -1
            if lamdir is None: lamdir = s
            elif s != lamdir: break
        pts.append(el[j]); prev = d; j += sgn
    return pts
def fit(pts):
    n = len(pts); x = [p[1] for p in pts]; y = [math.sqrt(p[2]) for p in pts]; x0 = sum(x) / n; xs = [a - x0 for a in x]; ym_ = sum(y) / n
    b = sum(a * (c - ym_) for a, c in zip(xs, y)) / sum(a * a for a in xs)
    return dict(slope=b, x0=x0, a0=ym_, lam_c=x0 - ym_ / b, n=n)
el = element_list()
imin = min(range(len(el)), key=lambda i: el[i][2])
FL, FR = fit(side(el, imin, -1)), fit(side(el, imin, +1))
LAMC = 0.5 * (FL['lam_c'] + FR['lam_c'])
lams = [s[1] for s in steps] + [m[1] for m in mids]
sq = [math.sqrt(s[2]) for s in steps] + [math.sqrt(m[2]) for m in mids]
lstep = nice_step(max(lams) - min(lams), 5)
lo_l, hi_l = math.floor(min(lams) / lstep + 1e-9) * lstep, math.ceil(max(lams) / lstep - 1e-9) * lstep
ystep = nice_step(max(sq), 5); hi_y = math.ceil(max(sq) / ystep - 1e-9) * ystep
W3, H3 = 480, 320; X0, X1, Y0, Y1 = 66, 456, 14, 250
xm = lambda lam: X0 + (lam - lo_l) / (hi_l - lo_l) * (X1 - X0)
ym = lambda v: Y1 - v / hi_y * (Y1 - Y0)
o = head(W3, H3, 120, 'F3: sqrt of the checked minimum pair distance d against lambda for the accepted steps 1 to 25 and the re-closed midpoints of t35 -, with the two fitted lines and lambda_c. Source: data/deep/witnesses/t35m.json, data/deep/reclose/t35m.json')
o += '<rect x="%d" y="%d" width="%d" height="%d" fill="none" stroke="#222" stroke-width="1"/>\n' % (X0, Y0, X1 - X0, Y1 - Y0)
dec = max(0, int(math.ceil(-math.log10(lstep) - 1e-9)))
v = lo_l
while v <= hi_l + 1e-12:
    px = xm(v); o += '<line class="tick" data-axis="x" data-value="%.8f" data-px="%.2f" x1="%.2f" y1="%d" x2="%.2f" y2="%d" stroke="#222" stroke-width="1"/>\n' % (v, px, px, Y1, px, Y1 + 4)
    o += txt(px, Y1 + 16, '%.*f' % (dec, v), 10.5, 'middle', extra='data-label-for="%.8f" data-dec="%d"' % (v, dec)); v += lstep
v = 0.0
while v <= hi_y + 1e-15:
    py = ym(v); o += '<line class="tick" data-axis="y" data-value="%.6e" data-py="%.2f" x1="%d" y1="%.2f" x2="%d" y2="%.2f" stroke="#222" stroke-width="1"/>\n' % (v, py, X0 - 4, py, X0, py)
    o += txt(X0 - 7, py + 3.5, tick_e(v), 10.5, 'end', extra='data-label-for="%.6e"' % v); v += ystep
o += txt((X0 + X1) / 2, H3 - 36, '\u03bb', 11.5, 'middle')
o += txt(14, (Y0 + Y1) / 2, 'sqrt(d), d = checked minimum pair distance', 11, 'middle', extra='transform="rotate(-90 14 %g)"' % ((Y0 + Y1) / 2))
# the lines first, the points on top
lam_lo, lam_hi = min(lams), max(lams)
def fit_line(f, name, lam_far):
    v1 = f['a0'] + f['slope'] * (lam_far - f['x0'])
    return '<line class="fit" data-side="%s" data-lam1="%.12g" data-v1="%.12g" data-lam2="%.12g" data-v2="0" x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="#666" stroke-width="1.1"/>\n' % (name, lam_far, v1, f['lam_c'], xm(lam_far), ym(v1), xm(f['lam_c']), ym(0.0))
lfar_L = lam_lo if FL['slope'] < 0 else lam_hi
lfar_R = lam_lo if FR['slope'] < 0 else lam_hi
o += fit_line(FL, 'left', lfar_L) + fit_line(FR, 'right', lfar_R)
o += '<line class="lamc" data-lam="%.12g" x1="%.2f" y1="%d" x2="%.2f" y2="%d" stroke="#222" stroke-width="1" stroke-dasharray="4 3"/>\n' % (LAMC, xm(LAMC), Y0, xm(LAMC), Y1)
for kk, lam, d in steps:
    o += circ(xm(lam), ym(math.sqrt(d)), 3.2, True, 'class="m" data-fig="5" data-kind="step" data-step="%d" data-x="%.12g" data-y="%.12g" data-d="%.12g" data-cx="%.2f" data-cy="%.2f"' % (kk, lam, math.sqrt(d), d, xm(lam), ym(math.sqrt(d))))
for sp, lam, d, ok in mids:
    cx, cy = xm(lam), ym(math.sqrt(d))
    if ok:
        o += circ(cx, cy, 3.2, False, 'class="m" data-fig="5" data-kind="mid" data-step="%d-%d" data-x="%.12g" data-y="%.12g" data-d="%.12g" data-cx="%.2f" data-cy="%.2f"' % (sp[0], sp[1], lam, math.sqrt(d), d, cx, cy))
    else:
        a = 4.2
        o += '<g class="m" data-fig="5" data-kind="mid-not-witnessed" data-step="%d-%d" data-x="%.12g" data-y="%.12g" data-d="%.12g" data-cx="%.2f" data-cy="%.2f" stroke="#222" stroke-width="1.8"><path d="M%.2f,%.2f L%.2f,%.2f M%.2f,%.2f L%.2f,%.2f"/></g>\n' % (sp[0], sp[1], lam, math.sqrt(d), d, cx, cy, cx - a, cy - a, cx + a, cy + a, cx - a, cy + a, cx + a, cy - a)
# legend below the plot, outside the data
ly = H3 - 10
o += circ(X0 + 6, ly - 16, 3.2, True) + txt(X0 + 16, ly - 12.5, 'accepted step', 10.5)
o += circ(X0 + 120, ly - 16, 3.2, False) + txt(X0 + 130, ly - 12.5, 're-closed midpoint', 10.5)
a = 4.0; xx = X0 + 250
o += '<path d="M%g,%g L%g,%g M%g,%g L%g,%g" stroke="#222" stroke-width="1.8"/>\n' % (xx - a, ly - 16 - a, xx + a, ly - 16 + a, xx - a, ly - 16 + a, xx + a, ly - 16 - a) + txt(xx + 10, ly - 12.5, 'midpoint not checked', 10.5)
o += '<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="#666" stroke-width="1.1"/>\n' % (X0, ly + 1, X0 + 20, ly + 1) + txt(X0 + 26, ly + 4.5, 'fitted line on each side', 10.5)
o += '<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="#222" stroke-width="1" stroke-dasharray="4 3"/>\n' % (X0 + 190, ly + 1, X0 + 210, ly + 1) + '<text x="%g" y="%g" font-size="10.5" fill="#111">\u03bb<tspan baseline-shift="sub" font-size="8">c</tspan> = %.8f</text>\n' % (X0 + 216, ly + 4.5, LAMC)
o += '</svg>\n'
open(HERE + 'figure3.svg', 'w', encoding='utf-8', newline='\n').write(o)
# ---------------------------------------------------------------- F1 (new): the orbit of t35 - at accepted step 10 with an inset of the close pair
OR = J('extra/orbit-track-t35m-step10.json')
S = OR['samples']; TE = OR['t_encounter']; TT = OR['period']
st0 = OR['start']; cm = st0['lam'] / 3
START = [(-1 - cm, 0.0), (st0['lam'] - cm, 0.0), (1 - cm, 0.0)]
BODY_COL = ['#1b6ca8', '#d95f02', '#555555']
def track(b):
    pts = [(0.0, START[b][0], START[b][1])] + [(r['t'], r['x'][2 * b], r['x'][2 * b + 1]) for r in S]
    return pts
def lin_ticks(lo, hi, step):
    v = math.ceil(lo / step - 1e-9) * step; out = []
    while v <= hi + 1e-9: out.append(round(v, 10)); v += step
    return out
def axis_ticks(o, panel, axis, vals, mapf, y0=None, x0=None, dec=1, size=9.5, length=4, ax_pos=None, right=False):
    for v in vals:
        p = mapf(v)
        lab = ('%.*f' % (dec, v)).replace('-', MINUS)
        if abs(v) < 1e-12: lab = '%.*f' % (dec, 0.0)
        if axis == 'x':
            o += '<line class="tick" data-panel="%s" data-axis="x" data-value="%.8f" data-px="%.2f" x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="#222" stroke-width="1"/>\n' % (panel, v, p, p, ax_pos, p, ax_pos + length)
            o += txt(p, ax_pos + length + 10.5, lab, size, 'middle', extra='data-panel="%s" data-axis="%s" data-label-for="%.8f" data-dec="%d"' % (panel, axis, v, dec))
        else:
            o += '<line class="tick" data-panel="%s" data-axis="y" data-value="%.8f" data-py="%.2f" x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="#222" stroke-width="1"/>\n' % (panel, v, p, ax_pos, p, ax_pos + (length if right else -length), p)
            o += txt(ax_pos + (length + 3 if right else -length - 3), p + 3.4, lab, size, 'start' if right else 'end', extra='data-panel="%s" data-axis="%s" data-label-for="%.8f" data-dec="%d"' % (panel, axis, v, dec))
    return o
W1N, H1N = 612, 400
o = head(W1N, H1N, 150, 'F1: the orbit of t35 - at accepted step 10 over one period, from the stored start values with src/ias/reg.js (tools/orbit-track.mjs); inset: the tracks of the two bodies that pass at 7.3e-10 near the passage. Source: data/deep/extra/orbit-track-t35m-step10.json, data/deep/traces/t35m.json')
XL, XR, YB, YT = -1.3, 0.85, -1.15, 0.8
PX0, PX1, PY0, PY1 = 56, 420, 12, 12 + (YT - YB) * (420 - 56) / (XR - XL)
kx = (PX1 - PX0) / (XR - XL)
mx = lambda x: PX0 + (x - XL) * kx
my = lambda y: PY1 - (y - YB) * kx
o += '<rect x="%g" y="%g" width="%g" height="%.2f" fill="none" stroke="#222" stroke-width="1"/>\n' % (PX0, PY0, PX1 - PX0, PY1 - PY0)
o = axis_ticks(o, 'main', 'x', lin_ticks(XL, XR, 0.5), mx, ax_pos=PY1)
o = axis_ticks(o, 'main', 'y', lin_ticks(YB, YT, 0.5), my, ax_pos=PX0)
o += txt((PX0 + PX1) / 2, PY1 + 30, 'x', 11, 'middle') + txt(PX0 - 40, (PY0 + PY1) / 2, 'y', 11, 'middle', extra='transform="rotate(-90 %g %g)"' % (PX0 - 40, (PY0 + PY1) / 2))
for b in range(3):
    pts = track(b)
    o += '<polyline class="track" data-fig="1" data-panel="main" data-body="%d" data-n="%d" fill="none" stroke="%s" stroke-width="1.3" stroke-linejoin="round" points="%s"/>\n' % (b, len(pts), BODY_COL[b], ' '.join('%.3f,%.3f' % (mx(x), my(y)) for _, x, y in pts))
for b in range(3):
    x, y = START[b]
    o += '<circle class="m" data-fig="1" data-panel="main" data-kind="start" data-body="%d" data-x="%.12g" data-y="%.12g" data-cx="%.3f" data-cy="%.3f" cx="%.3f" cy="%.3f" r="3.6" fill="%s" stroke="#111" stroke-width="0.8"/>\n' % (b, x, y, mx(x), my(y), mx(x), my(y), BODY_COL[b])
    o += txt(mx(x) + (-9 if b == 0 else (-6 if b == 2 else 6)), my(y) - 6, str(b + 1), 10.5, 'middle' if b == 0 else ('end' if b == 2 else 'start'), weight='bold', fill=BODY_COL[b])
# the two passages of the pair (the orbit is mirror symmetric, so the pair passes twice per period)
def pair_point(r): return ((r['x'][0] + r['x'][2]) / 2, (r['x'][1] + r['x'][3]) / 2)
rE = next(r for r in S if r['t'] == TE)
px_, py_ = pair_point(rE)
rM = min((r for r in S if abs(r['t'] - (TT - TE)) < 2e-3 and r['d'][0] < 0.05), key=lambda r: r['d'][0]) if any(abs(r['t'] - (TT - TE)) < 2e-3 and r['d'][0] < 0.05 for r in S) else None
o += '<circle class="m" data-fig="1" data-panel="main" data-kind="passage" data-x="%.12g" data-y="%.12g" data-cx="%.3f" data-cy="%.3f" cx="%.3f" cy="%.3f" r="6" fill="none" stroke="#111" stroke-width="1"/>\n' % (px_, py_, mx(px_), my(py_), mx(px_), my(py_))
if rM is not None:
    qx, qy = pair_point(rM)
    o += '<circle class="m" data-fig="1" data-panel="main" data-kind="passage2" data-x="%.12g" data-y="%.12g" data-cx="%.3f" data-cy="%.3f" cx="%.3f" cy="%.3f" r="6" fill="none" stroke="#111" stroke-width="1" stroke-dasharray="2 2"/>\n' % (qx, qy, mx(qx), my(qy), mx(qx), my(qy))
# inset
IX0, IX1, IY0, IY1 = 438, 548, 70, 100
WINT = 0.03
win = [r for r in S if abs(r['t'] - TE) <= WINT]
IXL, IXR = -0.13, 0.13; IYB, IYT = -0.065, 0.065
kix = (IX1 - IX0) / (IXR - IXL); IY1 = IY0 + (IYT - IYB) * kix
imx = lambda x: IX0 + (x - IXL) * kix
imy = lambda y: IY1 - (y - IYB) * kix
o += '<rect data-window-t="%g" x="%g" y="%g" width="%g" height="%.2f" fill="#fff" stroke="#222" stroke-width="1"/>\n' % (WINT, IX0, IY0, IX1 - IX0, IY1 - IY0)
# the window of the inset in the main plot and its connection
wx0, wx1, wy0, wy1 = px_ + IXL, px_ + IXR, py_ + IYB, py_ + IYT
o += '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" fill="none" stroke="#111" stroke-width="0.8"/>\n' % (mx(wx0), my(wy1), mx(wx1) - mx(wx0), my(wy0) - my(wy1))
o += '<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="#111" stroke-width="0.6" stroke-dasharray="3 2"/>\n' % (mx(wx1), my(wy1), IX0, IY0)
o += '<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="#111" stroke-width="0.6" stroke-dasharray="3 2"/>\n' % (mx(wx1), my(wy0), IX0, IY1)
o = axis_ticks(o, 'inset', 'x', [-0.1, 0.0, 0.1], imx, ax_pos=IY1, dec=1, size=8.5)
o = axis_ticks(o, 'inset', 'y', [-0.05, 0.0, 0.05], imy, ax_pos=IX1, dec=2, size=8.5, right=True)
for b in (0, 1):
    pts = [(r['t'], r['x'][2 * b] - px_, r['x'][2 * b + 1] - py_) for r in win]
    o += '<polyline class="track" data-fig="1" data-panel="inset" data-body="%d" data-n="%d" fill="none" stroke="%s" stroke-width="1.3" stroke-linejoin="round" points="%s"/>\n' % (b, len(pts), BODY_COL[b], ' '.join('%.3f,%.3f' % (imx(x), imy(y)) for _, x, y in pts))
o += txt(IX1, IY1 + 29, 'offset from the passage', 9.5, 'end') + txt(IX1 + 54, (IY0 + IY1) / 2, 'offset', 9.5, 'middle', extra='transform="rotate(-90 %g %g)"' % (IX1 + 54, (IY0 + IY1) / 2))
o += txt(IX0, IY0 - 22, 'passage of bodies 1 and 2,', 9.5) + txt(IX0, IY0 - 10, 'checked distance ' + fe(next(r for r in J('extra/pericentres.json')['points'] if r['id'] == 't35m-u0010')['osculating_float'], 1), 9.5)
# legend below
ly = H1N - 8
for b in range(3):
    xx = PX0 + 8 + b * 92
    o += '<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="%s" stroke-width="1.6"/>\n' % (xx, ly - 3, xx + 18, ly - 3, BODY_COL[b]) + txt(xx + 24, ly, 'body %d' % (b + 1), 10.5)
o += '<circle cx="%g" cy="%g" r="3.6" fill="#999" stroke="#111" stroke-width="0.8"/>' % (PX0 + 290, ly - 3) + txt(PX0 + 298, ly, 'position at time 0', 10.5)
o += '</svg>\n'
open(HERE + 'figure1.svg', 'w', encoding='utf-8', newline='\n').write(o)
print('written figure1.svg: period %.6f, passage at t = %.6f, point (%.5f, %.5f), window %d samples' % (TT, TE, px_, py_, len(win)))

# ---------------------------------------------------------------- F4 (new): progress in lam against the accepted steps of t35 -, t44 - and t81 -, with the hand-over steps
LP = J('extra/lambda-progress.json')['traces']; HOV = J('extra/handover.json')['checks']['traces']
def accepted_lams(l):
    t = J('traces/%s.json' % l); el = sorted(list(t['points']) + list(t['unrecorded']), key=lambda e: e['step']); return [e['lam'] for e in el]
CURVES = [('t35m', 't35 ' + MINUS, '#1b6ca8'), ('t44m', 't44 ' + MINUS, '#d95f02'), ('t81m', 't81 ' + MINUS, '#555555')]
W9, H9 = 540, 330
XA0, XA1, YA0, YA1 = 64, 505, 22, 255
NMAX = 2000.0
fx = lambda n: XA0 + math.log10(n) / math.log10(NMAX) * (XA1 - XA0)
fy = lambda v: YA1 - v * (YA1 - YA0)
o = head(W9, H9, 150, 'F4: fraction of the whole range of lambda reached after the n-th accepted step for t35 -, t44 - and t81 - (logarithmic horizontal axis). Source: data/deep/traces/*.json, data/deep/extra/handover.json, data/deep/extra/lambda-progress.json')
o += '<rect x="%g" y="%g" width="%g" height="%g" fill="none" stroke="#222" stroke-width="1"/>\n' % (XA0, YA0, XA1 - XA0, YA1 - YA0)
for v in (0, 0.2, 0.4, 0.6, 0.8, 1.0):
    py = fy(v)
    o += '<line class="tick" data-panel="p" data-axis="y" data-value="%.6f" data-py="%.2f" x1="%d" y1="%.2f" x2="%d" y2="%.2f" stroke="#222" stroke-width="1"/>\n' % (v, py, XA0 - 4, py, XA0, py)
    o += txt(XA0 - 7, py + 3.5, '%.1f' % v, 10, 'end', extra='data-panel="p" data-label-for="%.6f"' % v)
for e in (0, 1, 2, 3):
    n = 10.0 ** e; px = fx(n)
    o += '<line class="tick" data-panel="p" data-axis="x" data-value="%.6f" data-px="%.2f" x1="%.2f" y1="%d" x2="%.2f" y2="%d" stroke="#222" stroke-width="1"/>\n' % (n, px, px, YA1, px, YA1 + 4)
    o += txt(px, YA1 + 16, '%d' % n, 10, 'middle', extra='data-panel="p" data-label-for="%.6f"' % n)
o += txt((XA0 + XA1) / 2, YA1 + 34, 'accepted steps', 11, 'middle')
o += txt(16, (YA0 + YA1) / 2, 'fraction of the range of λ reached', 11, 'middle', extra='transform="rotate(-90 16 %g)"' % ((YA0 + YA1) / 2))
o += '<line x1="%g" y1="%.2f" x2="%g" y2="%.2f" stroke="#bbb" stroke-width="0.8" stroke-dasharray="3 3"/>\n' % (XA0, fy(0.99), XA1, fy(0.99))
o += txt(XA1 - 4, fy(0.99) + 11, '0.99', 9.5, 'end', fill='#777')
for l, name, col in CURVES:
    lam = accepted_lams(l); R = lam[-1] - lam[0]
    frac = [(lam[k] - lam[0]) / R for k in range(len(lam))]
    assert abs(frac[10 - 1] - LP[l]['fraction_at_accepted_step']['10']) < 1e-9 or abs(frac[10] - LP[l]['fraction_at_accepted_step']['10']) < 1e-9
    ns = sorted(set([k for k in range(1, 60)] + [int(round(10 ** (e / 40.0))) for e in range(int(40 * 1.6), int(40 * math.log10(len(lam))) + 1)] + [len(lam)]))
    ns = [k for k in ns if 1 <= k <= len(lam)]
    pts = ' '.join('%.2f,%.2f' % (fx(k), fy(frac[k - 1])) for k in ns)
    o += '<polyline class="curve" data-fig="9" data-trace="%s" data-n="%d" fill="none" stroke="%s" stroke-width="1.6" stroke-linejoin="round" points="%s"/>\n' % (l, len(ns), col, pts)
    k99 = LP[l]['step_at']['0.99']['accepted_index']
    o += '<circle class="m" data-fig="9" data-trace="%s" data-kind="99" data-x="%d" data-y="%.12g" data-cx="%.2f" data-cy="%.2f" cx="%.2f" cy="%.2f" r="3.2" fill="%s" stroke="#111" stroke-width="0.8"/>\n' % (l, k99, frac[k99 - 1], fx(k99), fy(frac[k99 - 1]), fx(k99), fy(frac[k99 - 1]), col)
    if l in HOV:
        kh = HOV[l]['a_rule']['accepted_step']
        o += '<line class="hand" data-fig="9" data-trace="%s" data-x="%d" data-cx="%.2f" x1="%.2f" y1="%g" x2="%.2f" y2="%g" stroke="%s" stroke-width="1" stroke-dasharray="4 3"/>\n' % (l, kh, fx(kh), fx(kh), YA0, fx(kh), YA1, col)
ly = H9 - 12
for i, (l, name, col) in enumerate(CURVES):
    xx = XA0 + 10 + i * 100
    o += '<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="%s" stroke-width="1.8"/>\n' % (xx, ly - 3, xx + 22, ly - 3, col) + txt(xx + 28, ly, name, 10.5)
o += '<circle cx="%g" cy="%g" r="3.2" fill="#999" stroke="#111" stroke-width="0.8"/>' % (XA0 + 322, ly - 3) + txt(XA0 + 330, ly, '99 %', 10.5)
o += '<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="#444" stroke-width="1" stroke-dasharray="4 3"/>\n' % (XA0 + 372, ly - 3, XA0 + 392, ly - 3) + txt(XA0 + 398, ly, 'hand-over', 10.5)
o += '</svg>\n'
open(HERE + 'figure4.svg', 'w', encoding='utf-8', newline='\n').write(o)
print('written figure4.svg')
