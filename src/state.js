import {
  BLOSSOM_SLOTS, LOUNGE_SLOTS, DECOR_SLOTS, STATIONS, stationDef,
  OUTFITS, DECOR, GLOBAL_LAB, ROYAL_LAB, BASE_OFFLINE_SECONDS, BUILDINGS, SHRINE,
  BEE_ROSTER, beeDef, RARITY, ROSTER_MAX, BEE_MAX_LEVEL, levelCarry, levelSpeed,
  UPGRADES, upgradeKind, BUILD, HIVE_GATE, BUILDING_IDS, skillCd,
  GRID, FOOT, LOT_COLS, WORLD, ACADEMY_POS, typeOf, landCost, COPY,
  TECH, techDef, techCost, STARTERS, GRID_V2, GRID_V3, START_LOTS, TECH_V4, WAGGLE, techKp,
  DECOR_RANGE, AFFECTS_KIND,
} from './data.js';

const KEY = 'elemental-bees-save-v1';

export function freshState() {
  return {
    v: 5,
    coin: 0, heart: 0, gem: 10, pollen: 0, jelly: 0, wax: 0,
    parkLevel: 0,            // research nodes done (was: park track entries)
    tech: {},                // research node id -> true
    kp: WAGGLE.start,        // waggles in hand
    techKp: {},              // research node id -> waggles poured in so far
    hiveName: null,          // what the player calls their hive
    rankStart: Date.now(),   // when the neighbouring hives started growing
    lastPos: 0,              // last ranking position seen, for "you passed"

    features: {},            // lab / royal / outfits / autosell
    stations: {},            // id -> { stock, premStock, buf:{el:n}, cook, spdLvl, premLvl }
    blossoms: [],            // { slot, el, nectar, max, heartAt }
    lounges: [],             // slot index
    decor: [],               // prop id
    bees: [],                // { id, el, x, y, vx, vy, mode, t, load:{el,n}, target, stam, outfit:{} }
    lab: {}, royal: {},      // upgrade id -> level
    owned: {},               // outfit id -> level (0 = not owned)
    academy: { classes: [] },// { beeId, el, endsAt }
    buildings: {},           // id -> true
    coins: [],               // { x, y, v, t } dropped by the coin tree
    treeAt: 0,               // seconds until the next coin falls
    orders: [], orderAt: 0,  // { station, qty, gem, pollen, expires }
    shrine: { el: null, until: 0 },
    pressAt: 0,              // timestamp the press is usable again
    levels: {},              // building id -> level, 1 when absent
    pity: 0,                 // pulls since the last legendary
    lostFeatured: false,     // next legendary is guaranteed to be the banner bee
    buffs: {},               // key -> { mul, until } from active skills
    cd: {},                  // roster id -> timestamp the skill is ready again
    build: null,             // { id, until } the one upgrade under way
    boostAmt: 2,             // multiplier the current boost is worth
    bag: 0,                  // coins auto-sold, waiting to be collected
    boostUntil: 0,
    lastSeen: Date.now(),
    nextBeeId: 1,
    tutorialDone: false,
    theme: '',
    place: {},               // key -> { c, r, k } grid cell and kind of everything placed
    land: [...START_LOTS],   // lot indices owned; lot = row * LOT_COLS + col
    landBought: 0,
  };
}

export let S = freshState();

// Set once the player wipes the park. The page saves on unload, so without
// this the reload after a reset would write the old park straight back.
let wiped = false;

export function save() {
  if (wiped) return;
  S.lastSeen = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) adopt(JSON.parse(raw));
  } catch {}
  syncWorld();
  return S;
}

export function adopt(d) {
  if (!d || ![1, 2, 3, 4, 5].includes(d.v)) return;
  S = Object.assign(freshState(), d);
  if (d.v === 1) migrateV1();
  else if (d.v === 2) migrateOld(GRID_V2);
  else if (d.v === 3) migrateOld(GRID_V3);
  if (d.v < 3) techFromTrack();
  else if (d.v < 5) techFromV4();
  S.v = 5;
  nameStrays();
  settleBees();
  syncWorld();
}

// Bees from before the roster have no identity, so they show up as just "Bee".
// Give each the first free roster bee of her element.
function nameStrays() {
  const owned = new Set(S.bees.map(b => b.rid).filter(Boolean));
  for (const b of S.bees) {
    if (b.rid && beeDef(b.rid)) continue;
    const pick = BEE_ROSTER.find(r => r.el === b.el && !owned.has(r.id))
              || BEE_ROSTER.find(r => !owned.has(r.id));
    if (!pick) continue;
    b.rid = pick.id; b.el = pick.el;
    owned.add(pick.id);
    b.level = b.level || 1; b.learned = b.learned || []; b.rank = b.rank || 0;
  }
}

// Research that comes with a bee should leave you with that bee. A save from
// the old track could stop between a kitchen and its bee (the Loam Mill came
// two entries before the Loam bee), which left a kitchen nobody could run.
// So top the roster up: per element, at least one bee per researched node that
// grants one, while there's room and a bee of that element left to give.
function settleBees() {
  const want = {};
  for (const t of TECH) if (t.bee && S.tech[t.id]) want[t.bee] = (want[t.bee] || 0) + 1;
  for (const [el, n] of Object.entries(want)) {
    let have = S.bees.filter(b => b.el === el).length;
    while (have < n && S.bees.length < ROSTER_MAX &&
           BEE_ROSTER.some(r => r.el === el && !S.bees.some(b => b.rid === r.id))) {
      addBee(el); have++;
    }
  }
}

// v3/v4 nodes unlocked several things each; v5 nodes one. Give a save every
// new node its old ones covered.
function techFromV4() {
  const old = S.tech || {};
  S.tech = {};
  for (const [id, done] of Object.entries(old)) {
    if (!done) continue;
    for (const n of (TECH_V4[id] || [])) S.tech[n] = true;
  }
  S.parkLevel = techCount();
}

// Before the tree, progress was a position on a linear track. Every node whose
// old track position was passed counts as researched.
function techFromTrack() {
  S.tech = {};
  for (const t of TECH) if (t.n < S.parkLevel) S.tech[t.id] = true;
  S.parkLevel = techCount();
}

// v1 parks had everything at fixed spots. Put each thing on the grid as close
// to where it stood as the cells allow. Levels, stock and bees are untouched.
function migrateV1() {
  S.landBought = 0;
  const old = [];
  for (const id of Object.keys(S.stations)) {
    const d = stationDef(id); if (d) old.push([id, 'station', d.x, d.y]);
  }
  for (const id of BUILDING_IDS) if (S.buildings[id]) old.push([id, 'building', BUILDINGS[id].x, BUILDINGS[id].y]);
  if (S.features.academy) old.push(['academy', 'academy', ACADEMY_POS[0], ACADEMY_POS[1]]);
  S.lounges.forEach(i => { const p = LOUNGE_SLOTS[i] || [200, 900]; old.push(['lg:' + i, 'lounge', p[0], p[1]]); });
  S.blossoms.forEach(b => { const p = BLOSSOM_SLOTS[b.slot] || [200, 900]; old.push(['bl:' + b.slot, 'blossom', p[0], p[1]]); });
  S.decor.forEach((id, i) => { const p = DECOR_SLOTS[i] || [200, 900]; old.push(['dc:' + i, 'decor', p[0], p[1]]); });
  repack(old);
}

// Saves before the landscape map had a phone-width park growing downward from
// y 200. Read each thing back into pixels on that grid and lay it out again
// in the middle of the map, keeping at least as many cells of land.
function migrateOld(G) {
  const area = S.land.length * G.lot * G.lot;
  const old = Object.entries(S.place).map(([key, p]) => {
    const [w, h] = FOOT[p.k];
    return [key, p.k, G.x0 + (p.c + w / 2) * G.cell, G.y0 + (p.r + h) * G.cell - 10];
  });
  repack(old);
  while (S.land.length * GRID.lot * GRID.lot < area) if (!grantNextLot()) break;
}

// Where the old phone park's top left lands on the landscape map.
function fromOld(x, y) {
  const { c, r } = lotRect(START_LOTS[0]);
  const [ox, oy] = cellPx(c, r);
  return { x: ox + x, y: oy + y - 200 };
}

// Put each [key, kind, x, y] on the grid as close to that point as the cells
// allow, big things first, handing out land for free as it runs out.
function repack(old) {
  S.place = {};
  S.land = [...START_LOTS];
  old.sort((a, b) => (FOOT[b[1]][0] * FOOT[b[1]][1]) - (FOOT[a[1]][0] * FOOT[a[1]][1]) || a[3] - b[3]);
  for (const [key, kind, x, y] of old) {
    const near = fromOld(x, y);
    while (!placeNew(key, kind, near)) if (!grantNextLot(near)) break;
  }
}

export function wipe() {
  wiped = true;
  try { localStorage.removeItem(KEY); } catch {}
}

// --- derived stats --------------------------------------------------------
const lvl = (bag, id) => bag[id] || 0;

// --- decorations help what's near them -------------------------------------
// The cells a decoration reaches: its footprint grown by DECOR_RANGE each way.
// (c, r) override where it is, for a ghost being placed.
export function decorArea(key, c, r) {
  const p = S.place[key];
  if (!p && c == null) return null;
  const cc = c ?? p.c, rr = r ?? p.r;
  return { c0: cc - DECOR_RANGE, r0: rr - DECOR_RANGE, c1: cc + DECOR_RANGE, r1: rr + DECOR_RANGE };
}
const overlaps = (a, p) => {
  const [w, h] = FOOT[p.k];
  return p.c <= a.c1 && p.c + w - 1 >= a.c0 && p.r <= a.r1 && p.r + h - 1 >= a.r0;
};
const decorOf = key => DECOR[S.decor[+key.slice(3)]];

// Everything one decoration is helping, at its spot or a ghost spot.
export function decorTargets(id, area) {
  const d = DECOR[id];
  if (!d || !AFFECTS_KIND[d.affects]) return [];
  return Object.entries(S.place).filter(([, p]) => p.k === AFFECTS_KIND[d.affects] && overlaps(area, p)).map(([k]) => k);
}

// The bonus a placed thing gets from decorations round it, for one stat.
export function decorBonus(key, stat) {
  const p = S.place[key];
  if (!p) return 0;
  let n = 0;
  for (const [dk, dp] of Object.entries(S.place)) {
    if (dp.k !== 'decor') continue;
    const d = decorOf(dk);
    if (d && d.stat === stat && overlaps(decorArea(dk), p)) n += d.amt;
  }
  return n;
}

// For bees, which move: the bonus at a point on the map.
export function decorAt(x, y, stat) {
  const [c, r] = pxCell(x, y);
  let n = 0;
  for (const [dk, dp] of Object.entries(S.place)) {
    if (dp.k !== 'decor') continue;
    const d = decorOf(dk), a = decorArea(dk);
    if (d && d.stat === stat && c >= a.c0 && c <= a.c1 && r >= a.r0 && r <= a.r1) n += d.amt;
  }
  return n;
}

function outfitSum(stat) {
  // Every bee wears its own kit; this is the park-wide average multiplier.
  if (!S.bees.length) return 0;
  let total = 0;
  for (const b of S.bees) {
    for (const id of Object.values(b.outfit || {})) {
      const o = OUTFITS.find(x => x.id === id);
      if (o && o.stat === stat) total += o.step * (S.owned[id] || 1);
    }
  }
  return total / S.bees.length;
}

const royalLvl = id => lvl(S.royal, id);
const royalStep = id => (ROYAL_LAB.find(r => r.id === id)?.step || 0) * royalLvl(id);

export function buff(key) {
  const b = S.buffs[key];
  return b && Date.now() < b.until ? b.mul : 1;
}
export function setBuff(key, mul, seconds) {
  S.buffs[key] = { mul, until: Date.now() + seconds * 1000 };
}
export const buffLeft = key => {
  const b = S.buffs[key];
  return b && Date.now() < b.until ? (b.until - Date.now()) / 1000 : 0;
};

// --- hive rank ------------------------------------------------------------
// Bees are most of it, then how far the park is built.
export function hivePower() {
  let p = 0;
  for (const b of S.bees) p += beeStars(b) * 12 * (b.level || 1) + (b.rank || 0) * 6;
  for (const id of Object.keys(S.stations)) p += (buildingLevel(id) - 1) * 8;
  for (const id of BUILDING_IDS) if (S.buildings[id]) p += (buildingLevel(id) - 1) * 8 + 10;
  if (S.features.academy) p += (buildingLevel('academy') - 1) * 8;
  p += S.lounges.length * ((buildingLevel('lounge') - 1) * 8 + 6);
  return Math.round(p + techCount() * 6);
}
export const hiveGateFor = id => HIVE_GATE[typeOf(id)] || 0;
export const hiveGateMet = id => hivePower() >= hiveGateFor(id);

export const stats = {
  get boostActive() { return Date.now() < S.boostUntil; },
  get boostMul() {
    if (!this.boostActive) return 1;
    return 1 + ((S.boostAmt || 2) - 1) * (1 + royalStep('boost'));
  },
  get shrineEl() { return Date.now() < S.shrine.until ? S.shrine.el : null; },
  attuneFor(el) {
    return this.attune * (el && el === this.shrineEl ? SHRINE.attuneMul : 1);
  },
  bloomFor(el) {
    return this.bloom * (el && el === this.shrineEl ? SHRINE.bloomMul : 1);
  },
  get carry()  { return (1 + lvl(S.lab, 'carry')  * 0.20 + outfitSum('carry') + passiveSum('carry')) * buff('carry'); },
  get speed()  { return (1 + lvl(S.lab, 'speed')  * 0.06 + outfitSum('speed') + passiveSum('speed')) * buff('haste'); },
  get bloom()  { return 1 + lvl(S.lab, 'bloom')  * 0.08 + passiveSum('bloom'); },
  get stamina(){ return 1 + lvl(S.lab, 'stam')   * 0.12 + buildingStep('lounge') * 0.20; },
  get heartChance() { return 0.18 * (1 + royalStep('heartc') + outfitSum('heart') + passiveSum('heart') + buildingStep('lounge') * 0.08); },
  get profit() { return (1 + royalStep('profit')) * this.boostMul; },
  get premium(){ return 0.02 + royalStep('prem') + outfitSum('prem') + passiveSum('prem'); },
  get attune() { return (1.6 + royalStep('attune') + passiveSum('attune')) * buff('attune'); },
  get offlineCap() { return BASE_OFFLINE_SECONDS + royalStep('offline'); },
  stationSpd(id) {
    const st = S.stations[typeOf(id)];
    return 1 + (st ? st.spdLvl * 0.04 : 0) + decorBonus(id, 'spd') + buildingStep(id) * 0.15;
  },
  stationStock(id) {
    const d = stationDef(id);
    return Math.round(d.stockMax * (1 + buildingStep(id) * 0.10));
  },
  stationPrem(id) {
    const st = S.stations[typeOf(id)];
    return this.premium + (st ? st.premLvl * 0.015 : 0);
  },
};

// --- construction ---------------------------------------------------------
// Every add* returns the key of what it placed, or null when there was no room
// (or nothing to add). Callers check room first with roomFor().
export function addStation(id) {
  const d = stationDef(id);
  if (!d || S.stations[id]) return null;
  if (!placeNew(id, 'station')) return null;
  S.stations[id] = { stock: 0, premStock: 0, buf: {}, cook: 0, spdLvl: 0, premLvl: 0 };
  return id;
}

export const copiesOf = type => Object.keys(S.stations).filter(k => typeOf(k) === type);

export function addStationCopy(type) {
  let n = 2;
  while (S.stations[type + '#' + n]) n++;
  const key = type + '#' + n;
  if (!placeNew(key, 'station', posOf(type) && { x: posOf(type)[0], y: posOf(type)[1] })) return null;
  S.stations[key] = { stock: 0, premStock: 0, buf: {}, cook: 0, spdLvl: 0, premLvl: 0 };
  return key;
}

export function addBlossom(el) {
  const slot = S.blossoms.reduce((m, b) => Math.max(m, b.slot), -1) + 1;
  const twin = S.blossoms.find(b => b.el === el);
  const near = twin && posOf('bl:' + twin.slot);
  if (!placeNew('bl:' + slot, 'blossom', near && { x: near[0], y: near[1] })) return null;
  S.blossoms.push({ slot, el, nectar: 0, max: 20, heartAt: 0, pop: null });
  return 'bl:' + slot;
}

export function addLounge() {
  const i = S.lounges.reduce((m, n) => Math.max(m, n), -1) + 1;
  if (!placeNew('lg:' + i, 'lounge')) return null;
  S.lounges.push(i);
  return 'lg:' + i;
}

export function addBuilding(id) {
  if (!BUILDINGS[id] || S.buildings[id]) return null;
  if (!placeNew(id, 'building')) return null;
  S.buildings[id] = true;
  return id;
}

export function addDecor(id) {
  if (S.decor.includes(id)) return null;
  const key = 'dc:' + S.decor.length;
  if (!placeNew(key, 'decor')) return null;
  S.decor.push(id);
  return key;
}

export function addAcademy() {
  S.features.academy = true;
  if (!S.place.academy) placeNew('academy', 'academy');
  return 'academy';
}

// --- the grid -------------------------------------------------------------
const C = GRID.cell;
export const lotOf = (c, r) => Math.floor(r / GRID.lot) * LOT_COLS + Math.floor(c / GRID.lot);
export const cellOwned = (c, r) =>
  c >= 0 && c < GRID.cols && r >= 0 && r < GRID.rows && S.land.includes(lotOf(c, r));
export const lotRect = lot => ({
  c: (lot % LOT_COLS) * GRID.lot, r: Math.floor(lot / LOT_COLS) * GRID.lot,
});
export const cellPx = (c, r) => [GRID.x0 + c * C, GRID.y0 + r * C];
export const pxCell = (x, y) => [Math.floor((x - GRID.x0) / C), Math.floor((y - GRID.y0) / C)];

// Where a thing on the grid stands: bottom centre of its footprint, which is
// what every sprite is drawn from.
export function anchor(p) {
  const [w, h] = FOOT[p.k];
  return [GRID.x0 + (p.c + w / 2) * C, GRID.y0 + (p.r + h) * C - 10];
}
export function posOf(key) {
  const p = S.place[key];
  return p ? anchor(p) : null;
}

function taken(except) {
  const m = new Set();
  for (const [key, p] of Object.entries(S.place)) {
    if (key === except) continue;
    const [w, h] = FOOT[p.k];
    for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) m.add((p.c + dx) + ',' + (p.r + dy));
  }
  return m;
}

export function canPlace(kind, c, r, except, used = taken(except)) {
  const [w, h] = FOOT[kind];
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) {
    if (!cellOwned(c + dx, r + dy) || used.has((c + dx) + ',' + (r + dy))) return false;
  }
  return true;
}

// The free spot nearest a point (or the top of the park when there is none).
export function findSpot(kind, near, except) {
  const used = taken(except);
  const [w, h] = FOOT[kind];
  const want = near || landCentre();
  let best = null, bestD = Infinity;
  for (let r = 0; r <= GRID.rows - h; r++) for (let c = 0; c <= GRID.cols - w; c++) {
    if (!canPlace(kind, c, r, except, used)) continue;
    const [x, y] = anchor({ c, r, k: kind });
    const d = Math.hypot(x - want.x, y - want.y);
    if (d < bestD) { bestD = d; best = { c, r }; }
  }
  return best;
}

export const roomFor = (kind, near) => !!findSpot(kind, near);

export function placeNew(key, kind, near) {
  const spot = findSpot(kind, near, key);
  if (!spot) return false;
  S.place[key] = { c: spot.c, r: spot.r, k: kind };
  return true;
}

export function moveTo(key, c, r) {
  const p = S.place[key];
  if (!p || !canPlace(p.k, c, r, key)) return false;
  p.c = c; p.r = r;
  return true;
}

// The middle of the land you own.
export function landCentre() {
  let x = 0, y = 0;
  for (const lot of S.land) {
    const { c, r } = lotRect(lot);
    const [px, py] = cellPx(c + GRID.lot / 2, r + GRID.lot / 2);
    x += px; y += py;
  }
  return { x: x / S.land.length, y: y / S.land.length };
}

// A lot is for sale when it shares an edge with one you own.
export function lotBuyable(lot) {
  if (lot < 0 || lot >= GRID.lotsX * GRID.lotsY || S.land.includes(lot)) return false;
  const lx = lot % LOT_COLS, ly = Math.floor(lot / LOT_COLS);
  const nb = [];
  if (lx > 0) nb.push(lot - 1);
  if (lx < GRID.lotsX - 1) nb.push(lot + 1);
  if (ly > 0) nb.push(lot - LOT_COLS);
  if (ly < GRID.lotsY - 1) nb.push(lot + LOT_COLS);
  return nb.some(n => S.land.includes(n));
}

export const nextLandCost = () => landCost(S.landBought || 0, incomePerSec());

export function buyLot(lot) {
  if (!lotBuyable(lot)) return 'no';
  if (!spend('coin', nextLandCost())) return 'coin';
  S.land.push(lot);
  S.landBought = (S.landBought || 0) + 1;
  syncWorld();
  return 'ok';
}

// Dev and migration: hand out land until this kind fits.
export function ensureRoom(kind) {
  while (kind && !roomFor(kind)) if (!grantNextLot()) return false;
  return true;
}

// Free land for migration and dev: the buyable lot nearest a point.
function grantNextLot(near = landCentre()) {
  let best = -1, bestD = Infinity;
  for (let lot = 0; lot < GRID.lotsX * GRID.lotsY; lot++) {
    if (!lotBuyable(lot)) continue;
    const { c, r } = lotRect(lot);
    const [x, y] = cellPx(c + GRID.lot / 2, r + GRID.lot / 2);
    const d = Math.hypot(x - near.x, y - near.y);
    if (d < bestD) { bestD = d; best = lot; }
  }
  if (best < 0) return false;
  S.land.push(best);
  return true;
}

export function syncWorld() {}

// --- research -------------------------------------------------------------
export const techCount = () => Object.keys(S.tech).length;
export const researched = id => !!S.tech[id];
export const techState = t => S.tech[t.id] ? 'done' : t.req.every(researched) ? 'open' : 'locked';
export const techGate = t => {
  const st = t.unlocks.find(([k]) => k === 'station');
  return st ? hiveGateFor(st[1]) : 0;
};
export const unlockedBy = (kind, type) =>
  TECH.find(t => t.unlocks.some(([k, ty]) => k === kind && ty === type));
export const isUnlocked = (kind, type) => {
  const t = unlockedBy(kind, type);
  return !!t && researched(t.id);
};

// Waggles put into a node so far, and whether it has all it needs.
export const kpIn = t => (S.techKp && S.techKp[t.id]) || 0;
export const kpFull = t => kpIn(t) >= techKp(t);

// Pour what waggles you have into a node, up to what it still needs.
export function pourKp(id) {
  const t = techDef(id);
  if (!t || S.tech[id] || !t.req.every(researched)) return 0;
  S.techKp = S.techKp || {};
  const n = Math.min(Math.floor(S.kp), techKp(t) - kpIn(t));
  if (n <= 0) return 0;
  S.kp -= n;
  S.techKp[id] = kpIn(t) + n;
  return n;
}

export function buyKp() {
  if (!spend('gem', WAGGLE.gems)) return false;
  S.kp += 1;
  return true;
}

// One trickles in every WAGGLE.every seconds while under the cap.
export function regenKp(seconds) {
  if (S.kp >= WAGGLE.cap) return;
  S.kp = Math.min(WAGGLE.cap, S.kp + seconds / WAGGLE.every);
}
export const kpNextIn = () => (S.kp >= WAGGLE.cap ? 0 : (1 - (S.kp % 1)) * WAGGLE.every);

export function research(id, free) {
  const t = techDef(id);
  if (!t) return 'no';
  if (S.tech[id]) return 'done';
  if (!t.req.every(researched)) return 'locked';
  if (!free && hivePower() < techGate(t)) return 'rank';
  if (!free && !kpFull(t)) return 'kp';
  if (!free && !spend('coin', techCost(t, incomePerSec()))) return 'coin';
  S.tech[id] = true;
  S.parkLevel = techCount();
  if (t.feature) S.features[t.feature] = true;
  if (t.bee) addBee(t.bee);
  return 'ok';
}

// --- the build menu -------------------------------------------------------
export function ownedCount(kind, type) {
  if (kind === 'station')  return copiesOf(type).length;
  if (kind === 'blossom')  return S.blossoms.filter(b => b.el === type).length;
  if (kind === 'lounge')   return S.lounges.length;
  if (kind === 'building') return S.buildings[type] ? 1 : 0;
  if (kind === 'academy')  return S.place.academy ? 1 : 0;
  if (kind === 'decor')    return S.decor.includes(type) ? 1 : 0;
  return 0;
}
// Park buildings and decorations are one each; decoration buffs stack, so
// copies would be free power.
export const buildLimit = kind => (['building', 'academy', 'decor'].includes(kind) ? 1 : Infinity);

export function buildCost(kind, type) {
  const n = ownedCount(kind, type), inc = incomePerSec();
  if (!n && STARTERS.some(([k, t]) => k === kind && t === type)) return 0;
  if (kind === 'station') {
    const d = stationDef(type);
    return n ? COPY.station(n, d) : Math.floor(Math.min(d.value / d.cook * 300 + 40, inc * 40 + 40));
  }
  if (kind === 'blossom') return COPY.blossom(n, inc);
  if (kind === 'lounge')  return COPY.lounge(n, inc);
  return Math.floor(inc * 45 + 80);
}

// Put a new one of these on the grid (anywhere free); the caller moves it to
// the spot the player chose.
export function addFresh(kind, type) {
  if (kind === 'station')  return S.stations[type] ? addStationCopy(type) : addStation(type);
  if (kind === 'blossom')  return addBlossom(type);
  if (kind === 'lounge')   return addLounge();
  if (kind === 'building') return addBuilding(type);
  if (kind === 'academy')  return addAcademy();
  if (kind === 'decor')    return addDecor(type);
  return null;
}

// Every bee in the park is one of the twelve. Granting one by element picks the
// cheapest you do not already have; a full roster pays out in jelly instead.
export function grantBee(rid) {
  if (S.bees.length >= ROSTER_MAX || S.bees.some(b => b.rid === rid)) {
    const def = beeDef(rid);
    if (def) give('jelly', RARITY[def.stars].jelly);
    return null;
  }
  const def = beeDef(rid);
  const home = posOf('lg:' + (S.lounges[0] ?? 0)) || [220, 700];
  const bee = {
    id: S.nextBeeId++, rid, el: def.el, level: 1,
    x: home[0] + (Math.random() - .5) * 60, y: home[1] - 40,
    vx: 0, vy: 0, mode: 'idle', t: 0,
    load: null, target: null, stam: 100, outfit: {},
    rank: 0, learned: [], pin: null,
  };
  S.bees.push(bee);
  return bee;
}

export function addBee(el) {
  const owned = new Set(S.bees.map(b => b.rid));
  const pick = BEE_ROSTER.filter(b => b.el === el && !owned.has(b.id))
                         .sort((a, b) => a.stars - b.stars)[0]
            || BEE_ROSTER.filter(b => !owned.has(b.id)).sort((a, b) => a.stars - b.stars)[0];
  return grantBee(pick ? pick.id : BEE_ROSTER[0].id);
}

export const hiveName = () => S.hiveName || 'Your hive';
export const beeName = b => b?.name || beeDef(b?.rid)?.name || 'Bee';
export const beeStars = b => beeDef(b.rid)?.stars || 1;

// Carrying and speed are per bee: rarity, then promotion level.
export function beeMul(b) {
  const r = RARITY[beeStars(b)] || RARITY[1];
  const lv = (b.level || 1) - 1;
  return { carry: r.carry * (1 + lv * levelCarry), speed: r.speed * (1 + lv * levelSpeed) };
}

// A bee's passive, scaled by its level, pooled across the park.
function passiveSum(stat) {
  let total = 0;
  for (const b of S.bees) {
    const def = beeDef(b.rid);
    if (def && def.stat === stat) total += def.step * (b.level || 1);
  }
  return total;
}

// --- building levels ------------------------------------------------------
export const buildingLevel = id => S.levels[id] || 1;
export const buildingMax = id => (UPGRADES[upgradeKind(id)] || { max: 1 }).max;
export const buildingStep = id => buildingLevel(id) - 1;

export function upgradeCost(id) {
  const lvl = buildingLevel(id);
  return Math.ceil((incomePerSec() * 75 + 150) * Math.pow(1.9, lvl - 1));
}

export function upgradeWax(id) {
  const lvl = buildingLevel(id);
  return lvl + 1 >= BUILD.waxFrom ? BUILD.wax(lvl + 1) : 0;
}

export const buildBusy = () => !!(S.build && Date.now() < S.build.until);
export const buildLeft = () => (buildBusy() ? (S.build.until - Date.now()) / 1000 : 0);

// Starts the work; it finishes on its own timer, or you pay gems to skip it.
export function startUpgrade(id) {
  // a build whose time is up but hasn't been collected yet still counts
  if (S.build && !buildBusy()) finishBuild();
  if (buildingLevel(id) >= buildingMax(id)) return 'max';
  if (buildBusy()) return 'busy';
  const wax = upgradeWax(id);
  if (S.coin < upgradeCost(id)) return 'coin';
  if (S.wax < wax) return 'wax';
  spend('coin', upgradeCost(id));
  if (wax) spend('wax', wax);
  S.build = { id, until: Date.now() + BUILD.seconds(buildingLevel(id)) * 1000 };
  return 'ok';
}

export function finishBuild() {
  if (!S.build) return null;
  const id = S.build.id;
  S.levels[id] = buildingLevel(id) + 1;
  S.build = null;
  return id;
}

export function rushBuild() {
  if (!buildBusy()) return false;
  if (!spend('gem', BUILD.rush(buildLeft()))) return false;
  finishBuild();
  return true;
}

export const waxPerSec = () =>
  BUILD.waxPerSec * S.lounges.length * buildingLevel('lounge');

// --- skills ---------------------------------------------------------------
export const skillReady = b => Date.now() >= (S.cd[b.rid] || 0);
export const skillLeft = b => Math.max(0, ((S.cd[b.rid] || 0) - Date.now()) / 1000);
export function startCooldown(b) {
  S.cd[b.rid] = Date.now() + skillCd(b.rid, b.level || 1) * 1000;
}

export const inClass = beeId => S.academy.classes.some(c => c.beeId === beeId);
export const classOf  = beeId => S.academy.classes.find(c => c.beeId === beeId);
export const attunedTo = (bee, el) => bee.el === el || (bee.learned || []).includes(el);

export const treeDone = () => TECH.every(t => S.tech[t.id]);

// --- economy --------------------------------------------------------------
export function dishValue(id, premium) {
  const d = stationDef(id);
  return d.value * stats.profit * (premium ? 10 : 1) * (1 + buildingStep(id) * 0.10) * (1 + decorBonus(id, 'profit'));
}

// A kitchen only runs when enough bees are attuned to each element it burns.
export function crewMissing(id) {
  const d = stationDef(id);
  if (!d || !d.crew) return null;
  const gaps = {};
  for (const [el, need] of Object.entries(d.crew)) {
    const have = S.bees.filter(b => attunedTo(b, el)).length;
    if (have < need) gaps[el] = need - have;
  }
  return Object.keys(gaps).length ? gaps : null;
}
export const crewOk = id => !crewMissing(id);

export function incomePerSec() {
  let total = 0;
  for (const id of Object.keys(S.stations)) {
    const d = stationDef(id);
    if (!d) continue;
    // crude: one dish per effective cook time, assuming nectar keeps up
    total += dishValue(id, false) / (d.cook / stats.stationSpd(id));
  }
  // scale by how many bees are feeding the line
  const working = S.bees.filter(b => !inClass(b.id)).length;
  const supply = Math.min(1, working / Math.max(1, Object.keys(S.stations).length * 2));
  return total * supply;
}

export function give(kind, n) {
  if (kind === 'wax') S.wax += n;
  else if (kind === 'jelly') S.jelly += n;
  else if (kind === 'coin') S.coin += n;
  else if (kind === 'heart') S.heart += n;
  else if (kind === 'gem') S.gem += n;
  else if (kind === 'pollen') S.pollen += n;
}

export function spend(kind, n) {
  if ((S[kind] || 0) < n) return false;
  S[kind] -= n;
  return true;
}
