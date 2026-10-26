// worker thread of the IAS15 bridge. Owns the Python child process (ias-bridge.py), reads its stdout line by line and answers the main thread through shared memory.
// ctrl: [0] flag (0 waiting, 2 done, 3 error), [1] number of values, [2] IAS15 steps, [3] id of the answer, [4] error code (0 none, 2 the child died, could not be started or answered with an error), [5] length of the error text.
// data: for a pieces request the 12 m end states, then the m encounter flags, then 11 analysis numbers per piece; for an error answer the characters (char codes) of the error text from data[0] on.
// Messages from the main thread: {id, starts, tau} or {kill: true} (kill the child and start a new one, after a timeout or an error).
// When the child cannot be started (spawn error) or exits, at any time, the pending request is answered at once with code 2 and the reason; so is every later request until a new child has been started (the main thread asks for it after an error).
import { parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';

const { ctrlBuf, dataBuf, python, script, mode, guardRatio, firstStep, firstStepFactor } = workerData;
const ctrl = new Int32Array(ctrlBuf), data = new Float64Array(dataBuf);
let child = null, buf = '', current = -1, pending = false, alive = false, why = '';

// answer the pending request with an error (code 2 unless given) and its text
function fail(text, code = 2) {
  const n = Math.min(text.length, 240); for (let i = 0; i < n; i++) data[i] = text.charCodeAt(i);
  pending = false; ctrl[5] = n; ctrl[3] = current; ctrl[4] = code; Atomics.store(ctrl, 0, 3); Atomics.notify(ctrl, 0);
}

function start() {
  alive = true; why = '';
  child = spawn(python, [script, String(mode), String(guardRatio), String(firstStep), String(firstStepFactor)], { stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true });
  const me = child;
  buf = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      let r; try { r = JSON.parse(line); } catch (e) { continue; }
      if (r.id !== current) continue;   // stale answer of an earlier request
      if (r.error) { fail(String(r.error)); continue; }
      let n = 0;
      for (const e of r.ends) for (const v of e) data[n++] = v;
      for (const f of r.enc) data[n++] = f;
      for (const a of r.ana) for (const v of a) data[n++] = v;
      pending = false; ctrl[5] = 0; ctrl[2] = r.steps; ctrl[1] = n; ctrl[3] = r.id; ctrl[4] = 0; Atomics.store(ctrl, 0, 2); Atomics.notify(ctrl, 0);
    }
  });
  child.on('error', (e) => { if (child !== me || !alive) return; alive = false; why = 'cannot start or talk to the python executable "' + python + '": ' + e.message; if (pending) fail(why); });
  child.on('exit', (code, signal) => { if (child !== me || !alive) return; alive = false; why = 'the python process "' + python + '" exited (code ' + code + ', signal ' + signal + ')'; if (pending) fail(why); });
  child.stdin.on('error', () => {});
}

process.on('uncaughtException', (e) => { alive = false; why = 'error in the bridge worker: ' + (e && e.message); if (pending) fail(why); });
start();
parentPort.on('message', (m) => {
  if (m.kill) { const old = child; child = null; try { old.kill(); } catch (e) {} start(); return; }
  current = m.id; pending = true; ctrl[5] = 0;
  if (!alive) { fail(why || 'the python process is not running'); return; }
  child.stdin.write(JSON.stringify({ id: m.id, starts: m.starts, tau: m.tau }) + '\n');
});
