import {
  S, load, save, stats, incomePerSec, give, research, isUnlocked, addFresh, regenKp,
  posOf, pxCell, lotOf, lotBuyable, ensureRoom, landCentre,
} from './state.js';
import { E } from './edit.js';
import { loadAssets } from './assets.js';
import { resize, draw, toWorld, panBy, lookAt, zoomAt } from './render.js';
import { tuckIn, tick, pops, collectPop, offlineEarnings, sellStation, collectCoin, stationAttune, rollOrder } from './sim.js';
import {
  setBeeView, hudTip, initUI, syncHUD, wireHudTips, syncRail, syncDock, openTab, closeSheet,
  toast, showTip, refreshOpenTab, openThing, openLand, pickUp, ghostTo, startMove, nextStarter,
  dropHeld, cancelHold,
} from './ui.js';
import {
  stationDef, ELEMENTS, OUTFITS, FOOT, GRID, TECH, STARTERS, DECOR, BUILDING_IDS,
} from './data.js';
import { fmt, clock } from './num.js';

const cv = document.getElementById('park');
// Dev switches come from ?demo=30&tab=park locally. Hosted pages only pass a
// plain #name, so #demo and #park work there too.
const Q = new URLSearchParams(location.search);
const HASH = (location.hash || '').replace('#', '').trim();
if (HASH === 'demo') Q.set('demo', '28');
else if (HASH) Q.set('tab', HASH);
const DEBUG = Q.has('debug');

// A new park: the first research is done and the first bee is here, but the
// player places the grill, blossom and lounge themself (see nextStarter).
function firstRun() {
  if (S.parkLevel > 0) return false;
  for (const id of ['grill', 'emberbl', 'bee1', 'hotel']) research(id, true);
  save();
  return true;
}

function catchUp() {
  const away = (Date.now() - (S.lastSeen || Date.now())) / 1000;
  regenKp(Math.max(0, away));
  const { coin, seconds } = offlineEarnings(away);
  if (coin > 0) {
    give('coin', coin);
    setTimeout(() => toast(`While you were away (${clock(seconds)}): +${fmt(coin)}`), 500);
  }
}

// What's under a tap. Whatever owns the cell under the finger wins; the art
// that stands up above a footprint (roofs, trees) only counts over a cell
// nobody owns, front-most first. Otherwise a tall hotel steals taps meant for
// the blossom in front of its roof.
function itemAt(wx, wy) {
  const C = GRID.cell;
  const [c, r] = pxCell(wx, wy);
  for (const [key, p] of Object.entries(S.place)) {
    const [w, h] = FOOT[p.k];
    if (c >= p.c && c < p.c + w && r >= p.r && r < p.r + h) return key;
  }
  let best = null, bestY = -Infinity;
  for (const [key, p] of Object.entries(S.place)) {
    const [w, h] = FOOT[p.k];
    const x = GRID.x0 + p.c * C, y = GRID.y0 + p.r * C;
    const lift = h >= 3 ? 50 : p.k === 'lounge' ? 70 : 18;
    if (wx >= x && wx < x + w * C && wy >= y - lift && wy < y) {
      const ay = posOf(key)[1];
      if (ay > bestY) { bestY = ay; best = key; }
    }
  }
  return best;
}

function hit(wx, wy) {
  // bubbles first, they are the thing you are aiming at
  for (const p of [...pops].reverse()) {
    if (Math.hypot(p.x - wx, p.y - wy) < 30) { collectPop(p); return true; }
  }
  for (const c of [...S.coins].reverse()) {
    if (Math.hypot(c.x - wx, c.y - wy) < 26) {
      const got = collectCoin(c);
      if (got) toast('+' + fmt(got));
      return true;
    }
  }
  const key = itemAt(wx, wy);
  if (key) {
    const p = S.place[key];
    if (p.k === 'station') {
      const st = S.stations[key];
      if (st.stock + st.premStock > 0) {
        const got = sellStation(key);
        toast(`${stationDef(key).dish} sold for ${fmt(got)}`);
        return true;
      }
    }
    openThing(key);
    return true;
  }
  const [c, r] = pxCell(wx, wy);
  const lot = lotOf(c, r);
  if (c >= 0 && c < GRID.cols && r >= 0 && r < GRID.rows && lotBuyable(lot)) { openLand(lot); return true; }
  return false;
}

// While holding something, a tap puts it down on that cell (if it fits). In
// move mode with nothing held, a tap picks a thing up.
function editTap(wx, wy) {
  const [c, r] = pxCell(wx, wy);
  // holding one building and tapping another: put the first down (where its
  // ghost is, or back where it was if that doesn't fit) and take the new one
  const other = E.key && itemAt(wx, wy);
  if (other && other !== E.key) {
    const auto = E.auto;
    if (E.ok) dropHeld(); else cancelHold();
    pickUp(other, auto);
    return;
  }
  if (E.key || E.fresh) {
    const [w, h] = FOOT[E.kind];
    ghostTo(c - Math.floor(w / 2), r - Math.floor(h / 2));
    dropHeld();
    return;
  }
  const key = itemAt(wx, wy);
  if (key) pickUp(key, false);
}

// Is this pointer on the ghost? Then a drag moves it rather than the camera.
function onGhost(wx, wy) {
  if (!(E.key || E.fresh)) return false;
  const [w, h] = FOOT[E.kind];
  const x = GRID.x0 + E.c * GRID.cell, y = GRID.y0 + E.r * GRID.cell;
  return wx >= x - 10 && wx < x + w * GRID.cell + 10 && wy >= y - 40 && wy < y + h * GRID.cell + 10;
}

// Dev affordances: ?demo=N builds N park entries for free and fast-forwards the
// sim, ?tab=park opens a panel, ?debug writes sim state into document.title.
// Researches every node an old N-entry park would have had, and lays out one
// of everything it unlocks (two blossoms per element), handing out land.
function demo(entries) {
  for (const t of [...TECH].sort((a, b) => a.n - b.n)) {
    if (t.n >= entries) continue;
    research(t.id, true);
    give('gem', 2);
  }
  const want = [...STARTERS, ['lounge', 'lounge']];
  for (const el of Object.keys(ELEMENTS)) want.push(['blossom', el], ['blossom', el]);
  for (const st of ['ember_grill', 'loam_mill', 'tide_cauldron', 'gale_whisk', 'ash_oven', 'storm_kettle']) want.push(['station', st]);
  want.push(['academy', 'academy']);
  for (const id of BUILDING_IDS) want.push(['building', id]);
  for (const id of Object.keys(DECOR)) want.push(['decor', id]);
  const have = {};
  for (const [k, t] of want) {
    if (!isUnlocked(k, t)) continue;
    const id = k + t; have[id] = (have[id] || 0) + 1;
    if (k === 'station' && S.stations[t]) continue;
    if (['building', 'academy', 'decor'].includes(k) && have[id] > 1) continue;
    ensureRoom(k);
    addFresh(k, t);
  }
  give('heart', 120); give('gem', 400); give('pollen', 60);
  for (let i = 0; i < 90 * 30; i++) tick(1 / 30);
  while (S.buildings.order_board && S.orders.length < 3) {
    const o = rollOrder();
    if (!o) break;
    S.orders.push(o);
  }
  for (const id of Object.keys(S.stations)) S.stations[id].stock =
    Math.min(stationDef(id).stockMax, S.stations[id].stock + 6);
  S.bag = 4200;
}

async function boot() {
  load();
  await loadAssets();
  const fresh = firstRun();
  if (Q.has('demo')) demo(+Q.get('demo') || 24);
  if (Q.has('fit')) {
    // dev: dress the whole roster, to check the kit overlays
    const pick = sl => OUTFITS.filter(o => o.slot === sl);
    S.bees.forEach((b, i) => {
      for (const sl of ['hat', 'clothes', 'shoes']) {
        const o = pick(sl)[i % pick(sl).length];
        S.owned[o.id] = S.owned[o.id] || 1;
        b.outfit[sl] = o.id;
      }
    });
  }
  catchUp();
  resize();
  const home = posOf(Object.keys(S.stations)[0]) || [landCentre().x, landCentre().y];
  lookAt(home[0], home[1] - 40);
  initUI();
  wireHudTips();
  syncHUD();
  syncRail();
  syncDock();

  addEventListener('resize', resize);
  // Drag pans the map both ways; wheel or two fingers zoom. In move mode a
  // drag that starts on the held thing moves it instead.
  let drag = null;
  const touches = new Map();
  let pinch = null;
  const dpr = () => Math.min(devicePixelRatio || 1, 2);
  cv.addEventListener('pointerdown', e => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cv.setPointerCapture(e.pointerId);
    if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
      drag = null;
      return;
    }
    const w = toWorld(e.clientX, e.clientY);
    drag = { x: e.clientX, y: e.clientY, moved: 0, ghost: E.on && onGhost(w.x, w.y) };
    if (drag.ghost) drag.grab = { dc: Math.floor((w.x - GRID.x0) / GRID.cell) - E.c,
                                  dr: Math.floor((w.y - GRID.y0) / GRID.cell) - E.r };
    // long press on a building picks it up, ready to drag
    const key = !(E.key || E.fresh) && itemAt(w.x, w.y);
    if (key) {
      const d = drag;
      d.press = setTimeout(() => {
        if (drag !== d || d.moved > 6) return;
        pickUp(key, !E.on);
        d.ghost = true; d.lifted = true; d.moved = 0;
        d.grab = { dc: Math.floor((w.x - GRID.x0) / GRID.cell) - E.c,
                   dr: Math.floor((w.y - GRID.y0) / GRID.cell) - E.r };
        navigator.vibrate?.(15);
      }, 420);
    }
  });
  cv.addEventListener('pointermove', e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2) {
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch.d);
      pinch.d = d;
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.ghost) {
      const w = toWorld(e.clientX, e.clientY);
      const [c, r] = pxCell(w.x, w.y);
      ghostTo(c - drag.grab.dc, r - drag.grab.dr);
      return;
    }
    if (drag.moved > 6) panBy(-dx * dpr(), -dy * dpr());
  });
  const lift = e => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
  };
  cv.addEventListener('pointerup', e => {
    lift(e);
    const d = drag;
    drag = null;
    if (d) clearTimeout(d.press);
    // dragged a held thing and let go: it goes down there, or back where it was
    if (d && d.ghost && d.moved > 6) {
      if (E.ok) dropHeld(); else { toast("Doesn't fit there"); cancelHold(); }
      return;
    }
    if (d && d.lifted) return;          // long press without a drag: tap where it goes
    if (!d || d.moved > 6) return;
    const { x, y } = toWorld(e.clientX, e.clientY);
    if (E.on) { editTap(x, y); return; }
    if (hit(x, y)) { syncHUD(); syncRail(); save(); return; }
    closeSheet();
  });
  cv.addEventListener('pointercancel', e => { lift(e); if (drag) clearTimeout(drag.press); drag = null; });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey && e.deltaMode === 0 && Math.abs(e.deltaY) >= 40) {
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0022));
    } else {
      panBy(e.deltaX * dpr(), e.deltaY * dpr());
    }
  }, { passive: false });

  let last = performance.now(), acc = 0, ui = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    tick(dt);
    draw(now / 1000);
    ui += dt;
    if (ui > 0.2) { ui = 0; syncHUD(); syncRail(); syncDock(); }
    acc += dt;
    if (acc > 10) { acc = 0; save(); refreshOpenTab(); }
    if (DEBUG) {
      const st = S.stations.ember_grill;
      document.title = `coin=${S.coin.toFixed(1)} lv=${S.parkLevel} bees=${S.bees.length}` +
        ` mode=${S.bees.map(b => b.mode).join(',')} bl=${S.blossoms.map(b => b.nectar.toFixed(1)).join(',')}` +
        ` buf=${JSON.stringify(st?.buf)} stock=${st?.stock} t=${(now / 1000).toFixed(0)}`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  addEventListener('beforeunload', save);

  if (Q.has('dress')) setBeeView('dress');
  if (Q.has('tip')) setInterval(() => hudTip(Q.get('tip')), 1500);
  if (Q.has('rename')) setTimeout(() => document.querySelector('#rename-fit,#rename')?.click(), 200);
  if (Q.has('tab')) openTab(Q.get('tab'));
  if (Q.has('thing')) setTimeout(() => openThing(Q.get('thing')), 200);
  if (Q.has('ttip')) setTimeout(() => document.querySelector(`.bnode[data-id="${Q.get("ttip")}"]`)?.click(), 900);
  if (Q.has('move')) startMove();
  if (Q.has('sleep')) S.bees.forEach(tuckIn);
  // dev: a clean picture of the park for slides. No UI, no bubbles, and
  // without the kitchens named in ?showcase=gale_whisk,storm_kettle
  if (Q.has('showcase')) {
    for (const id of (Q.get('showcase') || '').split(',').filter(Boolean)) {
      delete S.stations[id]; delete S.place[id];
    }
    document.getElementById('app').classList.add('showcase');
    setInterval(() => { pops.length = 0; }, 30);
  }
  if (Q.has('wipe')) setTimeout(() => {
    openTab('settings');
    document.getElementById('do-reset').click();
    document.getElementById('do-reset').click();
  }, 300);
  if (Q.has('look')) { const [x, y] = Q.get('look').split(',').map(Number); lookAt(x, y); }
  if (Q.has('zoom')) zoomAt(innerWidth / 2, innerHeight / 2, +Q.get('zoom'));
  if (Q.has('hold')) setTimeout(() => pickUp(Q.get('hold') || Object.keys(S.stations)[0], false), 100);

  if (fresh && !Q.has('demo')) setTimeout(nextStarter, 300);
  else if (!Object.keys(S.stations).length && !Q.has('demo')) setTimeout(nextStarter, 300);
}

boot();
