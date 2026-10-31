import {
  S, stats, dishValue, give, inClass, attunedTo, incomePerSec,
  beeMul, crewOk, buildingStep, grantBee, setBuff, waxPerSec,
  buildBusy, finishBuild, startCooldown, skillReady, beeStars, posOf, copiesOf,
} from './state.js';
import {
  BLOSSOM_SLOTS, LOUNGE_SLOTS, STATIONS, stationDef, ELEMENTS, ACADEMY, ACADEMY_POS,
  BUILDINGS, COIN_TREE, ORDERS, WORLD, SUMMON, BEE_ROSTER, RARITY, ROSTER_MAX,
  SKILLS, currentBanner, FEATURED_SHARE, FEATURED_SHARE_2, beeDef, typeOf, HOTEL,
} from './data.js';

export const fx = [];          // floating numbers, coin pops, sparkles
export const pops = [];        // tappable bubbles above things

const BEE_SPEED = 72;
const HARVEST_TIME = 0.9;
const DEPOSIT_TIME = 0.5;
const STAM_PER_TRIP = 7;

export const blossomPos = b => posOf('bl:' + b.slot) || [0, 0];
// A station's attune multiplier follows its best input element, so lighting the
// shrine for Ember lifts every kitchen that burns Ember.
export const stationAttune = d =>
  Math.max(...Object.keys(d.inputs).map(el => stats.attuneFor(el)));
export const beeCarry = b => Math.max(1, Math.round(
  4 * stats.carry * beeMul(b).carry * (1 + (b.rank || 0) * ACADEMY.carryPerRank)));
export const beeSpeed = b =>
  BEE_SPEED * stats.speed * beeMul(b).speed * (1 + (b.rank || 0) * ACADEMY.speedPerRank);
export const loungePos  = i => posOf('lg:' + i);

// Where tube k of hotel i opens, in world space.
export function tubePos(i, k) {
  const p = loungePos(i);
  if (!p) return null;
  const sc = HOTEL.size / 128, [tx, ty] = HOTEL.tubes[k];
  return [p[0] + tx * sc, p[1] + ty * sc];
}
const SLEEPING = ['toRest', 'enter', 'rest', 'leave'];
export const asleep = b => b.mode === 'enter' || b.mode === 'rest';

// Dev: straight into bed, no flight.
export function tuckIn(bee) {
  const spot = freeTube(bee);
  if (!spot) return false;
  bee.restSlot = spot.h; bee.tube = spot.k; bee.mode = 'rest'; bee.t = 0; bee.stam = 5;
  [bee.x, bee.y] = tubePos(spot.h, spot.k);
  return true;
}

// A tube nobody else has, nearest hotel first.
function freeTube(bee) {
  const busy = new Set(S.bees.filter(b => b !== bee && SLEEPING.includes(b.mode))
                            .map(b => b.restSlot + ':' + b.tube));
  const hotels = [...S.lounges].sort((a, b) => {
    const pa = loungePos(a), pb = loungePos(b);
    return Math.hypot(pa[0] - bee.x, pa[1] - bee.y) - Math.hypot(pb[0] - bee.x, pb[1] - bee.y);
  });
  for (const h of hotels) for (let k = 0; k < HOTEL.tubes.length; k++) {
    if (!busy.has(h + ':' + k)) return { h, k };
  }
  return null;
}

function addFx(x, y, kind, text, tint) {
  fx.push({ x, y, kind, text, tint, t: 0, life: kind === 'coin' ? 1.1 : 1.4 });
}

export function popAt(x, y, kind, src) {
  if (pops.some(p => p.src === src)) return;
  pops.push({ x, y, kind, src, t: 0 });
}

// --- what a station still wants ------------------------------------------
function wants(id) {
  const d = stationDef(id), st = S.stations[id];
  const out = [];
  for (const [el, need] of Object.entries(d.inputs)) {
    const have = st.buf[el] || 0;
    if (have < need * 4) out.push(el);              // keep ~4 dishes buffered
  }
  return out;
}

function pickJob(bee) {
  const ids = Object.keys(S.stations)
    .filter(id => crewOk(id) && (!bee.pin || bee.pin === id));
  if (!ids.length || !S.blossoms.length) return null;
  let best = null, bestScore = -1;
  for (const id of ids) {
    for (const el of wants(id)) {
      for (const b of S.blossoms) {
        if (b.el !== el || b.nectar < 1) continue;
        const [bx, by] = blossomPos(b);
        const [sx, sy] = posOf(id);
        const dist = Math.hypot(bx - bee.x, by - bee.y) + Math.hypot(sx - bx, sy - by);
        // prefer an element you are attuned to (born or taught) and short trips
        let score = 1000 - dist * 0.6 + b.nectar * 2;
        if (attunedTo(bee, b.el)) score += 450;
        if (score > bestScore) { bestScore = score; best = { blossom: b, station: id }; }
      }
    }
  }
  return best;
}

function moveTo(bee, tx, ty, dt) {
  const dx = tx - bee.x, dy = ty - bee.y;
  const dist = Math.hypot(dx, dy);
  const sp = beeSpeed(bee);
  if (dist < 3) { bee.x = tx; bee.y = ty; return true; }
  const step = Math.min(dist, sp * dt);
  bee.x += dx / dist * step;
  bee.y += dy / dist * step;
  bee.vx = dx / dist;
  // Facing is sticky. A bee heading almost straight up or down has no sideways
  // travel to read, so she keeps the way she was already pointing instead of
  // snapping back to the default and looking like she is flying tail-first.
  if (Math.abs(dx) > 5) bee.face = dx < 0 ? -1 : 1;
  // gentle bob so flight reads as flight
  bee.bob = Math.sin(performance.now() / 160 + bee.id) * 2.5;
  return false;
}

function beeTick(bee, dt) {
  switch (bee.mode) {
    case 'idle': {
      if (bee.stam < HOTEL.tired && S.lounges.length) {
        const spot = freeTube(bee);
        if (spot) {
          bee.mode = 'toRest'; bee.restSlot = spot.h; bee.tube = spot.k;
          break;
        }
      }
      const job = pickJob(bee);
      if (!job) { bee.t = (bee.t || 0) + dt; bee.mode = 'loiter'; bee.loiter = 1.2; break; }
      bee.job = job; bee.mode = 'toFlower';
      break;
    }
    case 'loiter': {
      bee.loiter -= dt;
      const home = loungePos(S.lounges[bee.id % Math.max(1, S.lounges.length)] ?? 0) || [220, 600];
      moveTo(bee, home[0] + Math.sin(bee.id * 2 + performance.now() / 2200) * 70,
                  home[1] - 60 + Math.cos(bee.id * 3 + performance.now() / 2600) * 40, dt);
      if (bee.loiter <= 0) bee.mode = 'idle';
      break;
    }
    case 'toFlower': {
      const b = bee.job?.blossom;
      if (!b || !S.blossoms.includes(b)) { bee.mode = 'idle'; break; }
      const [x, y] = blossomPos(b);
      if (moveTo(bee, x, y - 16, dt)) { bee.mode = 'harvest'; bee.t = HARVEST_TIME; }
      break;
    }
    case 'harvest': {
      bee.t -= dt;
      if (bee.t <= 0) {
        const b = bee.job.blossom;
        const take = Math.min(beeCarry(bee), Math.floor(b.nectar));
        if (take <= 0) { bee.mode = 'idle'; break; }
        b.nectar -= take;
        bee.load = { el: b.el, n: take, attuned: attunedTo(bee, b.el) };
        bee.mode = 'toStation';
      }
      break;
    }
    case 'toStation': {
      const at = S.stations[bee.job.station] && posOf(bee.job.station);
      if (!at) { bee.mode = 'idle'; bee.load = null; break; }
      if (moveTo(bee, at[0], at[1] - 34, dt)) { bee.mode = 'deposit'; bee.t = DEPOSIT_TIME; }
      break;
    }
    case 'deposit': {
      bee.t -= dt;
      if (bee.t <= 0) {
        const st = S.stations[bee.job.station];
        const { el, n, attuned } = bee.load;
        st.buf[el] = (st.buf[el] || 0) + n;
        if (attuned) st.att = (st.att || 0) + n;
        bee.load = null;
        bee.stam -= STAM_PER_TRIP / stats.stamina;
        bee.mode = 'idle';
      }
      break;
    }
    // fly to a tube mouth, crawl in, sleep until rested, crawl out. The more
    // tired she is, the longer she sleeps.
    case 'toRest': {
      const p = tubePos(bee.restSlot, bee.tube || 0);
      if (!p) { bee.mode = 'idle'; break; }
      if (moveTo(bee, p[0], p[1], dt)) { bee.mode = 'enter'; bee.t = 0; }
      break;
    }
    case 'enter': {
      bee.t += dt;
      if (bee.t >= 0.45) { bee.mode = 'rest'; bee.t = 0; }
      break;
    }
    case 'rest': {
      bee.t += dt;
      bee.stam = Math.min(100, bee.stam + HOTEL.regen * dt * stats.stamina);
      // one heart bubble per hotel, over the roof, however many are asleep in it
      if (bee.t > 3 && Math.random() < 0.12 * dt && pops.length < 10) {
        const p = loungePos(bee.restSlot);
        if (p) popAt(p[0], p[1] - HOTEL.size * 0.98, 'heart', 'hotel' + bee.restSlot);
      }
      if (bee.stam >= 100 || !loungePos(bee.restSlot)) { bee.mode = 'leave'; bee.t = 0; }
      break;
    }
    case 'leave': {
      bee.t += dt;
      if (bee.t >= 0.35) { bee.mode = 'idle'; bee.t = 0; }
      break;
    }
  }
}

// --- stations -------------------------------------------------------------
function stationTick(id, dt) {
  const d = stationDef(id), st = S.stations[id];
  if (!crewOk(id)) return;        // nobody attuned to run it
  const spd = stats.stationSpd(id);

  if (st.cook > 0) {
    st.cook -= dt * spd;
    if (st.cook <= 0) {
      st.cook = 0;
      const ratio = st.cookAtt || 0;
      const premChance = stats.stationPrem(id) + ratio * 0.25 * stats.attune;
      let premium = Math.random() < premChance;
      if (S.premQueue > 0) { premium = true; S.premQueue--; }
      if (st.stock + st.premStock >= stats.stationStock(id)) {
        // overflow goes to the hauler's bag at half price, like the original
        S.bag += dishValue(id, premium) * 0.5 * (1 + ratio * (stationAttune(d) - 1));
      } else if (premium) st.premStock++;
      else st.stock++;
      st.lastAtt = ratio;
      st.cookAtt = 0;
    }
    return;
  }

  // start a new dish if every input is covered
  let ok = true, total = 0;
  for (const [el, need] of Object.entries(d.inputs)) {
    if ((st.buf[el] || 0) < need) { ok = false; break; }
    total += need;
  }
  if (!ok) return;
  const attBefore = st.att || 0;
  let bufTotal = Object.values(st.buf).reduce((a, b) => a + b, 0);
  const attRatio = bufTotal ? Math.min(1, attBefore / bufTotal) : 0;
  for (const [el, need] of Object.entries(d.inputs)) st.buf[el] -= need;
  st.att = Math.max(0, attBefore - total * attRatio);
  st.cookAtt = attRatio;
  st.cook = d.cook;
}

// --- blossoms -------------------------------------------------------------
function blossomTick(b, dt) {
  b.nectar = Math.min(b.max, b.nectar + 1.6 * stats.bloomFor(b.el) * dt);
  b.heartAt -= dt;
  if (b.heartAt <= 0) {
    b.heartAt = 12 + Math.random() * 14;
    if (Math.random() < stats.heartChance && pops.length < 10) {
      const [x, y] = blossomPos(b);
      popAt(x, y - 40, 'heart', 'bl' + b.slot);
    }
  }
}

// --- public ---------------------------------------------------------------
// Bees at their desks sit still by the chalkboard until the term is up.
function academyTick() {
  const now = Date.now();
  const AP = posOf('academy') || ACADEMY_POS;
  for (let i = S.academy.classes.length - 1; i >= 0; i--) {
    const c = S.academy.classes[i];
    const bee = S.bees.find(b => b.id === c.beeId);
    if (!bee) { S.academy.classes.splice(i, 1); continue; }
    const seat = S.academy.classes.indexOf(c);
    bee.x = AP[0] - 34 + seat * 34;
    bee.y = AP[1] - 46;
    bee.mode = 'study';
    if (now >= c.endsAt) {
      if (!bee.learned.includes(c.el)) bee.learned.push(c.el);
      bee.rank = Math.min(ACADEMY.maxRank, (bee.rank || 0) + 1);
      bee.mode = 'idle';
      S.academy.classes.splice(i, 1);
      popAt(AP[0], AP[1] - 96, 'heart', 'grad' + bee.id);
      fx.push({ x: AP[0], y: AP[1] - 70, kind: 'text',
                text: 'Graduated!', tint: '#ffe06a', t: 0, life: 2 });
    }
  }
}

// --- coin tree ------------------------------------------------------------
function treeTick(dt) {
  S.treeAt -= dt;
  if (S.treeAt > 0) return;
  S.treeAt = COIN_TREE.every;
  const share = COIN_TREE.share * (1 + buildingStep('coin_tree') * 0.25);
  const worth = Math.max(5, incomePerSec() * share * COIN_TREE.every);
  const [bx, by] = posOf('coin_tree') || [220, 600];
  if (S.coins.length >= COIN_TREE.maxOnGround) { S.bag += worth * 0.5; return; }
  S.coins.push({
    x: bx - 60 + Math.random() * 120,
    y: by + 4 + Math.random() * 30,
    v: worth, t: 0,
  });
}

function coinsTick(dt) {
  for (let i = S.coins.length - 1; i >= 0; i--) {
    const c = S.coins[i];
    c.t += dt;
    if (c.t > COIN_TREE.rots) { S.bag += c.v * 0.5; S.coins.splice(i, 1); }
  }
}

export function collectCoin(c) {
  const i = S.coins.indexOf(c);
  if (i < 0) return 0;
  S.coins.splice(i, 1);
  give('coin', c.v);
  addFx(c.x, c.y - 10, 'coin', '+' + c.v, '#ffd24a');
  return c.v;
}

// --- parcel desk ----------------------------------------------------------
// Orders are for a dish, so they name the kitchen type and any copy can fill them.
export const typeStock = type => copiesOf(type).reduce((n, k) =>
  n + S.stations[k].stock + S.stations[k].premStock, 0);

export function rollOrder() {
  const ids = Object.keys(S.stations).filter(k => !k.includes('#'));
  if (!ids.length) return null;
  const id = ids[Math.floor(Math.random() * ids.length)];
  const d = stationDef(id);
  const qty = Math.round(d.stockMax * (0.35 + Math.random() * 0.55));
  const weight = STATIONS.findIndex(s => s.id === id) + 1;
  const bonus = 1 + buildingStep('order_board') * 0.15;
  return {
    station: id, qty,
    gem: Math.max(3, Math.round(weight * (1.6 + Math.random() * 1.6) * bonus)),
    pollen: Math.max(2, Math.round(weight * (1.1 + Math.random() * 1.2) * bonus)),
    expires: Date.now() + ORDERS.life * 1000,
  };
}

function ordersTick(dt) {
  const now = Date.now();
  for (let i = S.orders.length - 1; i >= 0; i--)
    if (S.orders[i].expires < now) S.orders.splice(i, 1);
  const slots = ORDERS.slots + (buildingStep('order_board') >= 2 ? 1 : 0)
                             + (buildingStep('order_board') >= 4 ? 1 : 0);
  S.orderAt -= dt;
  if (S.orderAt > 0 || S.orders.length >= slots) return;
  S.orderAt = ORDERS.every;
  const o = rollOrder();
  if (o) S.orders.push(o);
}

export function fillOrder(o) {
  const type = typeOf(o.station);
  if (typeStock(type) < o.qty) return false;
  let left = o.qty;
  for (const k of copiesOf(type)) {
    const st = S.stations[k];
    const p = Math.min(st.premStock, left); st.premStock -= p; left -= p;
    const n = Math.min(st.stock, left);     st.stock -= n;     left -= n;
    if (!left) break;
  }
  give('gem', o.gem); give('pollen', o.pollen);
  S.orders.splice(S.orders.indexOf(o), 1);
  const [bx, by] = posOf('order_board') || [220, 600];
  addFx(bx, by - 70, 'text', `+${o.gem} gems`, '#8fdcff');
  return true;
}

// --- the hatchery ---------------------------------------------------------
// One pull: weighted by rarity, with a pity counter that forces a Legendary.
// A bee you already have, or one you have no room for, pays out in jelly.
export function summon() {
  const lvl = buildingStep('hatchery');
  const pity = Math.max(8, SUMMON.pity - lvl * 2);
  const bump = lvl * 0.006;
  let stars;
  if (S.pity + 1 >= pity) stars = 3;
  else {
    const roll = Math.random();
    const legendary = SUMMON.rates[3] + bump;
    stars = roll < legendary ? 3
          : roll < legendary + SUMMON.rates[2] ? 2 : 1;
  }
  S.pity = stars === 3 ? 0 : S.pity + 1;

  const banner = currentBanner();
  let pick = null;
  if (stars === 3) {
    // lose a Legendary to a non-featured bee once, and the next one is hers
    if (S.lostFeatured || Math.random() < FEATURED_SHARE) {
      pick = beeDef(banner.star);
      S.lostFeatured = false;
    } else {
      S.lostFeatured = true;
    }
  } else if (stars === 2 && Math.random() < FEATURED_SHARE_2) {
    const up = banner.up.map(beeDef).filter(b => b && b.stars === 2);
    if (up.length) pick = up[Math.floor(Math.random() * up.length)];
  }
  if (!pick) {
    const owned = new Set(S.bees.map(b => b.rid));
    const pool = BEE_ROSTER.filter(b => b.stars === stars);
    const fresh = pool.filter(b => !owned.has(b.id));
    const from = fresh.length ? fresh : pool;
    pick = from[Math.floor(Math.random() * from.length)];
  }
  const bee = grantBee(pick.id);         // pays out in jelly when it cannot join
  return { def: pick, stars, isNew: !!bee, featured: pick.id === currentBanner().star,
           jelly: bee ? 0 : RARITY[stars].jelly };
}

// --- skills ---------------------------------------------------------------
export function useSkill(bee) {
  const sk = SKILLS[bee.rid];
  if (!sk || !skillReady(bee)) return false;
  const el = bee.el;
  switch (sk.kind) {
    case 'topup':
      for (const id of Object.keys(S.stations)) {
        const d = stationDef(id);
        if (d.inputs[el] == null) continue;
        const st = S.stations[id];
        st.buf[el] = (st.buf[el] || 0) + sk.mag;
        st.att = (st.att || 0) + sk.mag;
      }
      break;
    case 'premium':
      S.premQueue = (S.premQueue || 0) + sk.mag;
      break;
    case 'rushcook':
      for (const id of Object.keys(S.stations)) {
        if (S.stations[id].cook > 0) S.stations[id].cook = 0.01;
      }
      break;
    case 'haste':   setBuff('haste',  sk.mag, sk.dur); break;
    case 'carry':   setBuff('carry',  sk.mag, sk.dur); break;
    case 'profit':  setBuff('profit', sk.mag, sk.dur); break;
    case 'attune':  setBuff('attune', sk.mag, sk.dur); break;
    case 'hearts':
      for (const bl of S.blossoms) {
        const [x, y] = blossomPos(bl);
        popAt(x, y - 40, 'heart', 'bl' + bl.slot);
      }
      break;
    case 'bloomfill':
      for (const bl of S.blossoms) bl.nectar = bl.max;
      break;
    case 'stamina':
      for (const b of S.bees) b.stam = Math.min(100, b.stam + sk.mag);
      break;
    case 'deliver':
      for (const b of S.bees) {
        if (b.load && b.job && S.stations[b.job.station]) {
          const st = S.stations[b.job.station];
          st.buf[b.load.el] = (st.buf[b.load.el] || 0) + b.load.n;
          if (b.load.attuned) st.att = (st.att || 0) + b.load.n;
          b.load = null; b.mode = 'idle';
        }
      }
      break;
    case 'coins': {
      const worth = Math.max(10, incomePerSec() * 20);
      for (let i = 0; i < sk.mag; i++) {
        if (S.coins.length >= COIN_TREE.maxOnGround + 6) break;
        const [tx, ty] = posOf('coin_tree') || [220, 600];
        S.coins.push({ x: tx - 70 + Math.random() * 140, y: ty + 4 + Math.random() * 34,
                       v: worth, t: 0 });
      }
      break;
    }
  }
  startCooldown(bee);
  fx.push({ x: bee.x, y: bee.y - 30, kind: 'text', text: sk.name, tint: '#ffe06a', t: 0, life: 1.6 });
  return true;
}

export function tick(dt) {
  dt = Math.min(dt, 0.1);
  if (S.features.academy) academyTick();
  if (S.lounges.length) give('wax', waxPerSec() * dt);
  if (S.build && !buildBusy()) finishBuild();
  if (S.buildings.coin_tree) { treeTick(dt); coinsTick(dt); }
  if (S.buildings.order_board) ordersTick(dt);
  for (const b of S.blossoms) blossomTick(b, dt);
  for (const id of Object.keys(S.stations)) stationTick(id, dt);
  for (const bee of S.bees) { if (!inClass(bee.id)) beeTick(bee, dt); }
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt;
    if (f.t >= f.life) fx.splice(i, 1);
  }
  for (const p of pops) p.t += dt;
}

export function sellStation(id) {
  const st = S.stations[id], d = stationDef(id);
  if (!st || (st.stock + st.premStock) === 0) return 0;
  const att = 1 + (st.lastAtt || 0) * (stationAttune(d) - 1);
  const amount = (st.stock * dishValue(id, false) + st.premStock * dishValue(id, true)) * att;
  if (st.premStock) give('pollen', st.premStock);
  st.stock = 0; st.premStock = 0;
  give('coin', amount);
  const [x, y] = posOf(id) || [220, 600];
  addFx(x, y - 50, 'coin', '+' + amount, '#ffd24a');
  return amount;
}

export const sellType = type => copiesOf(type).reduce((n, k) => n + sellStation(k), 0);

export function sellAll() {
  let total = 0;
  for (const id of Object.keys(S.stations)) total += sellStation(id);
  return total;
}

export function collectPop(p) {
  const i = pops.indexOf(p);
  if (i < 0) return;
  pops.splice(i, 1);
  if (p.kind === 'heart') {
    give('heart', 1);
    addFx(p.x, p.y, 'heart', '+1', '#ff6b8a');
  }
}

export function collectBag() {
  if (S.bag <= 0) return 0;
  const n = S.bag; S.bag = 0;
  give('coin', n);
  const [x, y] = posOf(Object.keys(S.stations)[0]) || [0, 0];
  addFx(x, y - 90, 'coin', '+' + n, '#ffd24a');
  return n;
}

export function rushBlossoms() {
  for (const b of S.blossoms) b.nectar = b.max;
}

// Offline catch-up: run the economy forward at a discount.
export function offlineEarnings(seconds) {
  const capped = Math.min(seconds, stats.offlineCap);
  if (capped < 60) return { coin: 0, seconds: 0 };
  let perSec = 0;
  for (const id of Object.keys(S.stations)) {
    const d = stationDef(id);
    perSec += dishValue(id, false) / (d.cook / stats.stationSpd(id));
  }
  const working = S.bees.filter(b => !inClass(b.id)).length;
  const supply = Math.min(1, working / Math.max(1, Object.keys(S.stations).length * 2));
  const coin = perSec * supply * capped * 0.45;
  return { coin, seconds: capped };
}
