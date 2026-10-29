// tools/family-follow.mjs (the default route, Dormand-Prince) with the recorder of src/ias/recorder.js on: besides OUT.json it writes OUT.json.diag.jsonl, one line per attempt of the corrector (step length h,
// the residual at the start of every Newton iteration, iterations, ok, why, outcome, seconds). Nothing else changes: the arguments are those of tools/family-follow.mjs.
// node tools/dp45-attempts.mjs OUT.json DIR minutes u1 u2 lam t [label] [pieces]
//   python tools/dp45-attempts.py OUT.json.diag.jsonl OUT2.json   reads the attempts and writes the residual of each (OUT2.json must be new)
import fs from 'fs';
import { startRecorder } from '../src/ias/recorder.js';

const outFile = process.argv[2];
if (!outFile) { console.error('usage: node tools/dp45-attempts.mjs OUT.json DIR minutes u1 u2 lam t [label] [pieces]'); process.exit(2); }
if (fs.existsSync(outFile + '.diag.jsonl')) { console.error('exists, not overwriting: ' + outFile + '.diag.jsonl'); process.exit(2); }
const recorder = startRecorder(outFile);
process.on('exit', () => { try { recorder.flush(); } catch (e) {} });
await import('./family-follow.mjs');
