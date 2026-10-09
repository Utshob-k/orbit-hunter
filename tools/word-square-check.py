# could the syzygy word of my T* = 72.465 orbit (primitive word (01010212)^3, 24 letters) be an orbit with 12 alignments per period run twice (SN.13 of the atlas)?
# the second period would repeat the first: word = B B with |B| = 12. the word is read as a cyclic sequence (any starting syzygy), also after relabelling the bodies
# (a permutation of the letters 0, 1, 2) and after reversing the time (the word read backwards).
# python tools/word-square-check.py
import itertools, sys
w = '01010212' * 3
n = len(w)
if n != 24: sys.exit('the word must have 24 letters')
def minimal_period(s):
    return next(p for p in range(1, len(s) + 1) if len(s) % p == 0 and s == s[:p] * (len(s) // p))
print('word', w, 'length', n, 'minimal period of the cyclic word:', minimal_period(w))
found = []
variants = [('forward', w), ('reversed time', w[::-1])]
for name, v in variants:
    for r in range(n):
        u = v[r:] + v[:r]
        a, b = u[:12], u[12:]
        for perm in itertools.permutations('012'):
            m = dict(zip('012', perm))
            if ''.join(m[c] for c in a) == b: found.append((name, r, ''.join(perm)))
print('ways to write the word as B followed by a relabelled B (any rotation, any relabelling, either time direction):', len(found))
if found: print(found[:5])
# the same without relabelling
plain = [(name, r) for name, v in variants for r in range(n) if (v[r:] + v[:r])[:12] == (v[r:] + v[:r])[12:]]
print('ways without relabelling (B B):', len(plain))
# Fine and Wilf: a cyclic word with periods 8 and 12 and length 24 has period gcd = 4
print('does the word have period 4?', w == w[:4] * 6)
