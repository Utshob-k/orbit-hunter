// SPDX-License-Identifier: MIT
// builds the package of PeriCont (version 0.3.0) from the file list docs/pericont-files.txt: pericont-0.3.0.zip, with the top folder pericont-0.3.0/ inside.
// node tools/pack-pericont.mjs OUTDIR [--list docs/pericont-files.txt]
//   OUTDIR: a folder outside the repository (it is created if it does not exist); the zip must not exist there. The list has one path per line, relative to the top folder of the repository; a path that ends
//   with / is a folder and takes every file below it; a line "SOURCE => NAME" puts the file SOURCE into the package as NAME (the README of the package); lines that start with # and empty lines are skipped. A path that does not exist stops the tool. The zip is written by this tool (deflate, fixed time stamps, files
//   in the order of the list and of the names within a folder), so the same files give the same zip. It prints the number of files, the size and the sha256 of the zip.
//   To try the package: unpack it into a new folder, set ORBIT_PYTHON (README), and run npm test, npm run test:ias and node tools/deep-sample.mjs there.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--list');
const li = process.argv.indexOf('--list'), listFile = path.resolve(root, li >= 0 ? process.argv[li + 1] : 'docs/pericont-files.txt');
if (args.length !== 1) { console.error('usage: node tools/pack-pericont.mjs OUTDIR [--list docs/pericont-files.txt]'); process.exit(2); }
const outDir = path.resolve(args[0]), rel = path.relative(root, outDir);
if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) { console.error('OUTDIR must be outside the repository: ' + outDir); process.exit(2); }
const VERSION = '0.3.0', top = `pericont-${VERSION}`, zipFile = path.join(outDir, top + '.zip');
if (fs.existsSync(zipFile)) { console.error('exists, not overwriting: ' + zipFile); process.exit(2); }

const files = [];   // { src: the file in the repository, dest: its name in the package }
const add = (p, dest = p) => { if (!files.some((f) => f.dest === dest)) files.push({ src: p, dest }); };
const walk = (dir) => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) { const p = dir + '/' + e.name; if (e.isDirectory()) walk(p); else add(p); } };
for (const raw of fs.readFileSync(listFile, 'utf8').split(/\r?\n/)) {
  const [line, dest] = raw.trim().split(/\s*=>\s*/); if (!line || line.startsWith('#')) continue;
  const abs = path.join(root, line);
  if (!fs.existsSync(abs)) { console.error('in the list but not in the repository: ' + line); process.exit(1); }
  if (line.endsWith('/')) walk(line.replace(/\/$/, '')); else add(line, dest || line);
}

// a zip writer: deflate, DOS time 1980-01-01 00:00
const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const parts = [], central = []; let offset = 0;
for (const f of files) {
  const data = fs.readFileSync(path.join(root, f.src)), name = Buffer.from(top + '/' + f.dest, 'utf8'), comp = zlib.deflateRawSync(data, { level: 9 }), crc = crc32(data);
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12);
  lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
  parts.push(lh, name, comp);
  const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14);
  ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
  central.push(ch, name); offset += 30 + name.length + comp.length;
}
const cdSize = central.reduce((a, b) => a + b.length, 0);
const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...parts, ...central, end]);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(zipFile, zip, { flag: 'wx' });
console.log(`${zipFile}: ${files.length} files, ${zip.length} bytes, sha256 ${crypto.createHash('sha256').update(zip).digest('hex')}`);
