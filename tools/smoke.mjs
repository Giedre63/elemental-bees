// Headless economy check: no DOM, just the sim. A greedy "player" researches
// whatever it can afford, builds what research unlocked, keeps two blossoms per
// element it cooks with, and buys land when it runs out of room.
// Timers (builds, orders, boosts) read Date.now(), so the clock has to move
// with the sim or an hour of play would finish no upgrades at all.
let clockMs = Date.now();
Date.now = () => clockMs;

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: k => store.delete(k),
};

const {
  S, incomePerSec, research, techState, techGate, hivePower, isUnlocked, ownedCount,
  buildCost, buildLimit, addFresh, roomFor, lotBuyable, buyLot, nextLandCost, spend,
  startUpgrade, upgradeCost, buildBusy, buildingLevel, buildingMax, kpFull, pourKp,
} = await import('../src/state.js');
const { tick, sellAll } = await import('../src/sim.js');
const { TECH, techCost, STATIONS, BUILDING_IDS, DECOR, ELEMENTS } = await import('../src/data.js');
const { fmt, clock } = await import('../src/num.js');

const DT = 1 / 20;
let t = 0, lots = 0, built = 0, ups = 0;
const why = {};

// what a sensible player wants on the map, in order
function wishlist() {
  const w = [['lounge', 'lounge']];
  for (const d of STATIONS) {
    w.push(['station', d.id]);
    for (const el of Object.keys(d.inputs)) w.push(['blossom', el], ['blossom', el]);
  }
  w.push(['academy', 'academy']);
  for (const id of BUILDING_IDS) w.push(['building', id]);
  for (const id of Object.keys(DECOR)) w.push(['decor', id]);
  return w;
}

function play() {
  // research whenever the next node is ready and affordable
  {
    const inc = incomePerSec(), power = hivePower();
    const open = TECH.filter(n => techState(n) === 'open' && power >= techGate(n))
                     .sort((a, b) => techCost(a, inc) - techCost(b, inc) || a.n - b.n);
    for (const n of open) if (!kpFull(n)) pourKp(n.id);
    const go = open.find(n => kpFull(n) && S.coin >= techCost(n, inc));
    if (go) { research(go.id); S.gem += 2; return; }
    // saving up: don't spend more than a fifth of the next node's price on building
    play.budget = open.length ? techCost(open[0], inc) * 0.2 : Infinity;
  }
  // then build: count how many of each the wishlist asks for
  const want = {};
  for (const [k, ty] of wishlist()) {
    const id = k + ':' + ty;
    want[id] = (want[id] || 0) + 1;
    if (!isUnlocked(k, ty) || ownedCount(k, ty) >= Math.min(want[id], buildLimit(k))) continue;
    if (!roomFor(k)) {
      const lot = [...Array(40).keys()].find(lotBuyable);
      if (lot != null && S.coin >= nextLandCost() && buyLot(lot) === 'ok') lots++;
      return;
    }
    const c = buildCost(k, ty);
    if (c > play.budget && ownedCount(k, ty) > 0) continue;   // a copy can wait
    if (spend('coin', c)) { addFresh(k, ty); built++; }
    return;
  }
  // then research: the cheapest open node
  const inc = incomePerSec(), power = hivePower();
  const open = TECH.filter(n => techState(n) === 'open')
                   .sort((a, b) => techCost(a, inc) - techCost(b, inc));
  const ready = open.find(n => power >= techGate(n));
  if (ready) {
    if (!kpFull(ready)) { pourKp(ready.id); return; }      // waiting on waggles
    if (S.coin >= techCost(ready, inc)) { research(ready.id); S.gem += 2; }
    return;
  }
  // stuck behind Hive Rank: level up the cheapest building
  if (open.length && !buildBusy()) {
    const ids = [...Object.keys(S.stations), ...Object.keys(S.buildings)]
      .filter(id => buildingLevel(id) < buildingMax(id))
      .sort((a, b) => upgradeCost(a) - upgradeCost(b));
    const r = ids[0] && startUpgrade(ids[0]);
    if (r === 'ok') { ups++; if (process.env.DEBUG && ups < 6) console.log('up', ids[0], buildingLevel(ids[0]), JSON.stringify(S.build), new Date(clockMs).toISOString()); } else if (process.env.DEBUG) why[r] = (why[r] || 0) + 1;
  }
}

function step(seconds) {
  for (let i = 0; i < seconds / DT; i++) {
    tick(DT);
    t += DT;
    clockMs += DT * 1000;
    if (i % 80 === 0) sellAll();
    if (i % 10 === 0) play();
  }
}

for (const id of ['grill', 'emberbl', 'bee1', 'hotel']) research(id, true);

for (const mark of [60, 300, 900, 1800, 3600]) {
  step(mark - t);
  console.log(
    `${clock(t).padEnd(9)} research ${String(S.parkLevel).padStart(2)}/${TECH.length}` +
    `  coin ${fmt(S.coin).padStart(8)}` +
    `  income/s ${fmt(incomePerSec()).padStart(8)}` +
    `  bees ${S.bees.length}  blossoms ${S.blossoms.length}` +
    `  kitchens ${Object.keys(S.stations).length}  lots ${S.land.length}`
  );
}
const stalled = S.bees.filter(b => b.mode === 'loiter').length;
console.log(`\nbees idle at the end: ${stalled}/${S.bees.length}`);
console.log(`things built: ${built}, land lots bought: ${lots}, upgrades: ${ups}`);
if (process.env.DEBUG) {
  const { STATIONS: ST } = await import('../src/data.js');
  console.log('tech', Object.keys(S.tech).join(','));
  for (const d of ST) console.log(d.id, isUnlocked('station', d.id), ownedCount('station', d.id), buildCost('station', d.id), roomFor('station'));
  console.log('hive', hivePower(), 'bees', S.bees.map(b => b.el + ':' + b.mode).join(' '));
}
if (process.env.DEBUG) console.log('upgrade fails', why, 'wax', S.wax, 'build', JSON.stringify(S.build));
if (process.env.DEBUG) console.log('levels', JSON.stringify(S.levels), 'buildings', Object.keys(S.buildings));
if (process.env.DEBUG) {
  const { TECH: TT, techCost: tc, techKp: tk } = await import('../src/data.js');
  console.log('done:', Object.keys(S.tech).join(','), '| kp', S.kp.toFixed(1));
  for (const n of TT.filter(n => techState(n) === 'open')) console.log(' open', n.id, 'cost', tc(n, incomePerSec()), 'kp', tk(n), 'in', (S.techKp || {})[n.id] || 0, 'gate', techGate(n), 'hive', hivePower());
}
