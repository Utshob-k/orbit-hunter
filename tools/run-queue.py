# runs the jobs of a queue file with at most POOL at a time, each job its own python process (tools/witness.py, tools/reclose.py and the like; tools/run-jobs.mjs runs only family-one.mjs).
# python tools/run-queue.py QUEUE.json POOL
#   QUEUE.json: a list of {"id", "cmd": [script and arguments, run as python -B ...], "out": the output file of the job, "limit_min": minutes}
#   The output of every job (stdout and stderr) goes to <out>.stdout. A job is skipped when its out file or its .stdout file exists; a job that was stopped or ran over its limit leaves one of them, so to run it again both must be moved away by hand.
#   A job still running 3 minutes after its limit_min is killed (the scripts have their own timer at the limit). The log is QUEUE.json.log. The paths are relative to the current directory.
import sys, json, os, time, subprocess

NO_WINDOW = getattr(subprocess, 'CREATE_NO_WINDOW', 0)


def main():
    qf, pool = sys.argv[1], int(sys.argv[2])
    jobs = json.load(open(qf)); log = open(qf + '.log', 'a')

    def say(s):
        log.write(time.strftime('%Y-%m-%d %H:%M:%S ') + s + '\n'); log.flush()
    running = []
    say('queue start, %d jobs, pool %d' % (len(jobs), pool))
    while jobs or running:
        still = []
        for j, p, t0 in running:
            if p.poll() is None:
                if time.time() - t0 > (j['limit_min'] + 3) * 60:
                    p.kill(); say('killed at the limit: %s' % j['id'])
                still.append((j, p, t0))
            else: say('end %s exit %s after %ds' % (j['id'], p.returncode, time.time() - t0))
        running = still
        while jobs and len(running) < pool:
            j = jobs.pop(0)
            if os.path.exists(j['out']): say('skip (out exists) ' + j['id']); continue
            if os.path.exists(j['out'] + '.stdout'): say('skip (stdout exists) ' + j['id']); continue
            o = open(j['out'] + '.stdout', 'x')
            p = subprocess.Popen([sys.executable, '-B'] + j['cmd'], stdout=o, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, creationflags=NO_WINDOW)
            say('start %s pid %d' % (j['id'], p.pid)); running.append((j, p, time.time()))
        time.sleep(1)
    say('queue end')


if __name__ == '__main__':
    main()
