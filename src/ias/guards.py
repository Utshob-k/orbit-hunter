# analysis of one piece for the guards of the IAS15 bridge. A piece is sampled at its start and at every step end of IAS15: (t, d01, d02, d12).
# d1 <= d2 <= d3 are the three pair distances at one instant. A piece is an encounter piece if its smallest sampled pair distance is below 1e-3.
# The pericentre distance d1 of an encounter piece is the smallest sampled one, improved by a parabola through the squared distance of that pair at three
# consecutive samples; d2 at the pericentre is the second distance at that sample.
#   G1a trips if d2 < 0.02 at any sample with d1 < 1e-3.
#   G1b trips if d2 < ratio * d1 at the pericentre (ratio = 390 by default).
#   G2  trips if the second smallest of the three per-pair minima is below 0.02.
import math

PAIRS = [(0, 1), (0, 2), (1, 2)]
ENCOUNTER_BELOW = 1e-3
SECOND_BELOW = 0.02
DEFAULT_RATIO = 390.0


def pd(x):
    # the three pair distances of a state x = x0,y0,x1,y1,x2,y2,vx0,... (positions first)
    return [math.hypot(x[2 * j] - x[2 * i], x[2 * j + 1] - x[2 * i + 1]) for i, j in PAIRS]


def analyse(samples, ratio=DEFAULT_RATIO):
    # samples: list of (t, d01, d02, d12)
    n = len(samples); mins = [min(s[1 + k] for s in samples) for k in range(3)]
    srt = [sorted(s[1:]) for s in samples]
    d1min = min(s[0] for s in srt)
    out = dict(pair_minima=mins, n_samples=n, d1_min_sampled=d1min, flagged=bool(d1min < ENCOUNTER_BELOW))
    if not out['flagged']: return out
    istar = min(range(n), key=lambda i: srt[i][0])
    k = min(range(3), key=lambda q: samples[istar][1 + q])
    a1 = samples[istar][1 + k] ** 2; best = a1
    if 0 < istar < n - 1:
        t0, t1, t2 = samples[istar - 1][0], samples[istar][0], samples[istar + 1][0]
        a0, a2 = samples[istar - 1][1 + k] ** 2, samples[istar + 1][1 + k] ** 2
        h1, h2 = t1 - t0, t2 - t1
        if h1 > 0 and h2 > 0:
            c2 = ((a2 - a1) / h2 - (a1 - a0) / h1) / (h1 + h2)
            if c2 > 0:
                bb = (a2 - a0) / (h1 + h2) - c2 * (h2 - h1); tm1 = -bb / (2 * c2)
                if -h1 <= tm1 <= h2:
                    v = a1 + bb * tm1 + c2 * tm1 * tm1
                    if v > 0: best = min(best, v)
    d1p = math.sqrt(best); d2p = srt[istar][1]
    close = [s for s, sr in zip(samples, srt) if sr[0] < ENCOUNTER_BELOW]
    mind2_close = min(sorted(s[1:])[1] for s in close)
    m = sorted(mins)
    out.update(d1_peri=d1p, d2_at_peri=d2p, ratio=d2p / d1p, margin=d2p / d1p / ratio, t_peri=samples[istar][0], min_d2_while_d1_lt_1e3=mind2_close,
               g1a_trip=bool(mind2_close < SECOND_BELOW), g1b_trip=bool(d2p < ratio * d1p), g2_second_min=m[1], g2_trip=bool(m[1] < SECOND_BELOW))
    return out
