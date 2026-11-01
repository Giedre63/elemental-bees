// Clothes that sit on the bee instead of floating in front of her.
//
// The clothes art is drawn flat, front-on, like a shop picture. Pasted over a
// round bee seen from the side it reads as a sticker. So for body clothes we
// take the item's own knit or leaf pattern and paint it into the bee's body,
// pixel by pixel: clipped to her silhouette, kept behind the face and under the
// wings, shaded round, with ribbing where a sweater would have it. It is done
// per animation frame, so the clothes move with her, and cached.
import { sprite } from './assets.js';

// crop: the part of the item art that is just fabric, [x0, y0, x1, y1] on 48px.
// tile: the fabric repeats at its own pixel size rather than being stretched.
const WRAP = (() => {
  // Cloaks are painted onto the bee's back from their own fabric, so each one
  // keeps its colour and weave. Hats stay as overlays: they sit on her head.
  const cloaks = ['leafcloak', 'strawcloak', 'mosscloak', 'elytra', 'feathercloak', 'mothcloak', 'ambercape'];
  const o = {};
  for (const id of cloaks) o[id] = { crop: [12, 14, 36, 36], tile: true, region: 'back' };
  return o;
})();
const hex = s => [1, 3, 5].map(k => parseInt(s.slice(k, k + 2), 16));

// The wings share their pale blue with the Gale bee's body and the Tide bee's
// stripes, so colour alone can't tell them apart. A wing is that palette and
// in the top of the frame.
const WING = new Set(['218,237,244', '204,210,207', '184,197,197', '255,255,255']);
export const wraps = id => !!WRAP[id];

const cache = new Map();
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;

function pixels(im) {
  const cv = document.createElement('canvas');
  cv.width = im.width; cv.height = im.height;
  const g = cv.getContext('2d');
  g.drawImage(im, 0, 0);
  return { cv, g, d: g.getImageData(0, 0, im.width, im.height) };
}

let texCache = new Map();
function texture(id) {
  if (texCache.has(id)) return texCache.get(id);
  const im = sprite('fit_' + id);
  const t = im ? pixels(im).d : null;
  texCache.set(id, t);
  return t;
}

// The bee in a frame: where the body is, and where the face starts. Measured
// from the pixels so it follows the bob of each frame.
function measure(d, W, H) {
  const A = d.data;
  const wingish = i => WING.has(A[i] + ',' + A[i + 1] + ',' + A[i + 2]);
  const rows = [];
  for (let y = 0; y < H; y++) {
    let n = 0, l = W, rgt = -1;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (A[i + 3] > 40 && !(wingish(i) && y < H * 0.45)) { n++; if (x < l) l = x; if (x > rgt) rgt = x; }
    }
    rows.push({ n, l, r: rgt });
  }
  const max = Math.max(...rows.map(r => r.n));
  // the body is the rows that are wide; crests, antennae and legs are not
  let top = rows.findIndex(r => r.n > max * 0.55);
  let bot = H - 1 - [...rows].reverse().findIndex(r => r.n > max * 0.55);
  top = Math.max(0, top - 4); bot = Math.min(H - 1, bot + 2);
  let left = W, right = 0;
  for (let y = top; y <= bot; y++) if (rows[y].n) { left = Math.min(left, rows[y].l); right = Math.max(right, rows[y].r); }
  const cx = (left + right) / 2, cy = (top + bot) / 2;
  const w = right - left;
  // face starts a little before halfway, leaning back towards the top of the head
  const collar = y => left + w * 0.5 - (y - cy) * 0.3;
  const wing = i => wingish(i) && Math.floor(i / 4 / W) < cy - (bot - top) * 0.12;
  return { wing, top, bot, left, right, cx, cy, w, h: bot - top, collar };
}

function inRegion(spec, m, x, y) {
  const c = m.collar(y);
  switch (spec.region) {
    case 'body':  return x < c && y >= m.top;
    case 'back': {
      // a cloak hangs off her back: behind the face line, from the shoulders
      // down, with a soft wavy hem rather than a straight cut
      const hem = m.cy + m.h * 0.30 + Math.round(Math.sin(x * 0.9) * 2.2);
      return x < c - 3 && y > m.top + m.h * 0.22 && y < hem;
    }
    case 'belly': {
      // a rounded bib rising from the bottom front, stopping above the legs
      if (y > m.bot - 4) return false;
      const ax = c + 3, ay = m.bot - 3, rx = m.w * 0.34, ry = m.h * 0.5;
      return ((x - ax) / rx) ** 2 + ((y - ay) / ry) ** 2 < 1;
    }
    case 'neck':  return Math.abs(x - c) <= 2.5 && y > m.top + 3;
  }
  return false;
}

export function worn(im, id) {
  const spec = WRAP[id];
  if (!im || !spec) return null;
  const key = im.src + '|' + id;
  if (cache.has(key)) return cache.get(key);

  const W = im.width, H = im.height;
  const { cv, g, d } = pixels(im);
  const A = d.data;
  const m = measure(d, W, H);
  const tex = spec.crop && texture(id);

  // pass 1: which pixels are fabric
  const fab = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (A[i + 3] < 40 || m.wing(i)) continue;
    if (inRegion(spec, m, x, y)) fab[y * W + x] = 1;
  }
  let fx0 = W, fx1 = 0, fy0 = H, fy1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fab[y * W + x]) {
    fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); fy0 = Math.min(fy0, y); fy1 = Math.max(fy1, y);
  }
  if (fx1 < fx0) { cache.set(key, im); return im; }

  const edge = (x, y) => {
    const i = y * W + x;
    const solid = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && A[(yy * W + xx) * 4 + 3] > 40;
    // a fabric pixel on the bee's own outline stays outline
    if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) return 2;
    if (!fab[i - 1] || !fab[i + 1] || !fab[i - W] || !fab[i + W]) return 1;
    return 0;
  };

  // pass 2: paint
  for (let y = fy0; y <= fy1; y++) for (let x = fx0; x <= fx1; x++) {
    if (!fab[y * W + x]) continue;
    const i = (y * W + x) * 4;
    const e = edge(x, y);
    if (e === 2) continue;
    const u = (x - fx0) / Math.max(1, fx1 - fx0), v = (y - fy0) / Math.max(1, fy1 - fy0);
    let r, gg, b;
    if (spec.stripes) {
      [r, gg, b] = hex(spec.stripes[Math.floor((y + x * 0.3) / 3) % 2]);
    } else if (spec.fill) {
      [r, gg, b] = hex(y >= fy1 - 1 ? ((x + y) % 2 ? spec.frill : spec.fill)
                     : y === fy0 ? spec.strap : spec.fill);
    } else {
      const [x0, y0, x1, y1] = spec.crop;
      const tx = spec.tile ? x0 + ((x - fx0) % (x1 - x0)) : Math.min(x1 - 1, Math.floor(x0 + u * (x1 - x0)));
      const ty = spec.tile ? y0 + ((y - fy0) % (y1 - y0)) : Math.min(y1 - 1, Math.floor(y0 + v * (y1 - y0)));
      const ti = (ty * 48 + tx) * 4;
      if (!tex || tex.data[ti + 3] < 40) { r = 200; gg = 180; b = 150; }
      else { r = tex.data[ti]; gg = tex.data[ti + 1]; b = tex.data[ti + 2]; }
    }
    // ribbing: a sweater has a knitted collar where the head comes out, and a hem
    if (spec.rib) {
      const c = m.collar(y);
      const collarBand = x >= c - 3;
      const hem = y >= fy1 - 2;
      if (collarBand || hem) [r, gg, b] = hex((collarBand ? y : x) % 2 ? spec.rib : spec.ribDark);
    }
    // round it: lit from the top left, falling off to the bottom right
    const ny = (y - m.top) / Math.max(1, m.h), nx = (x - m.left) / Math.max(1, m.w);
    let s = spec.fill ? 1.02 - ny * 0.12 : 1.1 - ny * 0.3 - nx * 0.08;
    if (e === 1) s *= 0.74;
    A[i] = Math.min(255, r * s); A[i + 1] = Math.min(255, gg * s); A[i + 2] = Math.min(255, b * s);
  }

  // an apron hangs from a strap over the shoulder
  if (spec.region === 'belly') {
    for (let y = m.top + 4; y < fy0; y++) {
      const x = Math.round(m.collar(y) + 1);
      const i = (y * W + x) * 4;
      if (A[i + 3] > 40 && !m.wing(i)) [A[i], A[i + 1], A[i + 2]] = hex(spec.strap);
    }
  }

  // a scarf has a tail
  if (spec.region === 'neck') {
    const tx = Math.round(m.collar(m.cy) - 3);
    for (let y = Math.round(m.cy); y < Math.min(H - 1, m.bot + 5); y++) {
      for (let x = tx - 1; x <= tx + 2; x++) {
        const i = (y * W + x) * 4;
        const outline = x === tx - 1 || x === tx + 2 || y === Math.min(H - 2, m.bot + 4);
        const [r, gg, b] = outline ? [42, 29, 22] : hex(spec.stripes[Math.floor(y / 3) % 2]);
        A[i] = r; A[i + 1] = gg; A[i + 2] = b; A[i + 3] = 255;
      }
    }
  }

  g.putImageData(d, 0, 0);
  cache.set(key, cv);
  return cv;
}

// For the DOM: the bee's still frame wearing this, as a data URL.
const urls = new Map();
export function wornUrl(el, id) {
  const k = el + '|' + id;
  if (urls.has(k)) return urls.get(k);
  const cv = worn(sprite('bee_' + el), id);
  const u = cv && cv.toDataURL ? cv.toDataURL() : '';
  urls.set(k, u);
  return u;
}
