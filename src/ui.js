import {
  S, stats, save, spend, give, addBee, dishValue, treeDone,
  incomePerSec, inClass, beeName, beeStars, beeMul, crewMissing, crewOk,
  buildingLevel, buildingMax, buildingStep, upgradeCost, upgradeWax,
  startUpgrade, buildBusy, buildLeft, rushBuild, waxPerSec,
  hivePower, hiveGateFor, hiveGateMet, skillReady, skillLeft, buffLeft,
  findSpot, canPlace, moveTo as moveItem, copiesOf, addStationCopy, addBlossom, addLounge,
  roomFor, buyLot, nextLandCost, lotBuyable, wipe,
  techCount, researched, techState, techGate, unlockedBy, isUnlocked, research,
  kpIn, kpFull, pourKp, buyKp, kpNextIn,
  ownedCount, buildLimit, buildCost, addFresh, decorArea, decorTargets, decorBonus, posOf,
} from './state.js';
import {
  TECH, techDef, techCost, STARTERS, BUILDING_IDS, STATIONS, TECH_TEXT, FEATURE_TEXT, FOOT,
  BEE_TEXT, CHAPTERS, WAGGLE, techKp, DECOR_RANGE, RIVALS, GLOBAL_LAB, labCost, stationSpdCost, stationPremCost,
  ROYAL_LAB, royalCost, OUTFITS, OUTFIT_SLOTS, outfitUpCost, DECOR, SHOP, ELEMENTS, BOOST_SECONDS, ACADEMY, ELEMENT_IDS,
  BUILDINGS, STORIES, PRESS, SHRINE, ORDERS, UPGRADES, upgradeKind, stationDef,
  BEE_ROSTER, beeDef, RARITY, ROSTER_MAX, BEE_MAX_LEVEL, promoteCost, SUMMON,
  SKILLS, skillOf, skillCd, currentBanner, BANNER_HOURS, FEATURED_SHARE,
  HIVE_GATE, BUILD, typeOf, copyNo, GRID, HOTEL,
} from './data.js';
import { fmt, pct, clock } from './num.js';
import { sellStation, sellType, typeStock, collectBag, rushBlossoms, fillOrder, summon, useSkill } from './sim.js';
import { E, clearHold } from './edit.js';
import { wraps, wornUrl } from './wear.js';
import { viewCentre, lookBelowPanel } from './render.js';
import { spriteUrl } from './assets.js';

const $ = s => document.querySelector(s);
const sheet = $('#sheet'), body = $('#sheet-body'), title = $('#sheet-title');
const nav = $('#nav'), tip = $('#tip');
let tab = null, outfitSlot = 'hat', beeIdx = 0;

// ---------------------------------------------------------------- helpers
export function art(name) {
  const u = spriteUrl(name);
  return u ? `background-image:url('${u}')` : 'background:#0001;border-radius:4px';
}
const icon = n => `<i class="ic" style="${art(n)}"></i>`;

// a bee portrait with its kit layered on, same anchors the canvas uses
export function beeFig(b, size = 84) {
  const top = b.outfit && b.outfit.clothes;
  const dressed = top && wraps(top) && wornUrl(b.el, top);
  const kit = OUTFIT_SLOTS.filter(s => b.outfit && b.outfit[s] && !(s === 'clothes' && dressed))
    .map(s => `<span class="layer l-${s}" style="${art('fit_' + b.outfit[s])}"></span>`).join('');
  const base = dressed ? `background-image:url('${dressed}')` : art('bee_' + b.el);
  return `<span class="beefig" style="width:${size}px;height:${size}px">
    <span class="layer" style="${base}"></span>${kit}</span>`;
}

const stars = n => `<span class="stars">` + [1, 2, 3].map(i =>
  `<i class="ic st" style="${art(i <= n ? 'icon_star' : 'icon_star_off')}"></i>`).join('') + '</span>';

// "Ember Grill", or "Ember Grill 2" for a second copy.
export const kitchenName = key =>
  stationDef(key).name + (copyNo(key) > 1 ? ' ' + copyNo(key) : '');

const statLabelFull = s => ({
  carry: 'Carrying Capacity', speed: 'Flight Speed', heart: 'Flower Heart Chance',
  prem: 'Premium Chance', bloom: 'Blossom Regrowth', attune: 'Attunement Bonus',
}[s] || s);

// Every building takes levels. One row, same shape everywhere.
function upgradeRow(id) {
  const kind = UPGRADES[upgradeKind(id)];
  if (!kind) return '';
  const lv = buildingLevel(id), max = buildingMax(id);
  const maxed = lv >= max;
  const mine = S.build && S.build.id === id;

  if (mine) {
    return `<div class="card up building">
      <div class="meta"><h3>Building to Level ${lv + 1}</h3>
        <small>${clock(buildLeft())} left</small></div>
      <button class="buy" id="do-rush">${icon('icon_gem')}${BUILD.rush(buildLeft())}</button></div>`;
  }
  const cost = upgradeCost(id), wax = upgradeWax(id);
  const busy = buildBusy();
  const can = !maxed && !busy && S.coin >= cost && S.wax >= wax;
  const price = maxed ? 'Max'
    : busy ? 'Site busy'
    : icon('icon_coin') + fmt(cost) + (wax ? ' ' + icon('icon_wax') + wax : '');
  return `<div class="card up">
    <div class="meta"><h3>Level ${lv}<small> / ${max}</small></h3>
      <small>${kind.per.join(' \u00b7 ')}${maxed ? '' :
        ' \u00b7 takes ' + clock(BUILD.seconds(lv))}</small></div>
    <button class="buy" id="do-upgrade" ${can ? '' : 'disabled'}>${price}</button></div>`;
}

function wireUpgrade(id, rerender) {
  const b = body.querySelector('#do-upgrade');
  if (b) b.onclick = () => {
    const r = startUpgrade(id);
    if (r === 'busy') return toast('Another building is already going up');
    if (r === 'coin') return toast('Not enough honey');
    if (r === 'wax')  return toast('Not enough beeswax');
    if (r !== 'ok') return;
    toast('Work started \u00b7 ' + clock(BUILD.seconds(buildingLevel(id))));
    save(); syncHUD(); rerender();
  };
  const r = body.querySelector('#do-rush');
  if (r) r.onclick = () => {
    if (!rushBuild()) return toast('Not enough gems');
    toast('Finished \u00b7 Lv.' + buildingLevel(id));
    save(); syncHUD(); rerender();
  };
}

function crewRow(id) {
  const d = stationDef(id);
  const gaps = crewMissing(id);
  const need = Object.entries(d.crew || {}).map(([el, n]) =>
    `${icon('sigil_' + el)}${n} ${ELEMENTS[el].name}`).join('  ');
  // where the missing bees could come from, in the order you'd reach them
  const ways = [];
  for (const el of Object.keys(gaps || {})) {
    const t = TECH.find(n => n.bee === el && !researched(n.id));
    if (t) ways.push(`research <b>${t.name}</b> (it brings a ${ELEMENTS[el].name} bee)`);
  }
  if (gaps && S.place.academy) ways.push('teach a bee at the Snail Academy');
  if (gaps && S.buildings.hatchery) ways.push('hatch one at the Brood Cells');
  return `<div class="card ${gaps ? 'locked' : ''}">
    <div class="meta"><h3>Crew ${gaps ? 'short' : 'ready'}</h3>
      <small>Needs ${need} bee${Object.values(d.crew || {}).some(n => n > 1) ? 's' : ''} to run.
      ${gaps ? (ways.length ? 'To get one: ' + ways.join(', or ') + '.' : '') : ''}</small></div>
    ${gaps ? icon('icon_lock') : '<div class="done">\u2713</div>'}</div>`;
}

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

export function showTip(x, y, head, text) {
  tip.innerHTML = `<h4>${head}</h4><p>${text}</p>`;
  tip.classList.remove('hidden');
  const r = $('#app').getBoundingClientRect();
  tip.style.left = Math.max(10, Math.min(r.width - 10 - tip.offsetWidth, x - tip.offsetWidth / 2)) + 'px';
  tip.style.top = Math.max(70, y - tip.offsetHeight - 14) + 'px';
  clearTimeout(showTip.t);
  showTip.t = setTimeout(() => tip.classList.add('hidden'), 2600);
}

// ---------------------------------------------------------------- HUD

// ---- HUD tooltips --------------------------------------------------------
// Tap a chip to find out what the thing is and where it comes from.
const HUD_TIPS = {
  coin:   ['Honey Coins', 'Spent on research, buildings, land and upgrades. Bees earn them by hauling dishes home.'],
  heart:  ['Flower Hearts', 'Drop when a bee works a blossom. They buy Lab and Royal Lab upgrades.'],
  gem:    ['Amber Gems', 'The rare one. Summons eggs at the Brood Cells, buys outfits, and finishes a build now.'],
  jelly:  ['Royal Jelly', 'Levels a bee up. Comes from duplicate eggs and from parcel orders.'],
  wax:    ['Beeswax', 'Bee hotels make it, slowly. Building upgrades from Lv.3 need it.'],
  kp:     ['Waggles', 'The waggle dance: how bees share what they know. One comes every ' + clock(WAGGLE.every) +
           ", even while you're away, up to " + WAGGLE.cap + '. Research needs them poured in.'],
  pollen: ['Pollen', 'Premium dishes shed it. Levels up the clothes you already own.'],
};

export function hudTip(key) {
  const t = HUD_TIPS[key];
  if (!t) return;
  document.querySelectorAll('.hudtip').forEach(e => e.remove());
  const chip = document.getElementById('chip-' + key);
  const el = document.createElement('div');
  el.className = 'hudtip';
  let rate = '';
  if (key === 'coin') rate = `<b>${fmt(Math.round(incomePerSec()))}/s</b> right now`;
  if (key === 'wax')  rate = `<b>${waxPerSec().toFixed(2)}/s</b> from ${S.lounges.length} hotel${S.lounges.length === 1 ? '' : 's'}`;
  if (key === 'kp')   rate = S.kp >= WAGGLE.cap ? `<b>Full.</b> Spend some on research.`
    : `Next one in <b>${clock(kpNextIn())}</b>. Tap + to buy one for ${WAGGLE.gems} gems.`;
  el.innerHTML = `<h4>${t[0]}</h4><p>${t[1]}</p>${rate ? `<p class="rate">${rate}</p>` : ''}`;
  document.getElementById('app').appendChild(el);
  const r = chip.getBoundingClientRect();
  const ar = document.getElementById('app').getBoundingClientRect();
  const w = el.offsetWidth;
  el.style.left = Math.max(6, Math.min(ar.width - w - 6, r.left - ar.left + r.width / 2 - w / 2)) + 'px';
  el.style.top = (r.bottom - ar.top + 7) + 'px';
  clearTimeout(hudTip.t);
  hudTip.t = setTimeout(() => el.remove(), 3600);
}

export function wireHudTips() {
  for (const k of Object.keys(HUD_TIPS)) {
    const c = document.getElementById('chip-' + k);
    if (c) { c.style.cursor = 'pointer'; c.onclick = () => hudTip(k); }
  }
}

export function syncHUD() {
  $('#chip-coin span').textContent = fmt(S.coin);
  $('#chip-heart span').textContent = fmt(S.heart);
  $('#chip-gem span').textContent = fmt(S.gem);
  const pol = $('#chip-pollen');
  pol.classList.toggle('hidden', !S.features.outfits);
  pol.querySelector('span').textContent = fmt(S.pollen);
  const wx = $('#chip-wax');
  wx.classList.toggle('hidden', !S.lounges.length);
  wx.querySelector('span').textContent = fmt(S.wax);
  // hive rank badge, and a note when you pass another hive
  const st = standings(), me = st.find(r => r.me);
  $('#rank-pos').textContent = '#' + me.pos;
  $('#rank-pts').textContent = 'Hive Rank ' + fmt(me.score);
  if (S.lastPos && me.pos < S.lastPos) {
    const passed = st[me.pos];
    toast(`You passed ${passed ? passed.name : 'a hive'}. Now #${me.pos} in the county.`);
  }
  S.lastPos = me.pos;
  // waggles: count, and a bar filling towards the next one
  const kp = $('#chip-kp');
  // bought ones can take you past the cap; then just show how many you hold
  kp.querySelector('span').textContent = S.kp > WAGGLE.cap ? `${Math.floor(S.kp)}` : `${Math.floor(S.kp)}/${WAGGLE.cap}`;
  kp.querySelector('.kpbar i').style.width = (S.kp >= WAGGLE.cap ? 100 : Math.round((S.kp % 1) * 100)) + '%';
  kp.classList.toggle('full', S.kp >= WAGGLE.cap);
  const jel = $('#chip-jelly');
  jel.classList.toggle('hidden', !S.buildings.hatchery && !S.jelly);
  jel.querySelector('span').textContent = fmt(S.jelly);

  const live = stats.boostActive;
  const bt = $('#boost');
  bt.classList.toggle('live', live);
  bt.querySelector('.boost-x').textContent = 'x' + stats.boostMul.toFixed(1);
  bt.querySelector('.boost-sub').textContent = live
    ? clock((S.boostUntil - Date.now()) / 1000)
    : 'free boost';

  const bag = $('#bag');
  bag.classList.toggle('hidden', !S.features.autosell || S.bag <= 0);
  bag.querySelector('.bag-amt').textContent = fmt(S.bag);

  nav.querySelector('[data-tab="lab"]').classList.toggle('hidden', !S.features.lab);
  nav.querySelector('[data-tab="royal"]').classList.toggle('hidden', !S.features.royal);
  nav.querySelector('[data-tab="bees"]').classList.toggle('hidden', !S.features.outfits);

  const inc = incomePerSec(), power = hivePower();
  const affordable = TECH.some(t => techState(t) === 'open' && power >= techGate(t)
    && (kpFull(t) ? S.coin >= techCost(t, inc) : S.kp >= 1));
  nav.querySelector('[data-tab="park"]').classList.toggle('ping', affordable);
}

// ---------------------------------------------------------------- rail
export function syncRail() {
  const rail = $('#rail');
  // one stack per dish: copies of a kitchen share it
  const ids = Object.keys(S.stations).filter(k => !k.includes('#'));
  if (rail.children.length !== ids.length) {
    rail.innerHTML = ids.map(id => {
      const d = stationDef(id);
      return `<div class="stack" data-id="${id}"><i style="${art(d.dishSprite)}"></i>
        <b>${icon('icon_coin')}<span>0</span></b></div>`;
    }).join('');
    rail.querySelectorAll('.stack').forEach(el => el.onclick = () => {
      if (sellType(el.dataset.id) > 0) save();
    });
  }
  for (const el of rail.children) {
    let n = 0, prem = 0, worth = 0;
    for (const id of copiesOf(el.dataset.id)) {
      const st = S.stations[id];
      const att = 1 + (st.lastAtt || 0) * (stats.attune - 1);
      n += st.stock + st.premStock; prem += st.premStock;
      worth += (st.stock * dishValue(id, false) + st.premStock * dishValue(id, true)) * att;
    }
    el.querySelector('span').textContent = fmt(worth);
    el.classList.toggle('dim', n === 0);
    el.classList.toggle('prem', prem > 0);
  }
}

// ---------------------------------------------------------------- panels
function cardBuy(costText, canAfford, cur) {
  return `<button class="buy" ${canAfford ? '' : 'disabled'}>${icon(cur)}${costText}</button>`;
}

// ---------------------------------------------------------------- research
// Elvenar's tree, read left to right, three lanes high, in a wide window.
// Lines run from each requirement across to what it opens. Research only unlocks; you place things
// yourself from Build.
const unlockArt = ([k, t]) => k === 'station' ? stationDef(t).sprite
  : k === 'blossom' ? 'blossom_' + t : k === 'lounge' ? 'bld_hotel'
  : k === 'building' ? BUILDINGS[t].sprite : k === 'academy' ? 'academy' : t;
const FEATURE_ART = { lab: 'nav_lab', outfits: 'nav_bees', royal: 'nav_royal', autosell: 'icon_bag' };

// Bubbles in columns, joined by right-angled arrows that go green once the
// node behind them is done; chapter tabs underneath, like old Elvenar mobile.
const BT = { colW: 136, rowH: 106, padX: 34, padY: 12, bub: 66 };
const bubPos = t => [BT.padX + t.col * BT.colW, BT.padY + t.row * BT.rowH];
const nodeArt = t => t.bee ? 'bee_' + t.bee : t.feature ? FEATURE_TEXT[t.feature][2]
  : t.unlocks[0] ? unlockArt(t.unlocks[0]) : 'icon_build';

function renderPark() {
  title.textContent = `Research  \u00b7  ${techCount()}/${TECH.length}`;
  const inc = incomePerSec(), power = hivePower();
  const cols = Math.max(...TECH.map(t => t.col)) + 1;
  const W = BT.padX * 2 + (cols - 1) * BT.colW + BT.bub, H = BT.padY + 3 * BT.rowH + 112;
  const nodes = TECH.map(t => {
    const st = techState(t), gate = techGate(t), cost = techCost(t, inc), need = techKp(t), got = kpIn(t);
    const [x, y] = bubPos(t);
    let pill = '';
    if (st === 'open') {
      if (power < gate) pill = rankBar(power, gate);
      else if (!kpFull(t)) pill = `<button class="buy kp" data-pour="${t.id}" ${S.kp >= 1 ? '' : 'disabled'}>
        ${icon("icon_waggle")}${got}/${need} +</button>`;
      else pill = `<button class="buy" data-tech="${t.id}" ${S.coin >= cost ? '' : 'disabled'}>
        ${cost ? icon('icon_coin') + fmt(cost) : 'Free'}</button>`;
    } else if (st === 'locked' && got) pill = `<small class="bkp">${icon('icon_waggle')}${got}/${need}</small>`;
    return `<div class="bnode ${st}" data-id="${t.id}" style="left:${x}px;top:${y}px">
      <div class="bub"><i style="${art(nodeArt(t))}"></i>${st === 'done' ? '<span class="bdone">\u2713</span>' : ''}</div>
      <b class="bname">${t.name}</b>${pill}</div>`;
  }).join('');
  // right-angled arrows from each requirement to what it opens
  const r = BT.bub / 2;
  const lines = TECH.flatMap(t => t.req.map(id => {
    const q = techDef(id), [x1, y1] = bubPos(q), [x2, y2] = bubPos(t);
    const ax = x1 + BT.bub, ay = y1 + r, bx = x2 - 6, by = y2 + r, mx = x2 - 22;
    const on = researched(id);
    return `<path class="${on ? 'on' : ''}" d="M${ax} ${ay}H${mx}V${by}H${bx}" marker-end="url(#${on ? 'arrOn' : 'arrOff'})"/>`;
  })).join('');
  const tabs = CHAPTERS.map((c, i) => `<button class="chap" data-col="${c.col}">
      <span>${['I', 'II', 'III', 'IV', 'V'][i]}</span><em>${c.name}</em></button>`).join('');
  body.innerHTML = `<div class="tree-head">
      <div class="hint">${treeDone() ? 'Everything is researched. Your bees are very proud.'
        : 'Pour waggles into a bubble, then pay to finish it. Each one unlocks one thing to place from <b>Build</b>.'}</div>
    </div>
    <div class="bwrap"><div class="btree" style="width:${W}px;height:${H}px">
      <svg class="blines" width="${W}" height="${H}"><defs>
        <marker id="arrOn" viewBox="0 0 8 8" refX="7" refY="4" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L8 4L0 8z" fill="#5aa02c"/></marker>
        <marker id="arrOff" viewBox="0 0 8 8" refX="7" refY="4" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L8 4L0 8z" fill="#8f8371"/></marker>
      </defs>${lines}</svg>${nodes}</div></div>
    <div class="chaps">${tabs}</div>`;
  const wrap = body.querySelector('.bwrap');
  body.querySelectorAll('[data-tech]').forEach(b => b.onclick = e => { e.stopPropagation(); doResearch(b.dataset.tech); });
  body.querySelectorAll('[data-pour]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const n = pourKp(b.dataset.pour);
    if (!n) return toast('No waggles to spare. One comes every ' + clock(WAGGLE.every));
    save(); syncHUD(); renderPark();
  });
  body.querySelectorAll('.chap').forEach(b => b.onclick = () => {
    wrap.scrollTo({ left: BT.padX + +b.dataset.col * BT.colW - 20, behavior: 'smooth' });
  });
  const syncChap = () => {
    const col = (wrap.scrollLeft + 40) / BT.colW;
    const cur = CHAPTERS.reduce((k, c, i) => (col >= c.col - 0.5 ? i : k), 0);
    body.querySelectorAll('.chap').forEach((b, i) => b.classList.toggle('on', i === cur));
  };
  body.querySelectorAll('.bnode').forEach(n => {
    n.onmouseenter = () => techTip(n);
    n.onmouseleave = () => { if (!tipPinned) hideTechTip(); };
    n.onclick = () => { tipPinned = !(tipPinned && tipFor === n.dataset.id); tipPinned ? techTip(n) : hideTechTip(); };
  });
  wrap.onscroll = () => { tipPinned = false; hideTechTip(); syncChap(); };
  if (renderPark.snap !== false) {
    const open = TECH.find(t => techState(t) === 'open');
    if (open) wrap.scrollLeft = Math.max(0, BT.padX + open.col * BT.colW - wrap.clientWidth / 3);
    renderPark.snap = false;
  } else if (renderPark.keep != null) wrap.scrollLeft = renderPark.keep;
  wrap.addEventListener('scroll', () => { renderPark.keep = wrap.scrollLeft; });
  syncChap();
}

function doResearch(id) {
  const r = research(id);
  if (r === 'coin') return toast('Not enough honey coins');
  if (r === 'rank') return toast('Your Hive Rank is too low for this one');
  if (r === 'kp') return toast('It still needs waggles');
  if (r !== 'ok') return;
  const t = techDef(id);
  give('gem', 2);
  toast(t.name + ' researched  \u00b7  +2 gems' + (t.unlocks.length ? '  \u00b7  place it from Build' : ''));
  save(); syncHUD(); renderPark();
}

// --- research tooltips: the building large, a line about it, its numbers
let tipPinned = false, tipFor = null;
const footTxt = k => FOOT[k] ? FOOT[k].join('\u00d7') : '';
function unlockRows(t) {
  const rows = [];
  for (const [k, ty] of t.unlocks) {
    if (k === 'station') {
      const d = stationDef(ty);
      const ins = Object.entries(d.inputs).map(([el, n]) => `${n} ${ELEMENTS[el].name}`).join(' + ');
      const crew = Object.entries(d.crew).map(([el, n]) => `${n} ${ELEMENTS[el].name}`).join(' + ');
      rows.push([d.sprite, d.name, `${d.dish}, worth ${fmt(d.value)} each`,
        [`${ins} nectar`, `${d.cook}s to cook`, `crew ${crew}`, footTxt('station')]]);
    } else if (k === 'blossom') {
      rows.push(['blossom_' + ty, ELEMENTS[ty].name + ' Blossom', `Grows ${ELEMENTS[ty].name} nectar`, [footTxt('blossom')]]);
    } else if (k === 'lounge') {
      rows.push(['bld_hotel', 'Bee Hotel', 'Tired bees sleep here',
        [`${HOTEL.tubes.length} tubes`, `+${BUILD.waxPerSec}/s beeswax`, footTxt('lounge')]]);
    } else if (k === 'building') {
      const b = BUILDINGS[ty];
      rows.push([b.sprite, b.name, b.blurb, ['one per park', footTxt('building')]]);
    } else if (k === 'academy') {
      rows.push(['academy', 'Snail Academy', 'Teaches a bee a second element',
        [`${ACADEMY.seats} seats`, `up to rank ${ACADEMY.maxRank}`, footTxt('academy')]]);
    } else if (k === 'decor') {
      rows.push([ty, DECOR[ty].name, DECOR[ty].effect, ['one per park', footTxt('decor')]]);
    }
  }
  if (t.feature) {
    const [n, txt, a] = FEATURE_TEXT[t.feature];
    rows.push([a, n, txt, ['opens a new tab']]);
  }
  if (t.bee) {
    const owned = new Set(S.bees.map(b => b.rid));
    const who = BEE_ROSTER.filter(b => b.el === t.bee && !owned.has(b.id)).sort((a, b) => a.stars - b.stars)[0];
    rows.push(['bee_' + t.bee, `+1 ${ELEMENTS[t.bee].name} bee`, who ? `${who.name} joins the park` : 'Roster full: royal jelly instead', []]);
  }
  return rows;
}

function techTip(node) {
  const t = techDef(node.dataset.id);
  if (!t) return;
  tipFor = t.id;
  const rows = unlockRows(t);
  const hero = rows[0] ? rows[0][0] : 'icon_build';
  const st = techState(t), gate = techGate(t), cost = techCost(t, incomePerSec()), power = hivePower();
  const lines = [];
  if (st === 'done') lines.push('<b class="ok">Researched</b>');
  else {
    lines.push(`<div class="tt-l"><span>Waggles</span><b>${icon('icon_waggle')}${kpIn(t)} / ${techKp(t)} poured in</b></div>`);
    lines.push(`<div class="tt-l"><span>Then</span><b>${icon('icon_coin')}${fmt(cost)}</b></div>`);
    if (t.req.length) lines.push(`<div class="tt-l"><span>After</span><b>${t.req.map(r =>
      `<i class="${researched(r) ? 'ok' : 'no'}">${researched(r) ? '\u2713' : '\u2715'} ${techDef(r).name}</i>`).join(' ')}</b></div>`);
    if (gate) lines.push(`<div class="tt-l"><span>Hive Rank</span><b>${rankBar(power, gate)}</b></div>` +
      (power < gate ? `<p class="tt-how">Hive Rank goes up with more bees, promoting them with royal jelly,
        upgrading buildings and researching. You need ${fmt(gate - power)} more.</p>` : ''));
  }
  const status = lines.join('');
  let el = document.getElementById('techtip');
  if (!el) { el = document.createElement('div'); el.id = 'techtip'; document.getElementById('app').appendChild(el); }
  el.innerHTML = `<div class="tt-hero" style="${art(hero)}"></div>
    <h4>${t.name}</h4><p class="tt-text">${TECH_TEXT[t.id] || (t.bee ? BEE_TEXT[t.bee] : '')}</p>
    ${rows.map(([a, n, d, stats]) => `<div class="tt-row"><i class="ic" style="${art(a)}"></i>
      <div><b>${n}</b><small>${d}</small>${stats.filter(Boolean).length ? `<em>${stats.filter(Boolean).join(' \u00b7 ')}</em>` : ''}</div></div>`).join('')}
    <div class="tt-foot">${status}</div>`;
  el.classList.remove('hidden');
  // beside the node, flipped if it would run off the screen
  const r = node.getBoundingClientRect(), app = document.getElementById('app').getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  let x = r.right + 10 - app.left;
  if (x + w > app.width - 8) x = r.left - w - 10 - app.left;
  let y = r.top - app.top + r.height / 2 - h / 2;
  y = Math.max(8, Math.min(app.height - h - 8, y));
  el.style.left = Math.max(8, x) + 'px'; el.style.top = y + 'px';
}
// "242 / 400" with a bar, green when it's met
function rankBar(have, need) {
  const f = Math.min(1, have / need), met = have >= need;
  return `<span class="rank-bar ${met ? 'met' : ''}"><span class="rb-txt">${met ? '\u2713 ' : ''}Hive Rank ${fmt(have)} / ${fmt(need)}</span>
    <span class="rb-track"><span style="width:${Math.round(f * 100)}%"></span></span></span>`;
}

function hideTechTip() {
  tipFor = null;
  document.getElementById('techtip')?.classList.add('hidden');
}


function renderLab() {
  title.textContent = 'Lab';
  const cards = [];
  for (const u of GLOBAL_LAB) {
    const lv = S.lab[u.id] || 0, cost = labCost(u, lv);
    cards.push(ucard(u.name + ' ' + pct(u.step), u.art, `Lv.${lv}`, fmt(cost), S.heart >= cost,
      'icon_heart', `lab:${u.id}`));
  }
  for (const id of Object.keys(S.stations).filter(k => !k.includes('#'))) {
    const d = stationDef(id), st = S.stations[id];
    cards.push(ucard(`${d.name} Production SPD +4%`, d.dishSprite, `Lv.${st.spdLvl}`,
      fmt(stationSpdCost(st.spdLvl)), S.heart >= stationSpdCost(st.spdLvl), 'icon_heart', `spd:${id}`));
    cards.push(ucard(`${d.name} Premium Chance +1.5%`, d.dishSprite, `Lv.${st.premLvl}`,
      fmt(stationPremCost(st.premLvl)), S.heart >= stationPremCost(st.premLvl), 'icon_heart', `prem:${id}`));
  }
  body.innerHTML = `<div class="hint">Hearts come from blossoms and napping bees. Tap them in the park.</div>
    <div class="grid">${cards.join('')}</div>`;
  wireUpgrades(renderLab);
}

function renderRoyal() {
  title.textContent = 'Royal Lab';
  const cards = ROYAL_LAB.map(u => {
    const lv = S.royal[u.id] || 0;
    const maxed = u.max && lv >= u.max;
    const cost = royalCost(u, lv);
    const label = u.id === 'newbee' ? u.name
      : u.id === 'offline' ? `${u.name} +30m`
      : `${u.name} ${pct(u.step)}`;
    return ucard(label, u.art, maxed ? 'MAX' : `Lv.${lv}`, maxed ? 'max' : fmt(cost),
      !maxed && S.gem >= cost, 'icon_gem', `royal:${u.id}`);
  });
  body.innerHTML = `<div class="hint">Gems come from research and the shop.</div>
    <div class="grid">${cards.join('')}</div>`;
  wireUpgrades(renderRoyal);
}

function ucard(name, artName, lvText, costText, afford, cur, action) {
  return `<div class="ucard"><h3>${name}</h3>
    <div class="art" style="${art(artName)}"></div>
    <small>${lvText}</small>
    <button class="buy" data-act="${action}" ${afford ? '' : 'disabled'}>${icon(cur)}${costText}</button>
  </div>`;
}

function wireUpgrades(rerender) {
  body.querySelectorAll('.buy[data-act]').forEach(b => b.onclick = () => {
    const [kind, id] = b.dataset.act.split(':');
    if (kind === 'lab') {
      const u = GLOBAL_LAB.find(x => x.id === id), lv = S.lab[id] || 0;
      if (!spend('heart', labCost(u, lv))) return;
      S.lab[id] = lv + 1;
    } else if (kind === 'spd') {
      const st = S.stations[id];
      if (!spend('heart', stationSpdCost(st.spdLvl))) return;
      st.spdLvl++;
    } else if (kind === 'prem') {
      const st = S.stations[id];
      if (!spend('heart', stationPremCost(st.premLvl))) return;
      st.premLvl++;
    } else if (kind === 'royal') {
      const u = ROYAL_LAB.find(x => x.id === id), lv = S.royal[id] || 0;
      if (u.max && lv >= u.max) return;
      if (!spend('gem', royalCost(u, lv))) return;
      S.royal[id] = lv + 1;
      if (id === 'newbee') {
        addBee(ELEMENT_IDS[lv % ELEMENT_IDS.length]);
        toast('A new bee joined the park');
      }
    }
    save(); syncHUD(); rerender();
  });
}

let beeView = 'roster', rosterSel = null;
export const setBeeView = v => { beeView = v; };

function renderBees() {
  title.textContent = 'Bees';
  const head = `<div class="tabs">
    <button data-bv="roster" class="${beeView === 'roster' ? 'on' : ''}">Roster</button>
    <button data-bv="dress" class="${beeView === 'dress' ? 'on' : ''}">Dress-up</button>
  </div>`;
  if (beeView === 'dress') { renderOutfit(head); }
  else { renderRoster(head); }
  body.querySelectorAll('[data-bv]').forEach(b => b.onclick = () => {
    beeView = b.dataset.bv; renderBees();
  });
}


// Inline rename. A floating field over the panel, because prompt() does nothing
// inside a published artifact.
function askName(bee, after) {
  const def = beeDef(bee.rid);
  const box = document.createElement('div');
  box.className = 'namebox';
  box.innerHTML = `<div class="namecard">
    <h3>Name her</h3>
    <input id="namein" maxlength="14" value="${(bee.name || def.name).replace(/"/g, '&quot;')}">
    <div class="namerow">
      <button class="buy ghost" id="namedef">Reset</button>
      <button class="buy" id="nameok">Save</button>
    </div></div>`;
  document.getElementById('app').appendChild(box);
  const inp = box.querySelector('#namein');
  inp.focus(); inp.select();
  const close = () => box.remove();
  const commit = () => {
    const v = inp.value.trim().slice(0, 14);
    bee.name = (!v || v === def.name) ? null : v;
    close(); save(); after();
  };
  box.onclick = e => { if (e.target === box) close(); };
  box.querySelector('#nameok').onclick = commit;
  box.querySelector('#namedef').onclick = () => { bee.name = null; close(); save(); after(); };
  inp.onkeydown = e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') close(); };
}

function renderRoster(head) {
  const owned = new Map(S.bees.map(b => [b.rid, b]));
  const cells = BEE_ROSTER.map(def => {
    const b = owned.get(def.id);
    return `<div class="item bee ${b ? '' : 'lock'} ${rosterSel === def.id ? 'on' : ''}"
      data-bee="${def.id}">
      ${b ? beeFig(b, 56) : `<span class="beefig" style="width:56px;height:56px">
        <span class="layer" style="${art('bee_' + def.el)}"></span></span>`}
      <span class="lv">${b ? 'Lv.' + (b.level || 1) : icon('icon_lock')}</span>
      <span class="stars">${stars(def.stars)}</span></div>`;
  }).join('');

  const def = rosterSel && beeDef(rosterSel);
  const bee = def && owned.get(def.id);
  let detail = '<div class="hint">Pick a bee. Summon the ones you are missing at the Brood Cells.</div>';
  if (def) {
    const cost = bee ? promoteCost(def.stars, bee.level || 1) : 0;
    const canPromote = bee && (bee.level || 1) < BEE_MAX_LEVEL;
    const mul = bee ? beeMul(bee) : { carry: 1, speed: 1 };
    const pins = Object.keys(S.stations);
    detail = `<div class="card"><div class="art">${bee ? beeFig(bee, 48) : ''}</div>
      <div class="meta"><h3>${bee ? beeName(bee) : def.name} ${stars(def.stars)}${
          bee ? ' <button class="rename" id="rename">rename</button>' : ''}</h3>
        <small>${RARITY[def.stars].name} \u00b7 ${ELEMENTS[def.el].name}${
          bee && bee.learned.length ? ' + ' + bee.learned.map(e => ELEMENTS[e].name).join(', ') : ''}</small></div>
      ${bee ? `<button class="buy" id="promote" ${canPromote && S.jelly >= cost ? '' : 'disabled'}>
        ${canPromote ? icon('icon_jelly') + fmt(cost) : 'Max'}</button>` : icon('icon_lock')}</div>
      <p class="tale">${def.line}</p>
      <div class="card"><div class="meta"><h3>${statLabelFull(def.stat)}</h3>
        <small>${pct(def.step * (bee ? bee.level || 1 : 1))} to the whole park${
          bee ? '' : ' once you have her'}</small></div></div>
      ${bee ? (() => { const sk = skillOf(def.id); const ready = skillReady(bee); return `
      <div class="card skill"><i class="ic big" style="${art(sk.icon)}"></i>
        <div class="meta"><h3>${sk.name}</h3><small>${sk.text}</small></div>
        <button class="buy" id="use-skill" ${ready ? '' : 'disabled'}>
          ${ready ? 'Use' : clock(skillLeft(bee))}</button></div>
      <div class="hint">Cooldown ${clock(skillCd(def.id, bee.level || 1))}, shorter each level</div>`; })() : ''}
      ${bee ? `<div class="card"><div class="meta"><h3>Carries ${mul.carry.toFixed(2)}x \u00b7 flies ${mul.speed.toFixed(2)}x</h3>
        <small>Level ${bee.level || 1} of ${BEE_MAX_LEVEL} \u00b7 Academy rank ${bee.rank || 0}</small></div></div>
      <div class="hint">Assign to one kitchen, or leave her to roam</div>
      <div class="items">
        <div class="item ${!bee.pin ? 'on' : ''}" data-pin="">
          <div class="art" style="${art('bee_' + bee.el)}"></div><span class="lv">Roam</span></div>
        ${pins.map(id => `<div class="item ${bee.pin === id ? 'on' : ''}" data-pin="${id}">
          <div class="art" style="${art(stationDef(id).dishSprite)}"></div>
          <span class="lv">${stationDef(id).name.split(' ')[0]}${copyNo(id) > 1 ? ' ' + copyNo(id) : ''}</span></div>`).join('')}
      </div>` : ''}`;
  }

  body.innerHTML = head + `<div class="items roster">${cells}</div>` + detail +
    `<div class="hint">${S.bees.length} of ${ROSTER_MAX} bees \u00b7 Hive Rank ${fmt(hivePower())}.
      Royal jelly comes from duplicate eggs.</div>`;

  body.querySelectorAll('[data-bee]').forEach(el => el.onclick = () => {
    rosterSel = rosterSel === el.dataset.bee ? null : el.dataset.bee;
    renderBees();
  });
  const us = body.querySelector('#use-skill');
  if (us) us.onclick = () => {
    if (!useSkill(bee)) return;
    toast(skillOf(def.id).name);
    save(); syncHUD(); syncDock(); renderBees();
  };
  const rn = body.querySelector('#rename');
  if (rn) rn.onclick = () => askName(bee, renderBees);
  const pr = body.querySelector('#promote');
  if (pr) pr.onclick = () => {
    const cost = promoteCost(def.stars, bee.level || 1);
    if (!spend('jelly', cost)) return toast('Not enough royal jelly');
    bee.level = (bee.level || 1) + 1;
    toast(`${beeName(bee)} is Lv.${bee.level}`);
    save(); syncHUD(); renderBees();
  };
  body.querySelectorAll('[data-pin]').forEach(el => el.onclick = () => {
    bee.pin = el.dataset.pin || null;
    save(); renderBees();
  });
}

// What an item does, in words a player would use.
function fitEffect(o, lv) {
  const v = o.step * Math.max(1, lv);
  return { carry: `Carries ${pct(v)} more nectar`, speed: `Flies ${pct(v)} faster`,
    heart: `Finds hearts ${pct(v)} more often`, prem: `+${(v * 100).toFixed(1)}% chance of premium dishes`,
    bloom: `Blossoms regrow ${pct(v)} faster`, attune: `Attuned runs pay ${pct(v)} more` }[o.stat] || statLabel(o.stat);
}
const fitPrice = o => o.stars * 25;
const RARITY_WORD = { 1: 'Common', 2: 'Rare', 3: 'Legendary' };
const SLOT_ART = { hat: 'fit_bobble', clothes: 'fit_sweater', shoes: 'fit_boots' };

// The dress-up stand. Left: the bee, her three slots. Right: whatever item is
// picked, what it does, and one clear next step, with the reason when you
// can't take it. Below: the items for the open slot, each with a plain state
// (wearing / owned / price you can or can't pay).
function renderOutfit(head = '') {
  if (!S.bees.length) { body.innerHTML = head + '<div class="hint">No bees yet.</div>'; return; }
  beeIdx = Math.min(beeIdx, S.bees.length - 1);
  const bee = S.bees[beeIdx];
  const list = OUTFITS.filter(o => o.slot === outfitSlot);
  let sel = OUTFITS.find(o => o.id === renderOutfit.sel && o.slot === outfitSlot)
    || OUTFITS.find(o => o.id === bee.outfit[outfitSlot]) || list[0];

  const slots = OUTFIT_SLOTS.map(sl => {
    const id = bee.outfit[sl];
    return `<button class="dslot ${sl === outfitSlot ? 'on' : ''} ${id ? 'full' : ''}" data-slot="${sl}">
      <i style="${art(id ? 'fit_' + id : SLOT_ART[sl])}"></i>
      <small>${id ? OUTFITS.find(o => o.id === id).name : 'Empty ' + sl}</small></button>`;
  }).join('');

  const tiles = list.map(o => {
    const lv = S.owned[o.id] || 0, on = bee.outfit[o.slot] === o.id, price = fitPrice(o);
    const tag = on ? '<span class="dtag wear">\u2713 Wearing</span>'
      : lv ? `<span class="dtag own">Owned \u00b7 Lv.${lv}</span>`
      : `<span class="dtag price ${S.gem >= price ? 'ok' : 'no'}">${icon('icon_gem')}${price}</span>`;
    return `<button class="dtile ${lv ? 'owned' : 'lock'} ${on ? 'on' : ''} ${sel && sel.id === o.id ? 'sel' : ''}" data-fit="${o.id}">
      <span class="dstars">${'\u2605'.repeat(o.stars)}</span>
      <i style="${art('fit_' + o.id)}"></i>${tag}</button>`;
  }).join('');

  // the detail panel and its one next step
  let panel = '<div class="hint">Pick an item below.</div>';
  if (sel) {
    const lv = S.owned[sel.id] || 0, on = bee.outfit[sel.slot] === sel.id;
    const price = fitPrice(sel), up = lv ? outfitUpCost(sel, lv) : 0;
    const actions = [];
    if (!lv) {
      const short = price - S.gem;
      actions.push(`<button class="buy big" id="fit-act" data-act="buy" ${short > 0 ? 'disabled' : ''}>
        ${icon('icon_gem')}Buy for ${price} gems</button>`);
      if (short > 0) actions.push(`<p class="dwhy">You have <b>${fmt(S.gem)} gems</b>, so you need <b>${fmt(short)} more</b>.
        Gems come from research (+2 for each one), Parcel Desk orders and the Shop.</p>`);
    } else {
      actions.push(`<button class="buy big ${on ? 'ghost' : ''}" id="fit-act" data-act="${on ? 'off' : 'wear'}">
        ${on ? 'Take it off' : `Put it on ${beeName(bee)}`}</button>`);
      const short = up - S.pollen;
      actions.push(`<button class="buy" id="fit-up" ${short > 0 ? 'disabled' : ''}>${icon('icon_pollen')}Level up \u00b7 ${fmt(up)} pollen</button>`);
      actions.push(`<p class="dwhy">${short > 0 ? `You have <b>${fmt(S.pollen)} pollen</b>, ${fmt(short)} short. ` : ''}
        Next level: ${fitEffect(sel, lv + 1).toLowerCase()}. Pollen drops when a premium dish sells.</p>`);
    }
    const wornBy = S.bees.filter(b => b !== bee && b.outfit[sel.slot] === sel.id).map(beeName);
    panel = `<div class="dart" style="${art('fit_' + sel.id)}"></div>
      <h3>${sel.name}</h3>
      <div class="drare r${sel.stars}">${'\u2605'.repeat(sel.stars)} ${RARITY_WORD[sel.stars]} ${sel.slot}</div>
      <p class="deff">${fitEffect(sel, lv)}${lv ? ` <small>(Lv.${lv})</small>` : ''}</p>
      ${wornBy.length ? `<p class="dnote">Also worn by ${wornBy.join(', ')}.</p>` : ''}
      ${actions.join('')}`;
  }

  body.innerHTML = head + `
    <div class="dress">
      <div class="dbee">
        <div class="bee-strip">
          <button id="bee-prev" aria-label="Previous bee">\u2039</button>
          <div><div class="art">${beeFig(bee, 84)}</div>
            <div class="dname">${beeName(bee)} <button class="rename" id="rename-fit">rename</button></div>
            <small class="dcount">${beeIdx + 1} of ${S.bees.length} bees</small></div>
          <button id="bee-next" aria-label="Next bee">\u203a</button>
        </div>
        <div class="dslots">${slots}</div>
      </div>
      <div class="dpanel">${panel}</div>
    </div>
    <div class="tabs">${OUTFIT_SLOTS.map(sl =>
      `<button data-st="${sl}" class="${sl === outfitSlot ? 'on' : ''}">${sl[0].toUpperCase() + sl.slice(1)}</button>`).join('')}</div>
    <div class="dgrid">${tiles}</div>
    <p class="dfoot">You have ${icon('icon_gem')}<b>${fmt(S.gem)}</b> gems and ${icon('icon_pollen')}<b>${fmt(S.pollen)}</b> pollen.
      Gems buy new items; pollen levels up the ones you own.</p>`;

  const rf = body.querySelector('#rename-fit');
  if (rf) rf.onclick = () => askName(bee, renderBees);
  $('#bee-prev').onclick = () => { beeIdx = (beeIdx - 1 + S.bees.length) % S.bees.length; renderBees(); };
  $('#bee-next').onclick = () => { beeIdx = (beeIdx + 1) % S.bees.length; renderBees(); };
  body.querySelectorAll('[data-st],[data-slot]').forEach(b =>
    b.onclick = () => { outfitSlot = b.dataset.st || b.dataset.slot; renderOutfit.sel = null; renderBees(); });
  body.querySelectorAll('.dtile').forEach(el => {
    el.onclick = () => { renderOutfit.sel = el.dataset.fit; renderBees(); };
    el.onmouseenter = () => fitTip(el, bee);
    el.onmouseleave = () => document.getElementById('fittip')?.remove();
  });
  const act = $('#fit-act');
  if (act) act.onclick = () => {
    if (act.dataset.act === 'buy') {
      if (!spend('gem', fitPrice(sel))) return toast('Not enough gems');
      S.owned[sel.id] = 1;
      bee.outfit[sel.slot] = sel.id;
      toast(`${sel.name} bought, and ${beeName(bee)} has it on`);
    } else if (act.dataset.act === 'wear') { bee.outfit[sel.slot] = sel.id; toast(`${beeName(bee)} is wearing the ${sel.name}`); }
    else delete bee.outfit[sel.slot];
    save(); syncHUD(); renderBees();
  };
  const upb = $('#fit-up');
  if (upb) upb.onclick = () => {
    const lv = S.owned[sel.id] || 0;
    if (!spend('pollen', outfitUpCost(sel, lv))) return toast('Not enough pollen');
    S.owned[sel.id] = lv + 1;
    toast(`${sel.name} is Lv.${lv + 1}`);
    save(); syncHUD(); renderBees();
  };
}

// Hover an item: its name, what it does and what it costs.
function fitTip(el, bee) {
  const o = OUTFITS.find(x => x.id === el.dataset.fit);
  if (!o) return;
  const lv = S.owned[o.id] || 0, price = fitPrice(o);
  document.getElementById('fittip')?.remove();
  const t = document.createElement('div');
  t.id = 'fittip'; t.className = 'hudtip';
  t.innerHTML = `<h4>${o.name}</h4><p>${fitEffect(o, lv)}.</p><p class="rate">${
    bee.outfit[o.slot] === o.id ? 'Wearing it' : lv ? `Owned, Lv.${lv}. Tap, then Put it on.`
    : S.gem >= price ? `${price} gems. Tap, then Buy.` : `${price} gems. You have ${fmt(S.gem)}.`}</p>`;
  const app = $('#app').getBoundingClientRect(), r = el.getBoundingClientRect();
  t.style.left = Math.min(app.width - 230, r.left - app.left) + 'px';
  t.style.top = (r.bottom - app.top + 6) + 'px';
  $('#app').appendChild(t);
}

const statLabel = statLabelFull;

function renderShop() {
  title.textContent = 'Shop';
  const rows = SHOP.map(it => {
    const [cur, amt] = Object.entries(it.cost)[0];
    const afford = (S[cur] || 0) >= amt;
    const giveTxt = Object.entries(it.give).map(([k, v]) => `${v} ${k}`).join(', ');
    return `<div class="card"><div class="art" style="${art(it.art)}"></div>
      <div class="meta"><h3>${it.name}</h3><small>${giveTxt}</small></div>
      <button class="buy" data-shop="${it.id}" ${afford ? '' : 'disabled'}>${icon('icon_' + cur)}${fmt(amt)}</button></div>`;
  });
  const owned = S.decor.map(id => `<div class="card"><div class="art" style="${art(id)}"></div>
    <div class="meta"><h3>${DECOR[id].name}</h3><small>${DECOR[id].effect}</small></div></div>`);
  body.innerHTML = rows.join('') +
    (owned.length ? `<div class="hint">Park decorations</div>` + owned.join('') : '');
  body.querySelectorAll('[data-shop]').forEach(b => b.onclick = () => {
    const it = SHOP.find(x => x.id === b.dataset.shop);
    const [cur, amt] = Object.entries(it.cost)[0];
    if (!spend(cur, amt)) return;
    for (const [k, v] of Object.entries(it.give)) {
      if (k === 'rush') { rushBlossoms(); toast('Every blossom is full'); }
      else give(k, v);
    }
    save(); syncHUD(); renderShop();
  });
}

// ---------------------------------------------------------------- buildings
const tale = id => STORIES[id]
  ? `<p class="tale">${STORIES[id]}</p>` : '';

function renderOrders() {
  const b = BUILDINGS.order_board;
  title.textContent = b.name;
  const now = Date.now();
  const rows = S.orders.map((o, i) => {
    const d = stationDef(o.station);
    const have = typeStock(typeOf(o.station));
    const ok = have >= o.qty;
    const left = Math.max(0, (o.expires - now) / 1000);
    return `<div class="card">
      <div class="art" style="${art(d.dishSprite)}"></div>
      <div class="meta"><h3>${o.qty} \u00d7 ${d.dish}</h3>
        <small>you have ${fmt(have)} \u00b7 ${clock(left)} left</small></div>
      <button class="buy" data-order="${i}" ${ok ? '' : 'disabled'}>
        ${icon('icon_gem')}${o.gem} ${icon('icon_pollen')}${o.pollen}</button></div>`;
  });
  body.innerHTML = tale('order_board') +
    `<div class="hint">${b.blurb} A new note goes up every ${clock(ORDERS.every)}.</div>` +
    (rows.join('') || '<div class="hint">Pim has nothing for you right now.</div>') +
    upgradeRow('order_board');
  wireUpgrade('order_board', renderOrders);
  body.querySelectorAll('[data-order]').forEach(btn => btn.onclick = () => {
    const o = S.orders[+btn.dataset.order];
    if (o && fillOrder(o)) { toast(`Delivered \u00b7 +${o.gem} gems, +${o.pollen} pollen`); }
    save(); syncHUD(); syncRail(); renderOrders();
  });
}

let pressRaf = null, pressPos = 0, pressDir = 1;

function stopPress() { if (pressRaf) cancelAnimationFrame(pressRaf); pressRaf = null; }

function renderPress() {
  const b = BUILDINGS.nectar_press;
  title.textContent = b.name;
  const ready = Date.now() > (S.pressAt || 0);
  const wait = Math.max(0, ((S.pressAt || 0) - Date.now()) / 1000);
  body.innerHTML = tale('nectar_press') +
    `<div class="hint">${b.blurb} Gold is ${PRESS.goldMul}x, the wider silver band ${PRESS.silverMul}x,
      anywhere else ${PRESS.missMul}x. Lasts ${clock(PRESS.seconds)}.</div>
    <div class="gauge"><div class="band silver"></div><div class="band gold"></div>
      <div class="needle" id="needle"></div></div>
    <button class="buy wide" id="press-go" ${ready ? '' : 'disabled'}>
      ${ready ? 'Pull the lever' : 'Ivo is resting \u00b7 ' + clock(wait)}</button>` +
    upgradeRow('nectar_press');
  wireUpgrade('nectar_press', renderPress);
  const needle = body.querySelector('#needle');
  stopPress();
  if (ready) {
    let last = performance.now();
    const step = now => {
      const dt = (now - last) / 1000; last = now;
      pressPos += dt * PRESS.sweep * pressDir;
      if (pressPos > 1) { pressPos = 1; pressDir = -1; }
      if (pressPos < 0) { pressPos = 0; pressDir = 1; }
      needle.style.left = (pressPos * 100) + '%';
      pressRaf = requestAnimationFrame(step);
    };
    pressRaf = requestAnimationFrame(step);
  }
  const go = body.querySelector('#press-go');
  if (go && ready) go.onclick = () => {
    stopPress();
    const off = Math.abs(pressPos - 0.5);
    const mul = off <= PRESS.gold ? PRESS.goldMul : off <= PRESS.silver ? PRESS.silverMul : PRESS.missMul;
    const label = off <= PRESS.gold ? 'Dead on' : off <= PRESS.silver ? 'Close enough' : 'Ivo saw that';
    S.boostAmt = mul;
    S.boostUntil = Date.now() + PRESS.seconds * 1000;
    S.pressAt = Date.now() + PRESS.cooldown * 1000;
    toast(`${label} \u00b7 x${stats.boostMul.toFixed(1)} for ${clock(PRESS.seconds)}`);
    save(); syncHUD(); renderPress();
  };
}

function renderShrine() {
  const b = BUILDINGS.shrine;
  title.textContent = b.name;
  const lit = stats.shrineEl;
  const left = Math.max(0, (S.shrine.until - Date.now()) / 1000);
  body.innerHTML = tale('shrine') +
    `<div class="hint">${b.blurb} Blossoms of that element also regrow
      ${Math.round((SHRINE.bloomMul - 1) * 100)}% faster. Burns for ${SHRINE.minutes + buildingStep('shrine') * 2} minutes.</div>
    ${lit ? `<div class="card active"><div class="art" style="${art('blossom_' + lit)}"></div>
      <div class="meta"><h3>${ELEMENTS[lit].name} is lit</h3><small>${clock(left)} left</small></div></div>` : ''}
    <div class="items">${ELEMENT_IDS.map(e =>
      `<div class="item ${e === lit ? 'on' : ''}" data-light="${e}">
        <div class="art" style="${art('sigil_' + e)}"></div>
        <span class="lv">${ELEMENTS[e].name}</span></div>`).join('')}</div>` + upgradeRow('shrine');
  wireUpgrade('shrine', renderShrine);
  body.querySelectorAll('[data-light]').forEach(el => el.onclick = () => {
    const mins = SHRINE.minutes + buildingStep('shrine') * 2;
    S.shrine = { el: el.dataset.light, until: Date.now() + mins * 60000 };
    toast(ELEMENTS[el.dataset.light].name + ' is burning');
    save(); renderShrine();
  });
}

let currentKitchen = null;

function renderKitchen() {
  const id = currentKitchen, d = stationDef(id), st = S.stations[id];
  if (!d || !st) return;
  title.textContent = kitchenName(id);
  const n = st.stock + st.premStock;
  const att = 1 + (st.lastAtt || 0) * (stats.attune - 1);
  const worth = (st.stock * dishValue(id, false) + st.premStock * dishValue(id, true)) * att;
  const ins = Object.entries(d.inputs).map(([el, q]) =>
    `${icon('nectar_' + el)}${q}`).join('  ');

  body.innerHTML = tale(typeOf(id)) + `
    <div class="card"><div class="art" style="${art(d.dishSprite)}"></div>
      <div class="meta"><h3>${d.dish}</h3>
        <small>${ins} per dish \u00b7 ${clock(d.cook / stats.stationSpd(id))} to cook \u00b7
        ${fmt(dishValue(id, false))} each</small></div>
      <button class="buy" id="sell-here" ${n ? '' : 'disabled'}>
        ${icon('nav_sell')}${n ? fmt(worth) : 'empty'}</button></div>
    ${crewRow(id)}
    <div class="card"><div class="meta"><h3>Attunement</h3>
      <small>Attuned deliveries pay ${(stats.attune).toFixed(2)}x.
      ${st.premStock ? st.premStock + ' premium waiting.' : ''}</small></div></div>
    ${upgradeRow(id)}`;

  const sb = body.querySelector('#sell-here');
  if (sb && n) sb.onclick = () => { sellStation(id); save(); syncHUD(); syncRail(); renderKitchen(); };
  wireUpgrade(id, renderKitchen);
}

export function openKitchen(id) {
  currentKitchen = id;
  openPanel('kitchen');
}

// ---------------------------------------------------------------- hatchery
let lastPulls = [];

function renderHatchery() {
  const b = BUILDINGS.hatchery;
  title.textContent = b.name;
  const lvl = buildingStep('hatchery');
  const pity = Math.max(8, SUMMON.pity - lvl * 2);
  const legend = ((SUMMON.rates[3] + lvl * 0.006) * 100).toFixed(1);
  const full = S.bees.length >= ROSTER_MAX;

  const results = lastPulls.length ? `<div class="hint">Last hatch</div>` + lastPulls.map(p =>
    `<div class="card"><div class="art" style="${art('bee_' + p.def.el)}"></div>
      <div class="meta"><h3>${p.def.name} ${stars(p.stars)}${p.featured ? ' <b class="feat">featured</b>' : ''}</h3>
        <small>${p.isNew ? ELEMENTS[p.def.el].name + ' \u00b7 joined the park'
                         : 'already here \u00b7 +' + p.jelly + ' royal jelly'}</small></div></div>`).join('') : '';

  const ban = currentBanner();
  const star = beeDef(ban.star);
  const upNames = ban.up.map(id => beeDef(id).name).join(' and ');
  const rotIn = Math.max(0, (ban.endsAt - Date.now()) / 1000);

  body.innerHTML = tale('hatchery') + `
    <div class="banner">
      <div class="banner-art">${beeFig({ el: star.el, outfit: {} }, 72)}
        <i class="ic spot" style="${art('fx_spot')}"></i></div>
      <div class="banner-meta">
        <small>Now showing \u00b7 rotates in ${clock(rotIn)}</small>
        <h3>${ban.name}</h3>
        <p>${star.name} ${stars(3)} at ${Math.round(FEATURED_SHARE * 100)}% of Legendary pulls.
           ${upNames} are up too.</p>
        <em>${ban.line}</em>
      </div>
    </div>
    <div class="hint">${b.blurb} ${full ? 'The park is full, so every egg pays out in royal jelly instead.' : ''}
      Legendary chance ${legend}%, guaranteed within ${pity} eggs (${pity - S.pity} to go).
      ${S.lostFeatured ? '<b>Your next Legendary is ' + star.name + '.</b>' : ''}</div>
    <div class="grid">
      <div class="ucard"><h3>One egg</h3>
        <div class="art" style="${art('icon_egg')}"></div><small>&nbsp;</small>
        <button class="buy" id="pull1" ${S.gem >= SUMMON.single ? '' : 'disabled'}>
          ${icon('icon_gem')}${SUMMON.single}</button></div>
      <div class="ucard"><h3>Ten eggs</h3>
        <div class="art" style="${art('bld_hatchery')}"></div><small>saves ${SUMMON.single * 10 - SUMMON.ten}</small>
        <button class="buy" id="pull10" ${S.gem >= SUMMON.ten ? '' : 'disabled'}>
          ${icon('icon_gem')}${SUMMON.ten}</button></div>
    </div>
    ${results}
    ${upgradeRow('hatchery')}`;

  const go = n => () => {
    const cost = n === 1 ? SUMMON.single : SUMMON.ten;
    if (!spend('gem', cost)) return toast('Not enough gems');
    lastPulls = Array.from({ length: n }, () => summon());
    const got = lastPulls.filter(p => p.isNew).length;
    toast(got ? `${got} new ${got === 1 ? 'bee' : 'bees'}` : 'All jelly this time');
    save(); syncHUD(); renderHatchery();
  };
  const p1 = body.querySelector('#pull1'), p10 = body.querySelector('#pull10');
  if (p1) p1.onclick = go(1);
  if (p10) p10.onclick = go(10);
  wireUpgrade('hatchery', renderHatchery);
}

export function openBuilding(id) {
  const b = BUILDINGS[id];
  if (!b || !b.panel || !S.buildings[id]) return;
  openPanel(b.panel);
}

// ---------------------------------------------------------------- academy
let enrolling = null;   // bee id waiting for an element pick
const termLength = b =>
  Math.round(ACADEMY.duration(b.rank || 0) * (1 - buildingStep('academy') * 0.10));

function renderAcademy() {
  title.textContent = 'Snail Academy';
  const cls = S.academy.classes;
  const now = Date.now();

  const seats = Array.from({ length: ACADEMY.seats }, (_, i) => {
    const c = cls[i];
    if (!c) return `<div class="card"><div class="art" style="${art('academy')}"></div>
      <div class="meta"><h3>Empty desk</h3><small>Enrol a bee below</small></div></div>`;
    const bee = S.bees.find(b => b.id === c.beeId);
    const left = Math.max(0, (c.endsAt - now) / 1000);
    return `<div class="card"><div class="art" style="${art('bee_' + (bee?.el || 'ember'))}"></div>
      <div class="meta"><h3>${ELEMENTS[bee?.el]?.name || '?'} Bee studying ${ELEMENTS[c.el].name}</h3>
      <small>${left > 0 ? clock(left) + ' left' : 'graduating...'}</small></div></div>`;
  }).join('');

  const free = S.bees.filter(b => !inClass(b.id) && (b.rank || 0) < ACADEMY.maxRank);
  const roster = free.map(b => {
    const cost = ACADEMY.cost(b.rank || 0);
    const known = [b.el, ...(b.learned || [])].map(e => ELEMENTS[e].name).join(', ');
    return `<div class="card"><div class="art" style="${art('bee_' + b.el)}"></div>
      <div class="meta"><h3>${beeName(b)} \u00b7 Rank ${b.rank || 0}</h3>
        <small>Attuned to ${known}</small></div>
      <button class="buy" data-enrol="${b.id}" ${S.heart >= cost && cls.length < ACADEMY.seats ? '' : 'disabled'}>
        ${icon('icon_heart')}${fmt(cost)}</button></div>`;
  }).join('');

  const picker = enrolling == null ? '' : (() => {
    const bee = S.bees.find(b => b.id === enrolling);
    const opts = ELEMENT_IDS.filter(e => e !== bee.el && !(bee.learned || []).includes(e));
    return `<div class="hint">What should this bee study?</div>
      <div class="items">${opts.map(e =>
        `<div class="item" data-study="${e}"><div class="art" style="${art('blossom_' + e)}"></div>
         <span class="lv">${ELEMENTS[e].name}</span></div>`).join('')}</div>`;
  })();

  body.innerHTML = tale('academy') + `
    <div class="hint"><b>How school works.</b> Pick a bee, pay the hearts, choose an element.
      She sits at a desk for the whole term and does no work in that time. When she graduates
      she is <b>attuned to that element too</b>: her runs with that nectar pay
      ${stats.attune.toFixed(2)}x, and she now counts towards any kitchen that burns it.
      That is the only way to staff the Ash Oven and the Storm Kettle, which each need two
      elements at once. Every rank also adds ${pct(ACADEMY.carryPerRank)} carrying and
      ${pct(ACADEMY.speedPerRank)} speed, up to rank ${ACADEMY.maxRank}.
      ${ACADEMY.seats} desks, and terms get longer with each rank.</div>
    ${seats}
    ${picker}
    <div class="hint">Your bees</div>
    ${roster || '<div class="hint">Every bee has graduated.</div>'}` + upgradeRow('academy');
  wireUpgrade('academy', renderAcademy);

  body.querySelectorAll('[data-enrol]').forEach(b => b.onclick = () => {
    enrolling = +b.dataset.enrol; renderAcademy();
  });
  body.querySelectorAll('[data-study]').forEach(el => el.onclick = () => {
    const bee = S.bees.find(b => b.id === enrolling);
    const cost = ACADEMY.cost(bee.rank || 0);
    if (!spend('heart', cost)) return toast('Not enough hearts');
    S.academy.classes.push({
      beeId: bee.id, el: el.dataset.study,
      endsAt: Date.now() + termLength(bee) * 1000,
    });
    enrolling = null;
    toast('Enrolled \u00b7 term is ' + clock(termLength(bee)));
    save(); syncHUD(); renderAcademy();
  });
}

export function openAcademy() {
  if (!S.features.academy) return;
  openPanel('academy');
}

// ---------------------------------------------------------------- settings
// Honeycomb is the UI. The other four skins' CSS and frames are still in the
// project, retired, in case one is wanted for an event.
export function applyTheme() {
  const id = '';
  S.theme = '';
  const app = document.getElementById('app');
  if (S.theme) app.dataset.ui = S.theme; else delete app.dataset.ui;
  // Only switch to the 9-sliced panel frame once its art is actually there,
  // otherwise a missing file leaves a 46px solid border.
  const sheet = document.getElementById('sheet');
  sheet.classList.remove('framed');
  const im = new Image();
  im.onload = () => { if ((S.theme || '') === (id || '')) sheet.classList.add('framed'); };
  im.src = `assets/ui/panel_${S.theme || 'honeycomb'}.png`;
}

function renderSettings() {
  title.textContent = 'Settings';
  body.innerHTML = `
    <div class="hint">Park</div>
    <div class="card"><div class="meta"><h3>Hive Rank ${fmt(hivePower())}</h3>
      <small>${S.bees.length} bees \u00b7 ${techCount()} researched \u00b7
      beeswax ${fmt(S.wax)} (+${waxPerSec().toFixed(2)}/s)</small></div></div>
    <div class="card"><div class="meta"><h3>Start over</h3>
      <small>Wipes this park. There is no undo.</small></div>
      <button class="buy danger" id="do-reset">Reset</button></div>`;
  const r = body.querySelector('#do-reset');
  let armed = false;
  r.onclick = () => {
    if (!armed) { armed = true; r.textContent = 'Really?'; return; }
    wipe();
    location.reload();
  };
}

// ---------------------------------------------------------------- build menu
// Elvenar's build menu: more of what you already have. The park track still
// decides what exists; this is where you get a second grill or a third lounge.
function renderBuild() {
  title.textContent = 'Build';
  const card = (kind, type, name, sprite, sub) => {
    const pic = `<div class="art" style="${art(sprite)}"></div>`;
    if (!isUnlocked(kind, type)) {
      const t = unlockedBy(kind, type);
      return `<div class="ucard locked"><h3>${name}</h3>${pic}<small>Research ${t ? t.name : 'it'}</small>
        <button class="buy" disabled>${icon('icon_lock')}Locked</button></div>`;
    }
    const n = ownedCount(kind, type);
    if (n >= buildLimit(kind)) {
      return `<div class="ucard"><h3>${name}</h3>${pic}<small>${sub}</small>
        <button class="buy" disabled>Placed</button></div>`;
    }
    const cost = buildCost(kind, type);
    return `<div class="ucard"><h3>${name}${n ? ' \u00b7 have ' + n : ''}</h3>${pic}<small>${sub}</small>
      <button class="buy" data-build="${kind}:${type}" ${S.coin >= cost ? '' : 'disabled'}>
        ${cost ? icon('icon_coin') + fmt(cost) : 'Free'}</button></div>`;
  };
  const section = (head, cards) => `<div class="hint">${head}</div><div class="grid">${cards.join('')}</div>`;
  body.innerHTML = `<div class="hint">Pick something, then drag it where you want it. Kitchens
      need bees to keep them fed: a second grill with no extra bees just splits the nectar.</div>` +
    section('Kitchens', STATIONS.map(d => card('station', d.id, d.name, d.sprite, d.dish + ' \u00b7 3\u00d73'))) +
    section('Blossoms', Object.keys(ELEMENTS).map(el =>
      card('blossom', el, ELEMENTS[el].name + ' Blossom', 'blossom_' + el, 'nectar \u00b7 1\u00d71'))) +
    section('Park', [card('lounge', 'lounge', 'Bee Hotel', 'bld_hotel', 'sleep & wax \u00b7 2\u00d72'),
      card('academy', 'academy', 'Snail Academy', 'academy', 'second elements \u00b7 3\u00d73'),
      ...BUILDING_IDS.map(id => card('building', id, BUILDINGS[id].name, BUILDINGS[id].sprite, '3\u00d73'))]) +
    section('Decorations', Object.keys(DECOR).map(id => card('decor', id, DECOR[id].name, id, DECOR[id].effect))) +
    `<div class="card"><div class="art" style="${art('prop_sign')}"></div>
      <div class="meta"><h3>Land \u00b7 ${S.land.length} lots</h3>
        <small>Next lot ${fmt(nextLandCost())} coins. Tap a signpost at the edge of the park.</small></div></div>`;
  body.querySelectorAll('.buy[data-build]').forEach(b => b.onclick = () => {
    const [kind, type] = b.dataset.build.split(':');
    holdFresh(kind, type);
  });
}

const freshSprite = (kind, type) => kind === 'station' ? stationDef(type).sprite
  : kind === 'blossom' ? 'blossom_' + type : kind === 'lounge' ? 'bld_hotel'
  : kind === 'building' ? BUILDINGS[type].sprite : kind === 'academy' ? 'academy' : type;
const freshName = (kind, type) => kind === 'station' ? stationDef(type).name
  : kind === 'blossom' ? ELEMENTS[type].name + ' Blossom' : kind === 'lounge' ? 'Bee Hotel'
  : kind === 'building' ? BUILDINGS[type].name : kind === 'academy' ? 'Snail Academy' : DECOR[type].name;

// A new park starts with these free, for the player to place: one after another.
export function nextStarter() {
  const st = STARTERS.find(([k, t]) => isUnlocked(k, t) && !ownedCount(k, t));
  if (!st) return false;
  holdFresh(st[0], st[1]);
  if (E.fresh) toast('Place your ' + freshName(st[0], st[1]) + ', free');
  return true;
}

// ---------------------------------------------------------------- land
let currentLot = null;
function renderLand() {
  title.textContent = 'New Land';
  const cost = nextLandCost();
  body.innerHTML = `<div class="card"><div class="art" style="${art('prop_sign')}"></div>
      <div class="meta"><h3>A 5\u00d75 lot</h3>
        <small>Room for a couple of kitchens and some blossoms, or a bee hotel and a few decorations.
        You own ${S.land.length}.</small></div>
      <button class="buy" id="buy-lot" ${S.coin >= cost ? '' : 'disabled'}>${icon('icon_coin')}${fmt(cost)}</button></div>
    <div class="hint">Land only opens next to land you already have. Each lot costs more than the last.</div>`;
  const b = body.querySelector('#buy-lot');
  if (b) b.onclick = () => {
    const r = buyLot(currentLot);
    if (r === 'coin') return toast('Not enough honey coins');
    if (r !== 'ok') return closeSheet();
    toast('New land');
    save(); syncHUD(); closeSheet();
  };
}
export function openLand(lot) {
  if (!lotBuyable(lot)) return;
  currentLot = lot;
  openPanel('land');
}

// ---------------------------------------------------------------- the small things
// Bee hotels, decorations, blossoms and the coin tree have no loop of their own,
// but they still want a panel: what it is, its level, and a way to move it.
let currentThing = null;
function renderThing() {
  const key = currentThing, p = S.place[key];
  if (!p) return closeSheet();
  if (p.k === 'lounge') {
    title.textContent = 'Bee Hotel';
    const guests = S.bees.filter(b => b.restSlot === +key.slice(3) && b.mode === 'rest').length;
    const near = decorBonus(key, 'rest');
    body.innerHTML = tale('lounge') + `<div class="facts">
        <div><span>Asleep here</span><b>${guests} of ${HOTEL.tubes.length} tubes</b></div>
        <div><span>Beeswax</span><b>${(BUILD.waxPerSec * buildingLevel('lounge')).toFixed(2)}/s from each hotel</b></div>
        <div><span>Sleep</span><b>The more tired a bee, the longer she sleeps${near ? ` \u00b7 ${pct(near)} faster here, from decorations nearby` : ''}</b></div>
      </div>
      <div class="hint">Levels apply to every bee hotel you have.</div>` + upgradeRow('lounge');
    wireUpgrade('lounge', renderThing);
  } else if (p.k === 'decor') {
    const id = S.decor[+key.slice(3)], d = DECOR[id];
    title.textContent = d?.name || 'Decoration';
    // its reach shows on the map while this is open
    E.peek = E.panelPeek = key;
    const n = decorTargets(id, decorArea(key)).length;
    const noun = { kitchen: 'kitchen', blossom: 'blossom', hotel: 'bee hotel' }[d.affects];
    body.innerHTML = tale(id) + `<div class="card"><div class="art" style="${art(id)}"></div>
      <div class="meta"><h3>${d.effect}</h3>
        <small>${d.affects === 'bee'
          ? `Any bee flying within ${DECOR_RANGE} squares of it.`
          : `Reaches ${DECOR_RANGE} squares all round. Helping <b>${n} ${noun}${n === 1 ? '' : 's'}</b> right now.`}</small></div></div>
      <div class="hint">The blue square on the map is its reach${d.affects === 'bee' ? '' : `; what it helps is outlined in gold`}.
        ${d.affects !== 'bee' && n < 3 ? `Move it among more ${noun}s to help more of them.` : ''}</div>`;
  } else if (p.k === 'blossom') {
    const b = S.blossoms.find(x => 'bl:' + x.slot === key);
    title.textContent = ELEMENTS[b.el].name + ' Blossom';
    body.innerHTML = `<div class="hint">${Math.floor(b.nectar)} of ${b.max} nectar ready.
      Bees pick the nearest blossom, so keep them close to the kitchens that burn it.</div>`;
  } else if (p.k === 'building') {
    const b = BUILDINGS[key];
    title.textContent = b.name;
    body.innerHTML = tale(key) + `<div class="hint">${b.blurb}</div>` + upgradeRow(key);
    wireUpgrade(key, renderThing);
  }
}

// What a sheet is about, when it is about one thing on the grid.
function sheetKey() {
  if (tab === 'kitchen') return currentKitchen;
  if (tab === 'thing') return currentThing;
  if (tab === 'academy') return 'academy';
  const b = Object.entries(BUILDINGS).find(([, v]) => v.panel === tab);
  return b ? b[0] : null;
}
function syncSheetMove() {
  const key = sheetKey();
  $('#sheet-move').classList.toggle('hidden', !(key && S.place[key]));
}
function openPanel(name) {
  tab = name;
  sheet.classList.remove('hidden', 'wide');
  nav.querySelectorAll('button').forEach(x => x.classList.remove('on'));
  RENDER[name]();
  syncSheetMove();
}

// Tapping a thing in the park.
export function openThing(key) {
  const p = S.place[key];
  if (!p) return;
  if (p.k === 'station') return openKitchen(key);
  if (p.k === 'academy') return openAcademy();
  if (p.k === 'building' && BUILDINGS[key].panel) return openBuilding(key);
  // a decoration's reach is drawn on the map, so keep it in view below the panel
  if (p.k === 'decor') { const [x, y] = posOf(key); lookBelowPanel(x, y); }
  currentThing = key;
  openPanel('thing');
}

// ---------------------------------------------------------------- moving things
export function startMove() {
  closeSheet();
  clearHold(); E.auto = false;
  E.on = true;
  syncEdit();
}
export function endMove() {
  clearHold(); E.auto = false;
  E.on = false;
  syncEdit();
}
// auto: picked up straight after buying it, so Place/Cancel also ends move mode
export function pickUp(key, auto) {
  const p = S.place[key];
  if (!p) return;
  closeSheet();
  clearHold();
  E.on = true; E.key = key; E.kind = p.k; E.c = p.c; E.r = p.r; E.ok = true;
  E.auto = !!auto;
  syncEdit();
}
function holdFresh(kind, type) {
  const cost = buildCost(kind, type), sprite = freshSprite(kind, type);
  if (S.coin < cost) return toast('Not enough honey coins');
  const spot = findSpot(kind, viewCentre()) || findSpot(kind);
  if (!spot) return toast('No room. Buy the next lot of land first.');
  closeSheet();
  clearHold();
  E.on = true; E.fresh = { kind, type, cost }; E.kind = kind; E.sprite = sprite;
  E.c = spot.c; E.r = spot.r; E.ok = true; E.auto = true;
  syncEdit();
}
export function ghostTo(c, r) {
  if (!E.kind) return;
  const [w, h] = { station: [3, 3], building: [3, 3], academy: [3, 3], lounge: [2, 2] }[E.kind] || [1, 1];
  E.c = Math.max(0, Math.min(GRID.cols - w, c));
  E.r = Math.max(0, Math.min(GRID.rows - h, r));
  E.ok = canPlace(E.kind, E.c, E.r, E.key);
  syncEdit();
}
// Put the held thing down where its ghost is. No confirm step: one tap places
// a move, or places and pays for a new build. Returns whether it went down.
export function dropHeld() {
  if (!E.ok) { toast("It doesn't fit there"); return false; }
  if (E.fresh) {
    const { kind, type, cost } = E.fresh;
    if (!spend('coin', cost)) { toast('Not enough honey coins'); return false; }
    const key = addFresh(kind, type);
    if (!key) { give('coin', cost); toast('No room for it'); return false; }
    moveItem(key, E.c, E.r);
    toast((kind === 'station' ? kitchenName(key) : freshName(kind, type)) + ' built');
    const auto = E.auto;
    clearHold();
    if (auto) endMove(); else syncEdit();
    save(); syncHUD(); syncRail();
    if (!cost) nextStarter();
    return true;
  } else if (E.key) {
    moveItem(E.key, E.c, E.r);
  }
  const auto = E.auto;
  clearHold();
  if (auto) endMove(); else syncEdit();
  save(); syncHUD(); syncRail();
  return true;
}
export function cancelHold() {
  const auto = E.auto;
  clearHold();
  if (auto) endMove(); else syncEdit();
}
function syncEdit() {
  $('#app').classList.toggle('editing', E.on);
  const bar = $('#editbar');
  bar.classList.toggle('hidden', !E.on);
  if (!E.on) return;
  const holding = !!(E.key || E.fresh);
  bar.querySelector('.eb-msg').textContent = !holding ? 'Tap something to move it'
    : !E.ok ? "Doesn't fit there"
    : E.fresh ? `Tap where it goes \u00b7 ${E.fresh.cost ? fmt(E.fresh.cost) + ' coins' : 'free'}`
    : 'Tap where it goes, or drag it';
  const ok = bar.querySelector('.eb-ok'), no = bar.querySelector('.eb-no');
  ok.textContent = 'Done';
  ok.classList.toggle('hidden', holding);
  no.classList.toggle('hidden', !holding);
}

// ---------------------------------------------------------------- ranking
// Your hive against the county's. Theirs grow a little every real hour, up to
// double, so the table keeps moving even when you don't.
function standings() {
  const hours = Math.max(0, (Date.now() - (S.rankStart || Date.now())) / 3600e3);
  const grow = Math.min(2, 1 + hours * 0.01);
  const rows = RIVALS.map(r => ({ name: r.name, score: Math.round(r.base * grow) }));
  rows.push({ name: 'Your hive', score: hivePower(), me: true });
  rows.sort((a, b) => b.score - a.score || (a.me ? -1 : 1));
  rows.forEach((r, i) => { r.pos = i + 1; });
  return rows;
}

function renderRanking() {
  title.textContent = 'Hive Ranking';
  const rows = standings(), me = rows.find(r => r.me);
  const show = new Set([0, 1, 2]);
  for (let i = me.pos - 6; i <= me.pos + 4; i++) if (i >= 0 && i < rows.length) show.add(i);
  let last = -1;
  const list = [...show].sort((a, b) => a - b).map(i => {
    const r = rows[i];
    const gap = last >= 0 && i > last + 1 ? '<div class="rk-gap">\u22ee</div>' : '';
    last = i;
    return gap + `<div class="rk-row ${r.me ? 'me' : ''} ${r.pos <= 3 ? 'top' : ''}">
      <b class="rk-pos">${r.pos <= 3 ? ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'][r.pos - 1] : '#' + r.pos}</b>
      <span class="rk-name">${r.name}</span><span class="rk-score">${fmt(r.score)}</span></div>`;
  }).join('');
  const above = rows[me.pos - 2];
  body.innerHTML = `<div class="rk-head"><i class="ic" style="${art('fx_crest')}"></i>
      <div><b>#${me.pos} of ${rows.length}</b><small>Hive Rank ${fmt(me.score)}${above ? ` \u00b7 ${fmt(above.score - me.score + 1)} more to pass ${above.name}` : ' \u00b7 top of the county'}</small></div></div>
    <div class="rk-list">${list}</div>
    <div class="hint">Hive Rank counts your bees (stars \u00d7 level), building levels, bee hotels and research.
      The other hives keep growing, slowly, whether you're watching or not.</div>`;
}

const RENDER = { park: renderPark, ranking: renderRanking, lab: renderLab, royal: renderRoyal, bees: renderBees,
  shop: renderShop, academy: renderAcademy, orders: renderOrders, press: renderPress,
  shrine: renderShrine, hatchery: renderHatchery, kitchen: renderKitchen,
  settings: renderSettings, build: renderBuild, land: renderLand, thing: renderThing };

export function openTab(name) {
  if (!RENDER[name]) return;
  if (tab === name) return closeSheet();
  tab = name;
  if (name === 'park') renderPark.snap = true;
  sheet.classList.remove('hidden');
  sheet.classList.toggle('wide', name === 'park');
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  RENDER[name]();
  syncSheetMove();
}

export function closeSheet() {
  stopPress();
  E.panelPeek = null; E.peek = E.hover || null;
  document.getElementById('fittip')?.remove();
  tipPinned = false; hideTechTip();
  tab = null;
  sheet.classList.add('hidden');
  nav.querySelectorAll('button').forEach(b => b.classList.remove('on'));
}

export function refreshOpenTab() { if (tab) RENDER[tab](); }

export function syncDock() {
  const dock = $('#dock');
  // six at most, ready ones first, so the dock never covers the park
  const list = S.bees.filter(b => SKILLS[b.rid])
    .sort((a, b) => (skillReady(b) ? 1 : 0) - (skillReady(a) ? 1 : 0)
                 || skillLeft(a) - skillLeft(b))
    .slice(0, 6);
  dock.classList.toggle('hidden', !S.features.outfits || !list.length);
  const key = list.map(b => b.id).join(',');
  if (dock.dataset.key !== key) {
    dock.dataset.key = key;
    // each disc is one bee's skill, with her face in the corner so you know whose
    dock.innerHTML = `<span class="dock-label">Bee skills \u00b7 tap to use</span>` + list.map(b =>
      `<button class="slot-skill" data-bee="${b.id}" aria-label="${SKILLS[b.rid].name}">
        <i class="ic" style="${art(SKILLS[b.rid].icon)}"></i>
        <i class="sk-bee" style="${art('bee_' + b.el)}"></i>
        <span class="cd"></span></button>`).join('');
    dock.querySelectorAll('[data-bee]').forEach(el => {
      el.onmouseenter = () => skillTip(el);
      el.onmouseleave = () => document.getElementById('skilltip')?.remove();
    });
    dock.querySelectorAll('[data-bee]').forEach(el => el.onclick = () => {
      const bee = S.bees.find(x => x.id === +el.dataset.bee);
      if (!bee) return;
      if (!skillReady(bee)) return toast(SKILLS[bee.rid].name + ' is not ready');
      useSkill(bee);
      toast(SKILLS[bee.rid].name);
      save(); syncHUD(); syncDock();
    });
  }
  for (const el of dock.querySelectorAll('[data-bee]')) {
    const bee = S.bees.find(b => b.id === +el.dataset.bee);
    if (!bee) continue;
    const left = skillLeft(bee);
    el.classList.toggle('cooling', left > 0);
    el.querySelector('.cd').textContent = left > 0 ? Math.ceil(left) : '';
  }
}

// Hover a skill disc: whose it is, what it does, and when it's ready.
function skillTip(el) {
  const bee = S.bees.find(b => b.id === +el.dataset.bee);
  if (!bee) return;
  const sk = SKILLS[bee.rid], left = skillLeft(bee);
  document.getElementById('skilltip')?.remove();
  const t = document.createElement('div');
  t.id = 'skilltip'; t.className = 'hudtip';
  t.innerHTML = `<h4>${sk.name}</h4><p>${beeName(bee)}'s skill. ${sk.text}</p>
    <p class="rate">${left > 0 ? 'Ready in ' + clock(left) : 'Ready now: tap it'} \u00b7 cooldown ${clock(skillCd(bee.rid, bee.level || 1))}</p>`;
  const app = $('#app').getBoundingClientRect(), r = el.getBoundingClientRect();
  t.style.left = Math.max(8, r.left - app.left - 20) + 'px';
  t.style.bottom = (app.bottom - r.top + 8) + 'px';
  $('#app').appendChild(t);
}

export function initUI() {
  nav.querySelectorAll('button').forEach(b => b.onclick = () => openTab(b.dataset.tab));
  $('#boost').onclick = () => {
    if (stats.boostActive) return toast('Boost already running');
    S.boostAmt = 2;
    S.boostUntil = Date.now() + BOOST_SECONDS * 1000;
    toast('Boost on for ' + clock(BOOST_SECONDS));
    save(); syncHUD();
  };
  $('#bag').onclick = () => { const n = collectBag(); if (n) toast('Collected ' + fmt(n)); save(); syncHUD(); };
  applyTheme(S.theme);
  $('#btn-settings').onclick = () => openTab('settings');
  $('#rank-badge').onclick = () => openTab('ranking');
  $('#btn-build').onclick = () => { endMove(); openTab('build'); };
  $('#btn-move').onclick = startMove;
  $('#sheet-move').onclick = () => { const k = sheetKey(); if (k) pickUp(k, false); };
  $('#editbar .eb-ok').onclick = endMove;
  $('#editbar .eb-no').onclick = cancelHold;
  $('#sheet-close').onclick = closeSheet;
  $('#chip-kp .kpplus').onclick = e => {
    e.stopPropagation();
    if (!buyKp()) return toast(`A waggle costs ${WAGGLE.gems} gems`);
    toast('+1 waggle'); save(); syncHUD(); refreshOpenTab();
  };
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!sheet.classList.contains('hidden')) closeSheet();
    else if (E.key || E.fresh) cancelHold();
    else if (E.on) endMove();
  });
  document.querySelectorAll('[data-ic]').forEach(el => el.style.cssText += ';' + art(el.dataset.ic));
}
