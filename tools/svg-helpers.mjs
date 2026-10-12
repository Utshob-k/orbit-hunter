// tiny SVG plotting helpers (no libraries); used by figures.mjs
export const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function niceTicks(lo, hi, want = 6) {
  const span = hi - lo, raw = span / want, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  const step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  const out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toPrecision(12));
  return { ticks: out, step };
}
const fmt = (v, step) => {
  const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  return Math.abs(v) < step * 1e-6 ? '0' : Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(1) : v.toFixed(Math.min(d, 6));
};

// a panel: box at (x0, y0, w, h) in the svg, data ranges [xl, xh] x [yl, yh]
export function panel(x0, y0, w, h, xl, xh, yl, yh, opts = {}) {
  const sx = (x) => x0 + ((x - xl) / (xh - xl)) * w, sy = (y) => y0 + h - ((y - yl) / (yh - yl)) * h;
  const parts = [];
  parts.push(`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="none" stroke="#444" stroke-width="1"/>`);
  const tx = niceTicks(xl, xh, opts.xticks || 6), ty = niceTicks(yl, yh, opts.yticks || 6);
  for (const v of tx.ticks) {
    parts.push(`<line x1="${sx(v)}" y1="${y0}" x2="${sx(v)}" y2="${y0 + h}" stroke="#ddd"/>`);
    parts.push(`<text x="${sx(v)}" y="${y0 + h + 15}" font-size="11" text-anchor="middle" fill="#222">${esc(fmt(v, tx.step))}</text>`);
  }
  for (const v of ty.ticks) {
    parts.push(`<line x1="${x0}" y1="${sy(v)}" x2="${x0 + w}" y2="${sy(v)}" stroke="#ddd"/>`);
    parts.push(`<text x="${x0 - 5}" y="${sy(v) + 4}" font-size="11" text-anchor="end" fill="#222">${esc(fmt(v, ty.step))}</text>`);
  }
  if (opts.xlabel) parts.push(`<text x="${x0 + w / 2}" y="${y0 + h + 32}" font-size="12" text-anchor="middle" fill="#111">${esc(opts.xlabel)}</text>`);
  if (opts.ylabel) parts.push(`<text transform="translate(${x0 - 46} ${y0 + h / 2}) rotate(-90)" font-size="12" text-anchor="middle" fill="#111">${esc(opts.ylabel)}</text>`);
  if (opts.title) parts.push(`<text x="${x0 + w / 2}" y="${y0 - 8}" font-size="12.5" text-anchor="middle" font-weight="bold" fill="#111">${esc(opts.title)}</text>`);
  const clip = `clip${Math.round(x0)}_${Math.round(y0)}`;
  const body = [];
  const api = {
    sx, sy,
    line(pts, color = '#1f4e9e', width = 1.4, dash = '') {
      const d = pts.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])).map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(2) + ' ' + sy(p[1]).toFixed(2)).join(' ');
      body.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
    },
    dots(pts, color = '#b2182b', r = 3, hollow = false) {
      for (const p of pts) if (Number.isFinite(p[0]) && Number.isFinite(p[1])) body.push(`<circle cx="${sx(p[0]).toFixed(2)}" cy="${sy(p[1]).toFixed(2)}" r="${r}" fill="${hollow ? 'white' : color}" stroke="${color}" stroke-width="1.2"/>`);
    },
    hline(y, color = '#888', dash = '4 3') { body.push(`<line x1="${x0}" y1="${sy(y)}" x2="${x0 + w}" y2="${sy(y)}" stroke="${color}" stroke-dasharray="${dash}"/>`); },
    vband(xa, xb, color = '#eef3ff') { body.push(`<rect x="${sx(xa)}" y="${y0}" width="${sx(xb) - sx(xa)}" height="${h}" fill="${color}"/>`); },
    text(x, y, t, size = 11, color = '#111', anchor = 'start') { body.push(`<text x="${sx(x).toFixed(2)}" y="${sy(y).toFixed(2)}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${esc(t)}</text>`); },
    label(px, py, t, size = 11, color = '#111', anchor = 'start') { body.push(`<text x="${px}" y="${py}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${esc(t)}</text>`); },
    svg() {
      return `<defs><clipPath id="${clip}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}"/></clipPath></defs>` + parts.join('\n') + `<g clip-path="url(#${clip})">` + body.join('\n') + '</g>';
    },
  };
  return api;
}
export const wrap = (w, h, inner, title = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Arial, Helvetica, sans-serif"><rect width="${w}" height="${h}" fill="white"/>${title ? `<title>${esc(title)}</title>` : ''}\n${inner}\n</svg>\n`;
