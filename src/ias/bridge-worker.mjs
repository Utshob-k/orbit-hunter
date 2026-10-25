// worker thread of the IAS15 bridge. Owns the Python child process (ias-bridge.py), reads its stdout line by line and answers the main thread through shared memory.
// ctrl: [0] flag (0 waiting, 2 done, 3 error), [1] number of values, [2] IAS15 steps, [3] id of the answer, [4] error code (0 none, 1 step floor, 2 child died; ias-bridge.py never sends code 1: an exception ends the child process, code 2).
// data: for a pieces request the 12 m end states, then the m encounter flags, then 11 analysis numbers per piece.
// Messages from the main thread: {id, starts, tau} or {kill: true} (kill the child and start a new one, after a timeout).
import { parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';

const { ctrlBuf, dataBuf, python, script, mode, guardRatio } = workerData;
const ctrl = new Int32Array(ctrlBuf), data = new Float64Array(dataBuf);
let child = null, buf = '', current = -1;

function start() {
  child = spawn(python, [script, String(mode), String(guardRatio)], { stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true });
  buf = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      let r; try { r = JSON.parse(line); } catch (e) { continue; }
      if (r.id !== current) continue;   // stale answer of an earlier request
      if (r.error) { ctrl[3] = r.id; ctrl[4] = r.error.includes('step floor') ? 1 : 2; Atomics.store(ctrl, 0, 3); Atomics.notify(ctrl, 0); continue; }
      let n = 0;
      for (const e of r.ends) for (const v of e) data[n++] = v;
      for (const f of r.enc) data[n++] = f;
      for (const a of r.ana) for (const v of a) data[n++] = v;
      ctrl[2] = r.steps; ctrl[1] = n; ctrl[3] = r.id; ctrl[4] = 0; Atomics.store(ctrl, 0, 2); Atomics.notify(ctrl, 0);
    }
  });
  const me = child;
  child.on('exit', () => { if (child === me && current >= 0 && Atomics.load(ctrl, 0) === 0) { ctrl[4] = 2; Atomics.store(ctrl, 0, 3); Atomics.notify(ctrl, 0); } });
  child.stdin.on('error', () => {});
}

start();
parentPort.on('message', (m) => {
  if (m.kill) { const old = child; child = null; try { old.kill(); } catch (e) {} start(); return; }
  current = m.id;
  child.stdin.write(JSON.stringify({ id: m.id, starts: m.starts, tau: m.tau }) + '\n');
});
