# runs tools/refine-mp.py on every orbit of data/orbit-table.json with a given closure tier, a few at a time, with a time limit each
# python tools/refine-many.py weak [workers] [seconds] [digits]
# python tools/refine-many.py reliable 10 7200 30 skipstable     the reliable tier without the stable orbits that are refined already (data/refined/T*.json)
import json, os, subprocess, sys, time
tier = sys.argv[1]
workers = int(sys.argv[2]) if len(sys.argv) > 2 else 4
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 1500
digits = sys.argv[4] if len(sys.argv) > 4 else '30'
skipstable = len(sys.argv) > 5 and sys.argv[5] == 'skipstable'
rows = [r for r in json.load(open('data/orbit-table.json')) if r['closureTier'] == tier and not (skipstable and r['status'] == 'stable')]
os.makedirs('data/refined/' + tier, exist_ok=True)
queue = list(enumerate(rows))
running = []
done = 0
while queue or running:
    while queue and len(running) < workers:
        i, r = queue.pop(0)
        name = 'data/refined/%s/%02d_T%.3f' % (tier, i, r['Tstar'])
        if os.path.exists(name + '.json'):
            continue
        p = subprocess.Popen(['python', 'tools/refine-mp.py', repr(r['u1']), repr(r['u2']), repr(r['lam']), repr(r['t']), digits, name + '.json'], stdout=open(name + '.log', 'w'), stderr=subprocess.STDOUT)
        running.append((p, time.time(), name))
    for item in list(running):
        p, t0, name = item
        if p.poll() is not None:
            running.remove(item); done += 1
            print('finished', name, 'exit', p.returncode, flush=True)
        elif time.time() - t0 > limit:
            p.kill(); running.remove(item); done += 1
            open(name + '.log', 'a').write('\nkilled after %d s\n' % limit)
            print('killed', name, flush=True)
    time.sleep(5)
print('all done,', done)
