import {
  S, crewMissing, beeStars, posOf, anchor, cellPx, lotRect, lotBuyable,
  nextLandCost, canPlace, buildingLevel, decorArea, decorTargets,
} from './state.js';
import { E } from './edit.js';
import { worn, wraps } from './wear.js';
import {
  WORLD, BLOSSOM_SLOTS, LOUNGE_SLOTS, DECOR_SLOTS, STATIONS, stationDef, ELEMENTS,
  ACADEMY_POS, ACADEMY, SCATTER, BUILDINGS, BUILDING_IDS, OUTFIT_SLOTS, RARITY,
  GROUND_BITS, GRID, LOT_COLS, FOOT, HOTEL, DECOR,
} from './data.js';
import { sprite, animFrame } from './assets.js';
import { fx, pops, blossomPos, tubePos, loungePos } from './sim.js';
import { fmt } from './num.js';

const cv = document.getElementById('park');
const ctx = cv.getContext('2d');
// A landscape camera, Elvenar-style: drag to pan both ways, wheel or pinch to
// zoom. scale is device pixels per world pixel.
let scale = 1, zoom = 1, camX = 0, camY = 0, viewW = WORLD.w, viewH = WORLD.h;
const dprNow = () => Math.min(devicePixelRatio || 1, 2);

export function resize() {
  const r = cv.getBoundingClientRect();
  const dpr = dprNow();
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.height * dpr);
  setZoom(zoom || defaultZoom(r));
}

// About two and a half lots tall on screen, whatever the window.
const defaultZoom = r => Math.max(0.5, Math.min(1.3, r.height / 640));

function setZoom(z) {
  zoom = Math.max(0.45, Math.min(1.8, z));
  scale = zoom * dprNow();
  viewW = cv.width / scale;
  viewH = cv.height / scale;
  clampCam();
}

function clampCam() {
  camX = Math.max(0, Math.min(Math.max(0, WORLD.w - viewW), camX));
  camY = Math.max(0, Math.min(Math.max(0, WORLD.h - viewH), camY));
}

export const panBy = (dx, dy) => { camX += dx / scale; camY += dy / scale; clampCam(); };
export const camTop = () => camY;
export const viewCentre = () => ({ x: camX + viewW / 2, y: camY + viewH / 2 });
export function lookAt(x, y) { camX = x - viewW / 2; camY = y - viewH / 2; clampCam(); }
// Put a point in the lower part of the screen, clear of a panel at the top.
export function lookBelowPanel(x, y) { camX = x - viewW / 2; camY = y - viewH * 0.74; clampCam(); }

// Zoom about a point on screen, so what's under the cursor stays put.
export function zoomAt(clientX, clientY, factor) {
  const before = toWorld(clientX, clientY);
  setZoom(zoom * factor);
  const after = toWorld(clientX, clientY);
  camX += before.x - after.x; camY += before.y - after.y;
  clampCam();
}

export function toScreen(x, y) {
  const r = cv.getBoundingClientRect();
  return { x: r.left + (x - camX) * scale / dprNow(), y: r.top + (y - camY) * scale / dprNow() };
}

export function toWorld(clientX, clientY) {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  return {
    x: ((clientX - r.left) * dpr) / scale + camX,
    y: ((clientY - r.top) * dpr) / scale + camY,
  };
}

// Where to draw something: its spot on the grid, or the ghost while it's held.
function at(key) {
  if (E.key === key) return anchor({ c: E.c, r: E.r, k: E.kind });
  return posOf(key) || [-999, -999];
}
const ghosting = key => E.key === key;

// --- helpers --------------------------------------------------------------
function blit(name, x, y, size, flip) {
  const im = sprite(name);
  if (!im) return false;
  const w = size, h = size * (im.height / im.width);
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}

// Rows of empty space under a sprite's art. Buildings are drawn so their base
// sits on the anchor; drawn from the image edge they hover above their own
// shadow. Measured per frame, because animation frames rarely agree on where
// the bottom is, and using one frame's figure for all of them makes the
// building jitter against its shadow. A row only counts as the base once a
// few pixels wide, so a dangling coin or leaf doesn't drag the whole sprite.
const pads = new Map();
function padOf(im) {
  let pad = pads.get(im);
  if (pad != null) return pad;
  const cv = document.createElement('canvas');
  cv.width = im.width; cv.height = im.height;
  const g = cv.getContext('2d');
  g.drawImage(im, 0, 0);
  const A = g.getImageData(0, 0, im.width, im.height).data;
  const floor = Math.max(3, Math.round(im.width * 0.05));
  pad = 0;
  for (let y = im.height - 1; y >= 0; y--, pad++) {
    let n = 0;
    for (let x = 0; x < im.width; x++) if (A[(y * im.width + x) * 4 + 3] > 40) n++;
    if (n >= floor) break;
  }
  pads.set(im, pad);
  return pad;
}

// A building or prop standing on the ground at (x, y).
function plant(name, x, y, size, t = 0, fps) {
  const im = fps ? animFrame(name, t, fps) : sprite(name);
  if (!im) return false;
  const w = size, h = size * (im.height / im.width);
  const drop = padOf(im) * (h / im.height);
  ctx.drawImage(im, x - w / 2, y - h + drop, w, h);
  return true;
}

function blitAnim(name, t, x, y, size, flip, fps) {
  return plant(name, x, y, size, t, fps || 12);
}

function drawImg(im, x, y, size, flip) {
  const w = size, h = size * (im.height / im.width);
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, -w / 2, -h, w, h);
  ctx.restore();
}

function blob(x, y, r, fill, stroke) {
  ctx.beginPath();
  ctx.arc(x, y - r, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = stroke || '#2a1d16'; ctx.stroke();
}

// A soft ground shadow centred under the base, not below it, plus a tight
// dark contact patch where the art meets the grass. The art's lowest pixel is
// the front edge of the base, so the shadow sits mostly behind that line.
function shadow(x, y, w) {
  const cy = y - w * 0.2;
  const rings = [[1.05, .12], [0.8, .16], [0.58, .2]];
  for (const [k, a] of rings) {
    ctx.beginPath();
    ctx.ellipse(x, cy, w * k, w * k * 0.32, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(40,62,26,${a})`;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(x, y - w * 0.07, w * 0.7, w * 0.13, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(30,46,20,.28)';
  ctx.fill();
}

function bubble(x, y, w, h) {
  const r = 9;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + r, y - h);
  ctx.arcTo(x + w / 2, y - h, x + w / 2, y, r);
  ctx.arcTo(x + w / 2, y, x - w / 2, y, r);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x, y + 7);
  ctx.lineTo(x - 5, y);
  ctx.arcTo(x - w / 2, y, x - w / 2, y - h, r);
  ctx.arcTo(x - w / 2, y - h, x + w / 2, y - h, r);
  ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#2a1d16'; ctx.stroke();
}

// --- background -----------------------------------------------------------
let bgPattern = null;
export const GRASS = '#a6c97c';
let tilePat = null;

// A 128x128 seamless lawn tile: mottled tone plus short blades, wrapped at the
// edges so nothing lines up into a grid.
let grassCv = null;
function grassTile() {
  if (grassCv) return grassCv;
  const N = 128;
  grassCv = document.createElement('canvas');
  grassCv.width = grassCv.height = N;
  const g = grassCv.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, N, N);
  let seed = 0x2545f491;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  // wrap a draw across all four edges so the tile is seamless
  const wrap = (fn) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) fn(dx, dy); };
  // soft mottling
  for (let i = 0; i < 46; i++) {
    const x = rnd() * N, y = rnd() * N, r = 7 + rnd() * 16;
    g.fillStyle = rnd() < 0.5 ? 'rgba(206,222,186,.5)' : 'rgba(246,252,238,.55)';
    wrap((dx, dy) => { g.beginPath(); g.ellipse(x + dx, y + dy, r, r * 0.62, rnd() * 3, 0, 6.3); g.fill(); });
  }
  // blades
  g.lineCap = 'round';
  for (let i = 0; i < 170; i++) {
    const x = rnd() * N, y = rnd() * N, h = 3 + rnd() * 5, lean = (rnd() - 0.5) * 3;
    g.strokeStyle = rnd() < 0.42 ? 'rgba(176,199,150,.62)' : 'rgba(241,250,230,.5)';
    g.lineWidth = rnd() < 0.3 ? 1.6 : 1;
    wrap((dx, dy) => {
      g.beginPath();
      g.moveTo(x + dx, y + dy);
      g.quadraticCurveTo(x + dx + lean * 0.5, y + dy - h * 0.6, x + dx + lean, y + dy - h);
      g.stroke();
    });
  }
  return grassCv;
}

function drawGround(t) {
  ctx.fillStyle = GRASS;
  ctx.fillRect(camX, camY, viewW, viewH);

  // A seamless blade texture, drawn once into an offscreen tile. Procedural so
  // there is no repeating grid edge to spot.
  if (!tilePat) tilePat = ctx.createPattern(grassTile(), 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = tilePat;
  ctx.fillRect(camX, camY, viewW, viewH);
  ctx.restore();

  // broad soft patches, so the lawn has large-scale variation as well
  ctx.fillStyle = 'rgba(150,190,110,.28)';
  for (let i = 0; i < 320; i++) {
    const x = (i * 149) % WORLD.w, y = (i * 331) % WORLD.h;
    if (!onScreen(x, y, 60)) continue;
    ctx.beginPath();
    ctx.ellipse(x, y, 22 + (i % 5) * 7, 11 + (i % 3) * 4, i * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  // drawn grass bits, culled to the camera
  for (const [name, x, y, size, flip] of GROUND_BITS) {
    if (!onScreen(x, y, 30)) continue;
    if (!blit(name, x, y, size, flip)) {
      ctx.strokeStyle = 'rgba(139,179,99,.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 5); ctx.stroke();
    }
  }
  // the wood round the edge of the park
  for (const [x, y, sz] of FOREST) if (onScreen(x, y, 90)) blit('prop_bush', x, y, sz);
}

const onScreen = (x, y, m) =>
  x > camX - m && x < camX + viewW + m && y > camY - m && y < camY + viewH + m * 2;

// A ring of bushes outside the buildable grid, two deep.
const FOREST = (() => {
  const out = [];
  let seed = 0x51ed27;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const gw = GRID.lotsX * GRID.lot * GRID.cell, gh = GRID.lotsY * GRID.lot * GRID.cell;
  for (let ring = 0; ring < 2; ring++) {
    const pad = 40 + ring * 70;
    for (let x = GRID.x0 - pad; x < GRID.x0 + gw + pad; x += 58 + rnd() * 16) {
      out.push([x, GRID.y0 - pad + rnd() * 20, 70 + rnd() * 16]);
      out.push([x, GRID.y0 + gh + pad + 30 + rnd() * 20, 70 + rnd() * 16]);
    }
    for (let y = GRID.y0 - pad; y < GRID.y0 + gh + pad; y += 52 + rnd() * 14) {
      out.push([GRID.x0 - pad + rnd() * 16, y + 40, 70 + rnd() * 16]);
      out.push([GRID.x0 + gw + pad - rnd() * 16, y + 40, 70 + rnd() * 16]);
    }
  }
  return out;
})();

// --- pieces ---------------------------------------------------------------
function drawBlossom(b, t) {
  const [x, y] = at('bl:' + b.slot);
  const el = ELEMENTS[b.el];
  shadow(x, y, 16);
  const sway = Math.sin(t * 1.6 + b.slot) * 0.06;
  ctx.save(); ctx.translate(x, y); ctx.rotate(sway); ctx.translate(-x, -y);
  if (!plant('blossom_' + b.el, x, y, 46)) {
    blob(x, y - 14, 11, el.color);
    ctx.fillStyle = '#4b8b2d'; ctx.fillRect(x - 2, y - 16, 4, 16);
  }
  ctx.restore();
  // nectar readiness ring
  const f = b.nectar / b.max;
  if (f > 0.02) {
    ctx.beginPath();
    ctx.arc(x, y - 2, 20, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
    ctx.lineWidth = 3.5; ctx.strokeStyle = el.color; ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function drawStation(id, t) {
  const d = stationDef(id), st = S.stations[id];
  const [x, y] = at(id);
  shadow(x, y, 46);
  // each kitchen runs its idle loop on its own phase so they don't tick together
  const phase = STATIONS.findIndex(s => s.id === id) * 0.37;
  if (!blitAnim(d.sprite + '_idle', t + phase, x, y, 150, false, 8)) {
    blob(x, y - 4, 30, '#b07a4a');
    ctx.fillStyle = '#2a1d16'; ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(d.name, x, y - 44);
  }
  // vertical fill meter: mostly empty means the bees can't keep up, mostly
  // full means the kitchen wants more speed
  const need = Object.entries(d.inputs).reduce((a, [, n]) => a + n * 4, 0);
  const have = Object.values(st.buf).reduce((a, b) => a + b, 0);
  const f = Math.min(1, have / need);
  const bx = x + 80, by = y - 92, bh = 78;
  ctx.fillStyle = '#2a1d16';
  ctx.fillRect(bx - 5, by - 4, 10, bh + 8);
  ctx.fillStyle = '#ffd24a';
  ctx.fillRect(bx - 3, by + bh * (1 - f) - 2, 6, bh * f + 2);
  ctx.beginPath();
  ctx.moveTo(bx + 6, by + bh * (1 - f)); ctx.lineTo(bx + 13, by + bh * (1 - f) - 5);
  ctx.lineTo(bx + 13, by + bh * (1 - f) + 5); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill();

  const gaps = crewMissing(id);
  if (gaps) {
    // nobody attuned to run it: say so in words, with the element's sigil
    const parts = Object.entries(gaps).map(([el, n]) => (n > 1 ? n + ' ' : '') + ELEMENTS[el].name);
    const one = parts.length === 1 && !/^\d/.test(parts[0]);
    callout(x, y - 128, 'Needs ' + (one ? 'a ' : '') + parts.join(' + ') + (one ? ' bee' : ' bees'),
      'sigil_' + Object.keys(gaps)[0], '#2a1d16');
    return;
  }

  // cooking timer
  if (st.cook > 0) {
    const p = 1 - st.cook / d.cook;
    const cx = x - 58, cy = y - 92;
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#2a1d16'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 9, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.closePath(); ctx.fillStyle = '#ff8a3d'; ctx.fill();
  }
}

function drawAcademy(t) {
  const [x, y] = at('academy');
  shadow(x, y, 56);
  if (!blitAnim('academy_idle', t, x, y, 164, false, 7)) {
    blob(x, y - 20, 36, '#8a5a34');
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('Academy', x, y - 56);
  }
  const n = S.academy.classes.length;
  if (n) {
    const soonest = Math.min(...S.academy.classes.map(c => c.endsAt));
    const left = Math.max(0, (soonest - Date.now()) / 1000);
    bubble(x, y - 104, 76, 28);
    ctx.fillStyle = '#2a1d16'; ctx.font = 'bold 12px "Trebuchet MS",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${n}/${ACADEMY.seats} \u00b7 ${fmtClock(left)}`, x, y - 112);
  }
}

function fmtClock(s) {
  s = Math.ceil(s);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m` : `${s}s`;
}

function drawLounge(i) {
  const [x, y] = at('lg:' + i);
  shadow(x, y, 30);
  if (!plant('bld_hotel', x, y, HOTEL.size) && !plant('lounge', x, y, 76)) blob(x, y - 6, 24, '#ffd24a');
}

// A labelled callout over a building. A bare "!" or "3" tells nobody anything,
// so these carry a word and the icon of whatever is waiting.
function callout(x, y, label, iconName, inkColor) {
  ctx.font = 'bold 12px "Trebuchet MS",sans-serif';
  const tw = ctx.measureText(label).width;
  const im = iconName && sprite(iconName);
  const icw = im ? 20 : 0;
  const w = Math.max(44, tw + icw + 20);
  bubble(x, y, w, 28);
  const left = x - w / 2 + 9;
  if (im) {
    const h = 18 * (im.height / im.width);
    ctx.drawImage(im, left, y - 14 - h / 2 + 1, 18, h);
  }
  ctx.fillStyle = inkColor;
  ctx.textAlign = 'left';
  ctx.fillText(label, left + icw, y - 9);
  ctx.textAlign = 'center';
}

function drawBuilding(id, t) {
  const b = BUILDINGS[id];
  const [x, y] = at(id);
  shadow(x, y, 46);
  if (!blitAnim(b.sprite + '_idle', t + x * 0.01, x, y, 150, false, 7)) {
    blob(x, y - 26, 42, '#8a5a34');
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(b.name, x, y - 72);
  }
  if (id === 'shrine') {
    const el = S.shrine.el && Date.now() < S.shrine.until ? S.shrine.el : null;
    if (el) {
      const pulse = 0.5 + Math.sin(t * 2.2) * 0.2;
      ctx.beginPath();
      ctx.arc(x, y - 58, 30 + pulse * 5, 0, Math.PI * 2);
      ctx.strokeStyle = ELEMENTS[el].color;
      ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + pulse * 0.4;
      ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  if (id === 'order_board' && S.orders.length) {
    const n = S.orders.length;
    callout(x, y - 128, `${n} order${n === 1 ? '' : 's'}`, 'prop_postbox', '#2a1d16');
  }
  if (id === 'nectar_press' && Date.now() > (S.pressAt || 0)) {
    callout(x, y - 128, 'Collect', 'icon_pollen', '#9a6a0e');
  }
}

function drawCoin(c, t) {
  const hop = Math.abs(Math.sin(t * 2 + c.x)) * 3;
  shadow(c.x, c.y, 9);
  if (!blit('icon_coin', c.x, c.y - hop, 26)) blob(c.x, c.y - 8 - hop, 9, '#ffd24a');
}

function drawDecor(id, i) {
  const [x, y] = at('dc:' + i);
  shadow(x, y, 21);
  if (!plant(id, x, y, 62)) blob(x, y - 8, 18, '#c8a05a');
}

// Asleep in a tube: no bee, just z's drifting up out of it.
function drawSleeper(b, t) {
  const p = tubePos(b.restSlot, b.tube || 0);
  if (!p) return;
  ctx.font = 'bold 13px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center';
  ctx.strokeStyle = '#2a1d16'; ctx.lineWidth = 3; ctx.fillStyle = '#fff';
  for (let k = 0; k < 3; k++) {
    const f = ((t * 0.45 + b.id * 0.31 + k / 3) % 1);
    ctx.globalAlpha = f < 0.15 ? f / 0.15 : 1 - (f - 0.15) / 0.85;
    ctx.font = `bold ${10 + f * 8}px "Trebuchet MS",sans-serif`;
    const x = p[0] + 6 + f * 16 + Math.sin((f + k) * 6) * 3, y = p[1] - 6 - f * 34;
    ctx.strokeText('z', x, y); ctx.fillText('z', x, y);
  }
  ctx.globalAlpha = 1;
}

function drawBee(b, t) {
  if (b.mode === 'rest') return drawSleeper(b, t);
  // crawling into or out of a tube: shrink towards the mouth
  const sc = b.mode === 'enter' ? Math.max(0.12, 1 - b.t / 0.45)
           : b.mode === 'leave' ? Math.min(1, 0.12 + b.t / 0.35) : 1;
  if (sc < 1) {
    const top = b.outfit && b.outfit.cloak;
    const fr = sprite('bee_' + b.el);
    const im = top && wraps(top) ? worn(fr, top) : fr;
    if (im) drawImg(im, b.x, b.y + 8 * (1 - sc), 40 * sc, b.face === -1);
    return;
  }
  const bob = Math.sin(t * 7 + b.id) * 3;
  shadow(b.x, b.y + 6, 13);
  const stars = beeStars(b);
  if (stars > 1) {
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 6, 15, 5.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = RARITY[stars].tint;
    ctx.lineWidth = 2; ctx.globalAlpha = .85; ctx.stroke(); ctx.globalAlpha = 1;
  }
  const flip = b.face === -1;
  // body clothes are painted into the frame itself; see wear.js
  const top = b.outfit && b.outfit.cloak;
  const frame = animFrame('bee_' + b.el + '_hover', t + b.id * 0.17, 12) || sprite('bee_' + b.el);
  const body = top && wraps(top) ? worn(frame, top) : frame;
  if (body) drawImg(body, b.x, b.y + bob, 40, flip);
  else {
    blob(b.x, b.y + bob - 10, 11, ELEMENTS[b.el].color);
  }
  drawKit(b, b.y + bob, flip);
  if (b.load) {
    if (!blit('nectar_' + b.load.el, b.x + (flip ? 13 : -13), b.y + bob + 4, 20)) {
      blob(b.x - 12, b.y + bob - 2, 6, ELEMENTS[b.load.el].color);
    }
    if (b.load.attuned) {
      ctx.fillStyle = '#fff6b0';
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('✦', b.x + (flip ? 13 : -13), b.y + bob - 16);
    }
  }
  if (b.mode === 'study') {
    ctx.fillStyle = '#ffe06a'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#2a1d16'; ctx.lineWidth = 3;
    const g = '\u270e';
    ctx.strokeText(g, b.x + 15, b.y - 22); ctx.fillText(g, b.x + 15, b.y - 22);
  }
}

// hat, jumper and boots painted over the bee at fixed anchors
// dx/dy are fractions of the bee's drawn height, from her feet. dx is
// positive towards the face, which is the way she is flying.
const KIT_ANCHOR = {
  hat:   { dx: 0.17, dy: 0.72, size: 0.38 },
  cloak: { dx: -0.12, dy: 0.44, size: 0.46 },
  shoes: { dx: 0.02, dy: 0.06, size: 0.34 },
};

function drawKit(b, baseY, flip) {
  if (!b.outfit) return;
  const h = 40;                                  // the bee is drawn 40px tall
  for (const slot of OUTFIT_SLOTS) {
    const id = b.outfit[slot];
    if (!id || wraps(id)) continue;
    const a = KIT_ANCHOR[slot];
    if (!a) continue;
    const dx = h * a.dx * (flip ? -1 : 1);
    blit('fit_' + id, b.x + dx, baseY - h * a.dy + h * a.size, h * a.size, flip);
  }
}

function drawPop(p, t) {
  const y = p.y - Math.sin(p.t * 2.4) * 3;
  bubble(p.x, y, 38, 34);
  if (!blit('icon_heart', p.x, y - 8, 22)) {
    ctx.fillStyle = '#ff6b8a'; ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('♥', p.x, y - 10);
  }
}

const FX_ICON = { coin: 'icon_coin', heart: 'icon_heart', jelly: 'icon_jelly' };

function drawFx(f) {
  const k = f.t / f.life;
  ctx.globalAlpha = 1 - k * k;
  ctx.font = 'bold 17px "Trebuchet MS",sans-serif';
  ctx.textAlign = 'left';
  ctx.lineWidth = 4.5; ctx.strokeStyle = '#2a1d16';
  const txt = typeof f.text === 'number' ? '+' + fmt(f.text) :
    f.text.startsWith('+') && !isNaN(+f.text.slice(1)) ? '+' + fmt(+f.text.slice(1)) : f.text;
  const y = f.y - k * 40;
  const icon = sprite(FX_ICON[f.kind]);
  const iw = icon ? 20 : 0;
  const total = ctx.measureText(txt).width + iw + (iw ? 3 : 0);
  const x = f.x - total / 2;
  if (icon) ctx.drawImage(icon, x, y - 15, iw, iw);
  ctx.strokeText(txt, x + iw + (iw ? 3 : 0), y);
  ctx.fillStyle = f.tint || '#fff';
  ctx.fillText(txt, x + iw + (iw ? 3 : 0), y);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
}

// --- frame ----------------------------------------------------------------
// --- land ---------------------------------------------------------------
const C = GRID.cell;

// Lots you don't own yet are shaded, and the ones you can buy carry a sign.
function drawLand() {
  for (let lot = 0; lot < GRID.lotsX * GRID.lotsY; lot++) {
    if (S.land.includes(lot)) continue;
    const { c, r } = lotRect(lot);
    const [x, y] = cellPx(c, r);
    const w = GRID.lot * C;
    if (y > camY + viewH || y + w < camY || x > camX + viewW || x + w < camX) continue;
    const buy = lotBuyable(lot);
    ctx.fillStyle = buy ? 'rgba(44,70,30,.24)' : 'rgba(30,50,22,.42)';
    ctx.fillRect(x, y, w, w);
    if (buy) {
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,248,220,.6)';
      ctx.strokeRect(x + 3, y + 3, w - 6, w - 6);
      ctx.setLineDash([]);
    }
    if (buy) {
      const cx = x + w / 2, cy = y + w / 2 + 26;
      shadow(cx, cy, 20);
      plant('prop_sign', cx, cy, 52);
      callout(cx, cy - 60, fmt(nextLandCost()), 'icon_coin', '#2a1d16');
    }
  }
}

function drawGridLines() {
  ctx.strokeStyle = 'rgba(255,250,230,.35)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const lot of S.land) {
    const { c, r } = lotRect(lot);
    for (let i = 0; i <= GRID.lot; i++) {
      const [ax, ay] = cellPx(c + i, r), [bx, by] = cellPx(c + i, r + GRID.lot);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      const [px, py] = cellPx(c, r + i), [qx, qy] = cellPx(c + GRID.lot, r + i);
      ctx.moveTo(px, py); ctx.lineTo(qx, qy);
    }
  }
  ctx.stroke();
}

function drawFootprint() {
  const [w, h] = FOOT[E.kind];
  const [x, y] = cellPx(E.c, E.r);
  ctx.fillStyle = E.ok ? 'rgba(120,230,120,.38)' : 'rgba(240,80,70,.42)';
  ctx.fillRect(x, y, w * C, h * C);
  ctx.lineWidth = 3; ctx.strokeStyle = E.ok ? '#3d9a3d' : '#b8322a';
  ctx.strokeRect(x + 1.5, y + 1.5, w * C - 3, h * C - 3);
}

function ghost(fn) {
  ctx.save(); ctx.globalAlpha = 0.78; fn(); ctx.restore();
}

// A new build that isn't on the grid yet: just its art.
function drawFresh(x, y, t) {
  const size = { station: 150, building: 150, academy: 164, lounge: HOTEL.size, blossom: 46, decor: 62 }[E.kind];
  if (!blitAnim(E.sprite + '_idle', t, x, y, size, false, 8)) plant(E.sprite, x, y, size);
}

export function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = GRASS;
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(scale, 0, 0, scale, -camX * scale, -camY * scale);
  ctx.imageSmoothingEnabled = false;

  drawGround(t);
  drawLand();
  if (E.on) drawGridLines();
  const aura = decorAura();
  if (aura) drawAuraArea(aura);
  if (E.on && (E.key || E.fresh)) drawFootprint();

  // paint back to front so things overlap the way the slope implies
  const layer = [];
  const put = (key, fn) => layer.push({ y: at(key)[1], fn: ghosting(key) ? () => ghost(fn) : fn });
  S.decor.forEach((id, i) => put('dc:' + i, () => drawDecor(id, i)));
  S.lounges.forEach(i => put('lg:' + i, () => drawLounge(i)));
  for (const b of S.blossoms) put('bl:' + b.slot, () => drawBlossom(b, t));
  for (const id of Object.keys(S.stations)) if (stationDef(id)) put(id, () => drawStation(id, t));
  if (S.features.academy) put('academy', () => drawAcademy(t));
  for (const id of BUILDING_IDS) if (S.buildings[id]) put(id, () => drawBuilding(id, t));
  if (E.fresh) {
    const [gx, gy] = anchor({ c: E.c, r: E.r, k: E.kind });
    layer.push({ y: gy, fn: () => ghost(() => drawFresh(gx, gy, t)) });
  }
  for (const c of S.coins) layer.push({ y: c.y, fn: () => drawCoin(c, t) });
  for (const b of S.bees) {
    // in or at a tube, she belongs in front of her hotel
    const h = ['enter', 'rest', 'leave'].includes(b.mode) && loungePos(b.restSlot);
    layer.push({ y: h ? h[1] + 1 : b.y + 40, fn: () => drawBee(b, t) });
  }
  layer.sort((a, b) => a.y - b.y)
       .filter(l => l.y > camY - 220 && l.y < camY + viewH + 260)
       .forEach(l => l.fn());

  if (aura) drawAuraTags(aura);
  for (const p of pops) drawPop(p, t);
  for (const f of fx) drawFx(f);
}

// --- a decoration's reach ----------------------------------------------------
// Shown while one is hovered, its panel is open, or it's being placed.
function decorAura() {
  let id = null, area = null;
  if (E.kind === 'decor' && (E.key || E.fresh)) {
    id = E.fresh ? E.fresh.type : S.decor[+E.key.slice(3)];
    area = decorArea(null, E.c, E.r);
  } else if (E.peek && S.place[E.peek]) {
    id = S.decor[+E.peek.slice(3)];
    area = decorArea(E.peek);
  }
  if (!id || !area || !DECOR[id]) return null;
  return { id, area, d: DECOR[id], targets: decorTargets(id, area) };
}

function drawAuraArea({ area }) {
  const c0 = Math.max(0, area.c0), r0 = Math.max(0, area.r0);
  const c1 = Math.min(GRID.cols - 1, area.c1), r1 = Math.min(GRID.rows - 1, area.r1);
  const [x, y] = cellPx(c0, r0), [x2, y2] = cellPx(c1 + 1, r1 + 1);
  ctx.fillStyle = 'rgba(120,205,255,.20)';
  ctx.fillRect(x, y, x2 - x, y2 - y);
  ctx.setLineDash([8, 6]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(40,120,190,.8)';
  ctx.strokeRect(x + 1, y + 1, x2 - x - 2, y2 - y - 2);
  ctx.setLineDash([]);
}

// Outline each thing it's helping, with the bonus over it.
function drawAuraTags({ d, targets }) {
  const label = '+' + Math.round(d.amt * 100) + '%';
  for (const k of targets) {
    const p = S.place[k], [w, h] = FOOT[p.k];
    const [x, y] = cellPx(p.c, p.r);
    ctx.lineWidth = 3; ctx.strokeStyle = '#f2b33d';
    ctx.strokeRect(x + 3, y + 3, w * GRID.cell - 6, h * GRID.cell - 6);
    const cx = x + w * GRID.cell / 2;
    ctx.font = 'bold 12px "Trebuchet MS",sans-serif';
    const tw = ctx.measureText(label).width + 12;
    ctx.fillStyle = '#2f7d2a'; ctx.strokeStyle = '#173d15'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cx - tw / 2, y + h * GRID.cell - 22, tw, 18, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(label, cx, y + h * GRID.cell - 9);
  }
  if (d.affects === 'bee') return;
  if (!targets.length && (E.kind === 'decor')) {
    // nothing in reach yet: say so at the ghost
    const [x, y] = cellPx(E.c, E.r);
    callout(x + GRID.cell / 2, y - 4, 'Nothing in reach', null, '#a8402e');
  }
}
