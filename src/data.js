// ---------------------------------------------------------------------------
// Content tables. Everything the designer tunes lives here.
// ---------------------------------------------------------------------------

// Set from GRID below: the whole map plus a wood round the edge.
export const WORLD = { w: 540, h: 1560 };

// The product rail covers roughly x > 440, and the HUD the top 170px. Nothing
// you can tap is placed there.
export const SAFE_X = 440;

export const ELEMENTS = {
  ember: { name: 'Ember', color: '#ff8a3d', soft: '#ffd9a8' },
  gale:  { name: 'Gale',  color: '#5fd3a8', soft: '#cdf4e6' },
  tide:  { name: 'Tide',  color: '#4aa8ff', soft: '#cbe8ff' },
  loam:  { name: 'Loam',  color: '#d4953f', soft: '#f6e0ae' },
};
export const ELEMENT_IDS = Object.keys(ELEMENTS);

// --- kitchens -------------------------------------------------------------
// Each tier is a big jump in dish value, the way the original's food stations
// are. Dual-element kitchens are the elemental twist: they need two nectars,
// and pay far more for it.
export const STATIONS = [
  { id: 'ember_grill', crew: { ember: 1 },   name: 'Ember Grill',   dish: 'Honey Skewer',
    sprite: 'kitchen_ember',   dishSprite: 'dish_skewer',
    inputs: { ember: 3 },              cook: 3.0, value: 1,       stockMax: 24, x: 115, y: 820 },
  { id: 'loam_mill', crew: { loam: 1 },     name: 'Loam Mill',     dish: 'Seed Cake',
    sprite: 'kitchen_loam',    dishSprite: 'dish_seedcake',
    inputs: { loam: 4 },               cook: 3.6, value: 92,      stockMax: 24, x: 375, y: 820 },
  { id: 'tide_cauldron', crew: { tide: 1 }, name: 'Tide Cauldron', dish: 'Nectar Broth',
    sprite: 'kitchen_tide',    dishSprite: 'dish_broth',
    inputs: { tide: 5 },               cook: 4.2, value: 8.4e3,   stockMax: 24, x: 375, y: 480 },
  { id: 'gale_whisk', crew: { gale: 1 },    name: 'Gale Whisk',    dish: 'Cloud Soufflé',
    sprite: 'kitchen_gale',    dishSprite: 'dish_souffle',
    inputs: { gale: 6 },               cook: 4.8, value: 7.1e5,   stockMax: 24, x: 115, y: 480 },
  { id: 'ash_oven', crew: { ember: 2, loam: 2 },      name: 'Ash Oven',      dish: 'Ember Loaf',
    sprite: 'kitchen_ash',     dishSprite: 'dish_emberloaf',
    inputs: { ember: 8, loam: 8 },     cook: 6.5, value: 6.2e7,   stockMax: 20, x: 240, y: 1320 },
  { id: 'storm_kettle', crew: { gale: 2, tide: 2 },  name: 'Storm Kettle',  dish: 'Monsoon Tea',
    sprite: 'kitchen_storm',   dishSprite: 'dish_tea',
    inputs: { gale: 10, tide: 10 },    cook: 8.0, value: 5.3e9,   stockMax: 20, x: 265, y: 270 },
];
// A kitchen can be built more than once. The first copy's key is the kitchen
// id itself; the rest are "ember_grill#2", "ember_grill#3"...
export const typeOf = key => String(key).split('#')[0];
export const copyNo = key => +(String(key).split('#')[1] || 1);
export const stationDef = id => id && STATIONS.find(s => s.id === typeOf(id));

// --- the roster ----------------------------------------------------------
// Twelve named bees, three per element. This is the squad: you summon them,
// promote them with royal jelly, and they are what the kitchens gate on.
export const RARITY = {
  1: { name: 'Common',    tint: '#9fb0a0', carry: 1.0, speed: 1.0,  jelly: 6,  promote: 10 },
  2: { name: 'Rare',      tint: '#6cb9ff', carry: 1.5, speed: 1.2,  jelly: 24, promote: 28 },
  3: { name: 'Legendary', tint: '#ffc24a', carry: 2.2, speed: 1.45, jelly: 90, promote: 70 },
};

const B = (id, name, el, stars, stat, step, line) =>
  ({ id, name, el, stars, stat, step, line });

export const BEE_ROSTER = [
  B('tindra', 'Tindra', 'ember', 1, 'carry',  0.08,  'Packs the jar too full every single time.'),
  B('sol',    'Sol',    'ember', 2, 'prem',   0.012, 'Only works mornings. Produces twice as much anyway.'),
  B('vesta',  'Vesta',  'ember', 3, 'attune', 0.20,  'Was here before the park. Nobody asks about it.'),
  B('wisp',   'Wisp',   'gale',  1, 'speed',  0.10,  'Fast. Occasionally overshoots the flower entirely.'),
  B('zephyr', 'Zephyr', 'gale',  2, 'carry',  0.10,  'Keeps a spare jar strapped on, just in case.'),
  B('aura',   'Aura',   'gale',  3, 'prem',   0.015, 'Hums. The nectar comes out better and no one knows why.'),
  B('dew',    'Dew',    'tide',  1, 'heart',  0.06,  'Says good morning to every blossom on the round.'),
  B('marin',  'Marin',  'tide',  2, 'bloom',  0.08,  'Waters things that did not ask to be watered.'),
  B('nerida', 'Nerida', 'tide',  3, 'attune', 0.18,  'Oskar will only take deliveries from her.'),
  B('clover', 'Clover', 'loam',  1, 'carry',  0.09,  'Steady. Has never once been late.'),
  B('fen',    'Fen',    'loam',  2, 'speed',  0.09,  'Takes a shortcut through the mill. Nessa has words.'),
  B('thorne', 'Thorne', 'loam',  3, 'prem',   0.018, 'Keeps a notebook. Will not say what is in it.'),
];
export const beeDef = id => BEE_ROSTER.find(b => b.id === id);

export const ROSTER_MAX = 12;
export const BEE_MAX_LEVEL = 5;
export const levelCarry = 0.12, levelSpeed = 0.08;
export const promoteCost = (stars, lvl) =>
  Math.ceil(RARITY[stars].promote * Math.pow(2.3, lvl - 1));

// --- active skills --------------------------------------------------------
// One per bee, fired from the dock above the nav. This is the squad layer you
// actually touch: cooldowns, not just passive percentages.
const SK = (name, icon, kind, mag, dur, cd, text) =>
  ({ name, icon, kind, mag, dur, cd, text });

export const SKILLS = {
  tindra: SK('Top Up',       'nectar_ember', 'topup',     6,   0,  120, 'Drops 6 nectar into every kitchen that burns Ember.'),
  sol:    SK('Golden Hour',  'fx_coins', 'premium',   8,   0,  180, 'The next 8 dishes out of any kitchen come out premium.'),
  vesta:  SK('Flashfire',    'fx_flame', 'rushcook',  1,   0,  240, 'Finishes whatever every kitchen is cooking, right now.'),
  wisp:   SK('Gust',         'fx_swirl', 'haste',     2.5, 20, 120, 'Every bee flies 2.5x faster for 20 seconds.'),
  zephyr: SK('Updraft',      'fx_gust',  'carry',     2,   30, 180, 'Every bee carries double for 30 seconds.'),
  aura:   SK('Resonance',    'fx_flash', 'profit',    3,   45, 300, 'Everything sells for 3x for 45 seconds.'),
  dew:    SK('Good Morning', 'fx_heart', 'hearts',    1,   0,  150, 'Pops a heart over every blossom at once.'),
  marin:  SK('Downpour',     'fx_splash','bloomfill', 1,   0,  180, 'Fills every blossom to the brim.'),
  nerida: SK('Deep Current', 'fx_bolt',  'attune',    2,   60, 300, 'Attuned runs pay double for 60 seconds.'),
  clover: SK('Steady Hands', 'fx_bloom', 'stamina',   45,  0,  120, 'Gives every bee 45 stamina back.'),
  fen:    SK('Shortcut',     'fx_clock', 'deliver',   1,   0,  150, 'Every loaded bee delivers where she stands.'),
  thorne: SK('Ledger',       'icon_coin', 'coins',     8,   0,  240, 'Shakes 8 coins out of the tree.'),
};
export const skillOf = rid => SKILLS[rid];
export const skillCd = (rid, level) =>
  Math.round(SKILLS[rid].cd * (1 - Math.min(0.4, ((level || 1) - 1) * 0.1)));

// --- banners --------------------------------------------------------------
// The Brood Cells run one banner at a time and it rotates. A featured bee gets
// a rate-up, and losing a Legendary roll to a non-featured bee guarantees the
// featured one next time.
export const BANNER_HOURS = 72;
export const BANNERS = [
  { id: 'ember', name: 'The Long Afternoon', star: 'vesta', up: ['sol', 'tindra'],
    line: 'Vesta has agreed to be photographed. Once.' },
  { id: 'gale',  name: 'Weather Permitting',  star: 'aura',  up: ['zephyr', 'wisp'],
    line: 'Aura hums the whole way through. Nobody minds.' },
  { id: 'tide',  name: 'High Water',          star: 'nerida', up: ['marin', 'dew'],
    line: 'Oskar put the notice up himself, which is unlike him.' },
  { id: 'loam',  name: 'Second Harvest',      star: 'thorne', up: ['fen', 'clover'],
    line: 'Thorne says the notebook is not part of the offer.' },
];
export const FEATURED_SHARE = 0.6;          // of Legendary pulls on banner
export const FEATURED_SHARE_2 = 0.5;        // of Rare pulls

export function currentBanner(now = Date.now()) {
  const slot = Math.floor(now / (BANNER_HOURS * 3600e3)) % BANNERS.length;
  const endsAt = (Math.floor(now / (BANNER_HOURS * 3600e3)) + 1) * BANNER_HOURS * 3600e3;
  return { ...BANNERS[slot], endsAt };
}

// --- hive rank ------------------------------------------------------------
// Account power. Kitchen tiers are gated on it, so a new kitchen is something
// you qualify for rather than only something you can afford.
export const HIVE_GATE = {
  ember_grill: 0, loam_mill: 70, tide_cauldron: 190,
  gale_whisk: 400, ash_oven: 750, storm_kettle: 1300,
};

// --- construction ---------------------------------------------------------
// Upgrades take real time and, past a point, beeswax as well as coins.
export const BUILD = {
  seconds: lvl => Math.min(7200, Math.round(60 * Math.pow(1.8, lvl - 1))),
  waxFrom: 3,                               // kitchens want wax from Lv.3 up
  wax: lvl => Math.ceil(12 * Math.pow(1.7, Math.max(0, lvl - 3))),
  rush: secs => Math.max(2, Math.ceil(secs / 60) * 3),
  waxPerSec: 0.06,                          // per lounge, per lounge level
};

// --- the hatchery ---------------------------------------------------------
export const SUMMON = {
  single: 40, ten: 360,                 // gems
  rates: { 1: 0.68, 2: 0.27, 3: 0.05 },
  pity: 25,                             // pulls without a 3-star before one is forced
};

// --- plots ----------------------------------------------------------------
export const BLOSSOM_SLOTS = [
  [55, 350],   [200, 190],  [400, 185],  [60, 600],   [330, 580],  [430, 760],
  [425, 960],  [215, 1075], [55, 1245],  [395, 1245], [175, 1445], [335, 1440],
];
export const ACADEMY_POS = [245, 650];

export const LOUNGE_SLOTS = [[60, 990], [425, 655]];   // v1 saves only

// The bee hotel. Tired bees fly into one of its tubes and sleep there.
// tubes: each tube mouth in the 128px art, from the art's bottom centre.
export const HOTEL = {
  size: 118,
  tubes: [[-16, -79], [7, -79], [-23, -69], [13, -69], [-5, -58], [18, -58], [-11, -47], [13, -47], [-5, -37]],
  tired: 22,           // stamina a bee checks in at
  regen: 4.5,          // stamina per second asleep, before the stamina stat
};
export const DECOR_SLOTS = [
  [305, 395], [40, 1085], [425, 1080], [160, 1190], [300, 1530], [25, 1300],
];

// Ground cover. A fixed pseudo-random scatter of the grass bits, dense enough
// that the lawn reads as grass rather than a flat green field.
export const GROUND_BITS = (() => {
  const kinds = [
    ['grass_tuft_a', 5], ['grass_tuft_b', 4], ['grass_patch', 4], ['grass_blade', 3],
    ['grass_moss', 2],   ['grass_clover', 2], ['grass_daisies', 2], ['grass_dandelion', 1],
    ['grass_seedhead', 1], ['grass_leaves', 1], ['grass_pebbles', 1], ['grass_twig', 1],
    ['grass_forget', 1], ['grass_fern', 1],  ['grass_dirt', 1],   ['grass_pollen', 2],
  ];
  const bag = [];
  for (const [name, weight] of kinds) for (let i = 0; i < weight; i++) bag.push(name);
  let seed = 0x9e3779b9;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const out = [];
  for (let i = 0; i < 0; i++) {
    out.push([
      bag[Math.floor(rnd() * bag.length)],
      Math.round(rnd() * WORLD.w),
      Math.round(rnd() * WORLD.h),
      14 + Math.round(rnd() * 12),
      rnd() < 0.5,
    ]);
  }
  return out;
})();

// Purely cosmetic scatter, so the lawn is never empty. [sprite, x, y, size]
export const SCATTER = [
  ['prop_bush', 128, 162, 68],   ['prop_bush', 404, 150, 68],   ['prop_bush', 268, 142, 64],
  ['prop_bush', 24, 1528, 66],   ['prop_bush', 180, 1548, 64],  ['prop_bush', 400, 1540, 66],
  ['prop_bush', 515, 1510, 64],  ['prop_bush', 30, 1180, 60],   ['prop_bush', 520, 1050, 60],
];

// --- park buildings -------------------------------------------------------
// Each one is a different loop, not another multiplier. Tap it to use it.
export const BUILDINGS = {
  coin_tree: {
    name: 'Honey Coin Tree', sprite: 'bld_cointree', x: 385, y: 1480, panel: null,
    blurb: 'Drops coins on the grass. Tap them before the hauler sweeps them up.',
  },
  order_board: {
    name: 'Parcel Desk', sprite: 'bld_orders', x: 370, y: 1150, panel: 'orders',
    blurb: 'Standing orders for dishes. Pays in gems and pollen.',
  },
  nectar_press: {
    name: 'Nectar Press', sprite: 'bld_press', x: 110, y: 1150, panel: 'press',
    blurb: 'Stop the gauge in the gold band for a big profit boost.',
  },
  shrine: {
    name: 'Element Shrine', sprite: 'bld_shrine', x: 105, y: 1480, panel: 'shrine',
    blurb: 'Light one element. Its attuned runs pay double while it burns.',
  },
  hatchery: {
    name: 'Brood Cells', sprite: 'bld_hatchery', x: 245, y: 985, panel: 'hatchery',
    blurb: 'The queen hatches new bees here. Gems buy eggs.',
  },
};
export const BUILDING_IDS = Object.keys(BUILDINGS);

export const COIN_TREE = { share: 0.30, every: 9, maxOnGround: 10, rots: 150 };
export const SHRINE = { minutes: 10, attuneMul: 2, bloomMul: 1.6 };
export const PRESS = { cooldown: 420, sweep: 1.9, gold: 0.09, silver: 0.22,
                       goldMul: 3.5, silverMul: 2.2, missMul: 1.4, seconds: 180 };
export const ORDERS = { slots: 3, every: 240, life: 1800 };

// Flavour. Tapping anything you built tells you a bit about who runs it.
export const STORIES = {
  ember_grill:   "Bram fans the coals with his own wing. Says it's quicker than a bellows. It isn't.",
  loam_mill:     "Nessa walks the wheel all day. She counted her steps once and won't say the number.",
  tide_cauldron: "Oskar can't get down off the rim without help, so he just keeps stirring.",
  gale_whisk:    'The souffl\u00e9 rises as long as Pip keeps pedalling. Pip worked this out and now negotiates.',
  ash_oven:      "Dag rolls dough with a pillbug called Kev. Kev volunteered. Nobody's sure why.",
  storm_kettle:  'The cloud came with the kettle. Mab strapped a rod to her shell and decided that was that.',
  academy:       "Professor Quill has taught the second-element course for forty years. He's halfway through lesson two.",
  lounge:        "Nine tubes, no bookings. The top left one gets the afternoon sun, so there's always a queue for it.",
  coin_tree:     'Grew from a coin somebody dropped and forgot. The caterpillar moved in later and pays no rent.',
  order_board:   'Pim stamps everything twice. Once for the record, once because he likes the sound.',
  nectar_press:  'Ivo will tell you that you let go early. He says that to everyone.',
  hatchery:      'The queen does not come out and she does not explain. Eggs appear. That is the arrangement.',
  shrine:        'Older than the park. Light a symbol, it runs hot for a while, then it goes quiet and wants relighting.',
  prop_sign:     'Points at the kitchens. Nobody was lost. Sales went up anyway.',
  prop_fountain: 'Runs on nothing anyone can find. Blossoms near it come back faster.',
  prop_lantern:  'Left lit by accident the first night. The flowers put out more hearts, so it stayed.',
  prop_picnic:   "Somebody's lunch, abandoned years ago and still perfectly good. Bees rest better near it.",
  prop_books:    'Recipes, mostly. A few are just complaints about other recipes.',
  prop_stump:    'A good sitting stump. That is the whole of it.',
};

// --- the park track -------------------------------------------------------
// A flat, linear purchase list, exactly like Honey Bee Park's Park tab.
const P = (title, kind, payload) => ({ title, kind, payload });

export const PARK_SCRIPT = [
  P('Light the Ember Grill',      'station', 'ember_grill'),
  P('Plant an Ember Blossom',     'blossom', 'ember'),
  P('Bring a New Bee',            'bee',     'ember'),
  P('Plant an Ember Blossom',     'blossom', 'ember'),
  P('Build a Honeycomb Lounge',   'lounge',  null),
  P('Bring a New Bee',            'bee',     'ember'),
  P('Open the Lab',               'feature', 'lab'),
  P('Raise the Loam Mill',        'station', 'loam_mill'),
  P('Plant a Loam Blossom',       'blossom', 'loam'),
  P('Bring a New Bee',            'bee',     'loam'),
  P('Plant a Loam Blossom',       'blossom', 'loam'),
  P('Set out a Honey Signpost',   'decor',   'prop_sign'),
  P('Bring a New Bee',            'bee',     'loam'),
  P('Plant the Honey Coin Tree',  'building', 'coin_tree'),
  P('Open the Dress-up Stand',    'feature', 'outfits'),
  P('Fill the Tide Cauldron',     'station', 'tide_cauldron'),
  P('Plant a Tide Blossom',       'blossom', 'tide'),
  P('Bring a New Bee',            'bee',     'tide'),
  P('Plant a Tide Blossom',       'blossom', 'tide'),
  P('Build a Second Lounge',      'lounge',  null),
  P('Set up the Parcel Desk',     'building', 'order_board'),
  P('Open the Royal Lab',         'feature', 'royal'),
  P('Build the Snail Academy',    'feature', 'academy'),
  P('Bring a New Bee',            'bee',     'tide'),
  P('Build a Little Fountain',    'decor',   'prop_fountain'),
  P('Crank up the Gale Whisk',    'station', 'gale_whisk'),
  P('Plant a Gale Blossom',       'blossom', 'gale'),
  P('Bring a New Bee',            'bee',     'gale'),
  P('Plant a Gale Blossom',       'blossom', 'gale'),
  P('Build the Nectar Press',     'building', 'nectar_press'),
  P('Hire the Honey Hauler',      'feature', 'autosell'),
  P('Bring a New Bee',            'bee',     'gale'),
  P('Plant an Ember Blossom',     'blossom', 'ember'),
  P('Fire the Ash Oven',          'station', 'ash_oven'),
  P('Plant a Loam Blossom',       'blossom', 'loam'),
  P('Bring a New Bee',            'bee',     'ember'),
  P('Raise the Element Shrine',   'building', 'shrine'),
  P('Open the Brood Cells',       'building', 'hatchery'),
  P('Hang a Park Lantern',        'decor',   'prop_lantern'),
  P('Plant a Tide Blossom',       'blossom', 'tide'),
  P('Bring a New Bee',            'bee',     'loam'),
  P('Boil the Storm Kettle',      'station', 'storm_kettle'),
  P('Plant a Gale Blossom',       'blossom', 'gale'),
  P('Bring a New Bee',            'bee',     'gale'),
  P('Plant a Tide Blossom',       'blossom', 'tide'),
  P('Lay out a Picnic',           'decor',   'prop_picnic'),
];

// Cost curve, but capped at roughly 7 minutes of your current income so the
// track never turns into the days-per-level wall the original hits around 34.
export function parkCost(index, incomePerSec) {
  if (index === 0) return 0;
  const curve = 45 * Math.pow(1.9, index);
  const capped = incomePerSec * 100 + 15;
  return Math.max(10, Math.floor(Math.min(curve, capped)));
}

// --- lab (hearts) ---------------------------------------------------------
export const GLOBAL_LAB = [
  { id: 'carry',  name: 'Nectar Carrying Capacity', art: 'bee_ember',    step: 0.20, base: 20,  curve: 1.26 },
  { id: 'speed',  name: 'Bee Flight Speed',         art: 'bee_gale',     step: 0.06, base: 12,  curve: 1.22 },
  { id: 'bloom',  name: 'Blossom Regrowth',         art: 'blossom_tide', step: 0.08, base: 15,  curve: 1.22 },
  { id: 'stam',   name: 'Bee Stamina',              art: 'bld_hotel',       step: 0.12, base: 18,  curve: 1.24 },
];
export const labCost = (u, lvl) => Math.ceil(u.base * Math.pow(u.curve, lvl));
export const stationSpdCost = lvl => Math.ceil(10 * Math.pow(1.2, lvl));
export const stationPremCost = lvl => Math.ceil(15 * Math.pow(1.24, lvl));

// --- royal lab (gems) -----------------------------------------------------
export const ROYAL_LAB = [
  { id: 'newbee', name: 'Bring a New Bee',                     art: 'bee_loam',     cost: 60,  curve: 1.5, max: 12 },
  { id: 'heartc', name: 'Flower Heart Chance',                 art: 'icon_heart',   cost: 80,  curve: 1.3, step: 0.04 },
  { id: 'boost',  name: 'Boost Efficiency',                    art: 'prop_watch',   cost: 40,  curve: 1.3, step: 0.2 },
  { id: 'profit', name: 'All Products Profit',                 art: 'icon_coin',    cost: 90,  curve: 1.3, step: 0.20 },
  { id: 'prem',   name: 'All Products Premium Chance',         art: 'icon_jelly',   cost: 100, curve: 1.3, step: 0.01 },
  { id: 'attune', name: 'Attunement Bonus',                    art: 'nectar_ember', cost: 120, curve: 1.35, step: 0.15 },
  { id: 'offline',name: 'Offline Honey Time',                  art: 'prop_watch',   cost: 70,  curve: 1.4, step: 1800, max: 8 },
];
export const royalCost = (u, lvl) => Math.ceil(u.cost * Math.pow(u.curve, lvl));

// --- outfits --------------------------------------------------------------
// hat  -> heart & premium chance | clothes -> carrying | shoes -> speed
export const OUTFITS = [
  { id: 'sunglasses', name: 'Tiny Sunglasses',  slot: 'hat',     stars: 2, stat: 'prem',  step: 0.012 },
  { id: 'earmuffs',   name: 'Fluffy Earmuffs',  slot: 'hat',     stars: 3, stat: 'heart', step: 0.05 },
  { id: 'sweater',    name: 'Honeycomb Sweater',slot: 'clothes', stars: 3, stat: 'carry', step: 0.09 },
  { id: 'bobble',     name: 'Bobble Hat',       slot: 'hat',     stars: 2, stat: 'heart', step: 0.035 },
  { id: 'toque',      name: 'Chef Toque',       slot: 'hat',     stars: 3, stat: 'prem',  step: 0.018 },
  { id: 'scarf',      name: 'Stripy Scarf',     slot: 'clothes', stars: 2, stat: 'carry', step: 0.06 },
  { id: 'boots',      name: 'Rubber Boots',     slot: 'shoes',   stars: 2, stat: 'speed', step: 0.05 },
  { id: 'apron',      name: 'Frilly Apron',     slot: 'clothes', stars: 2, stat: 'prem',  step: 0.01 },
  { id: 'mitts',      name: 'Oven Mitts',       slot: 'clothes', stars: 1, stat: 'carry', step: 0.04 },
  { id: 'sunhat',     name: 'Straw Sun Hat',    slot: 'hat',     stars: 1, stat: 'heart', step: 0.025 },
  { id: 'specs',      name: 'Gold Spectacles',  slot: 'hat',     stars: 1, stat: 'prem',  step: 0.008 },
  { id: 'slippers',   name: 'Bear Slippers',    slot: 'shoes',   stars: 3, stat: 'speed', step: 0.09 },
  { id: 'flamecrown', name: 'Flame Crown',      slot: 'hat',     stars: 3, stat: 'prem',  step: 0.02 },
  { id: 'snorkel',    name: 'Snorkel Mask',     slot: 'hat',     stars: 2, stat: 'carry', step: 0.05 },
  { id: 'cloak',      name: 'Leaf Cloak',       slot: 'clothes', stars: 3, stat: 'speed', step: 0.08 },
  { id: 'aviator',    name: 'Aviator Cap',      slot: 'hat',     stars: 3, stat: 'speed', step: 0.07 },
];
export const OUTFIT_SLOTS = ['hat', 'clothes', 'shoes'];
export const outfitUpCost = (o, lvl) => Math.ceil(o.stars * 4 * Math.pow(1.35, lvl));

// --- decor ----------------------------------------------------------------
export const DECOR = {
  prop_sign:     { name: 'Honey Signpost', effect: 'All Products Profit +25%',    profit: 0.25 },
  prop_fountain: { name: 'Little Fountain',effect: 'Blossom Regrowth +30%',       bloom: 0.30 },
  prop_lantern:  { name: 'Park Lantern',   effect: 'Flower Heart Chance +20%',    heart: 0.20 },
  prop_picnic:   { name: 'Picnic Basket',  effect: 'Bee Stamina +40%',            stam: 0.40 },
  prop_books:    { name: 'Recipe Books',   effect: 'All Production SPD +15%',     spd: 0.15 },
  prop_stump:    { name: 'Stump Stool',    effect: 'Bee Flight Speed +10%',       speed: 0.10 },
};

// --- shop -----------------------------------------------------------------
export const SHOP = [
  { id: 'gem_small', name: 'Pocket of Gems',  art: 'icon_gem',    give: { gem: 25 },     cost: { coin: 1e4 } },
  { id: 'gem_big',   name: 'Chest of Gems',   art: 'icon_gem',    give: { gem: 150 },    cost: { coin: 5e6 } },
  { id: 'pollen',    name: 'Pollen Bundle',   art: 'icon_pollen', give: { pollen: 20 },  cost: { gem: 30 } },
  { id: 'heart',     name: 'Jar of Hearts',   art: 'icon_heart',  give: { heart: 50 },   cost: { gem: 40 } },
  { id: 'rush',      name: 'Instant Harvest', art: 'prop_watch',  give: { rush: 1 },     cost: { gem: 15 } },
];

// --- building levels ------------------------------------------------------
// Elvenar-style: every building takes levels, paid in coins, and each level
// does something you can feel.
export const UPGRADES = {
  kitchen:      { max: 10, per: ['Cook speed +15%', 'Dish value +10%', 'Stock cap +10%'] },
  academy:      { max: 5,  per: ['Term time \u221210%'] },
  lounge:       { max: 5,  per: ['Rest speed +20%', 'Heart chance +8%'] },
  coin_tree:    { max: 10, per: ['Coin value +25%'] },
  order_board:  { max: 5,  per: ['Rewards +15%', '+1 order slot at 3 and 5'] },
  nectar_press: { max: 5,  per: ['Boost lasts +25%'] },
  shrine:       { max: 5,  per: ['Burns +2 minutes'] },
  hatchery:     { max: 5,  per: ['Legendary chance +0.6%', 'Pity \u22122 pulls'] },
};
export const upgradeKind = id =>
  STATIONS.some(s => s.id === typeOf(id)) ? 'kitchen' : id;

// --- land -----------------------------------------------------------------
// Elvenar rules: the park is a grid, everything sits on it, and the grid only
// grows when you buy the next lot. Lots are 5x5 cells on an 8x6 map; you start
// with the middle four and buy outward in any direction.
export const GRID = {
  cell: 54, lot: 5,        // 5x5-cell lots
  lotsX: 8, lotsY: 6,      // the whole map, in lots
  x0: 260, y0: 260,        // room round the edge for the wood
};
GRID.cols = GRID.lotsX * GRID.lot;
GRID.rows = GRID.lotsY * GRID.lot;
export const LOT_COLS = GRID.lotsX;
// You start in the middle and buy outward, any direction.
export const START_LOTS = [2 * 8 + 3, 2 * 8 + 4, 3 * 8 + 3, 3 * 8 + 4];
WORLD.w = GRID.x0 * 2 + GRID.cols * GRID.cell;
WORLD.h = GRID.y0 * 2 + GRID.rows * GRID.cell;

// Earlier grids, kept so old saves can be read back into pixels and re-laid.
export const GRID_V2 = { cell: 54, cols: 8, x0: 4, y0: 200, lot: 4 };
export const GRID_V3 = { cell: 54, cols: 10, x0: 0, y0: 200, lot: 5 };

// Footprints in cells, [w, h].
export const FOOT = {
  station: [3, 3], building: [3, 3], academy: [3, 3],
  lounge: [2, 2], blossom: [1, 1], decor: [1, 1],
};

// k = lots bought so far. Same shape as the park track: a steep curve, capped
// at a few minutes of income so land never becomes a wall.
export function landCost(k, incomePerSec) {
  const curve = 220 * Math.pow(2.2, k);
  const capped = incomePerSec * 240 + 300 * (k + 1);
  return Math.max(100, Math.floor(Math.min(curve, capped)));
}

// Extra copies. n = how many of that thing you already have. A kitchen copy
// costs about fifteen minutes of what that kitchen makes flat out, so a second
// Storm Kettle is a real decision and a second grill is pocket change.
export const COPY = {
  station: (n, d) => Math.floor((d.value / d.cook * 900 + 300) * Math.pow(2.1, n - 1)),
  blossom: (n, inc) => Math.floor((inc * 30 + 60) * Math.pow(1.35, n)),
  lounge:  (n, inc) => Math.floor((inc * 90 + 250) * Math.pow(1.9, n)),
};

// --- research -------------------------------------------------------------
// Elvenar's tech tree. Researching a node unlocks building types in the Build
// menu (and some features); nothing gets placed for you. n is the old park
// track position the node replaces, which sets its price on the same curve and
// tells a pre-tree save what it had already researched. row/col lay the tree
// out three wide; every requirement sits on an earlier row.
const T = (id, name, row, col, req, n, unlocks, extra = {}) =>
  ({ id, name, row, col, req, n, unlocks, ...extra });

export const TECH = [
  T('ember',    'Ember Cookery',     0, 1, [],                    0,  [['station', 'ember_grill'], ['blossom', 'ember']], { bee: 'ember' }),
  T('lounge',   'Bee Hotels',        1, 0, ['ember'],             4,  [['lounge', 'lounge'], ['decor', 'prop_stump']], { bee: 'ember' }),
  T('loam',     'Loam Milling',      1, 1, ['ember'],             7,  [['station', 'loam_mill'], ['blossom', 'loam']], { bee: 'loam' }),
  T('lab',      'The Lab',           1, 2, ['ember'],             6,  [], { feature: 'lab' }),
  T('outfits',  'Dress-up Stand',    2, 0, ['lounge'],            14, [], { feature: 'outfits' }),
  T('tide',     'Tide Brewing',      2, 1, ['loam', 'lab'],       15, [['station', 'tide_cauldron'], ['blossom', 'tide']], { bee: 'tide' }),
  T('cointree', 'Coin Orchard',      2, 2, ['loam'],              13, [['building', 'coin_tree']]),
  T('signpost', 'Signposting',       3, 0, ['lounge', 'loam'],    11, [['decor', 'prop_sign']], { bee: 'loam' }),
  T('academy',  'Snail Schooling',   3, 1, ['tide'],              22, [['academy', 'academy'], ['decor', 'prop_books']], { bee: 'tide' }),
  T('parcel',   'Parcel Post',       3, 2, ['tide', 'cointree'],  20, [['building', 'order_board']]),
  T('royal',    'The Royal Lab',     4, 0, ['lab', 'outfits'],    21, [], { feature: 'royal' }),
  T('gale',     'Gale Whisking',     4, 1, ['tide'],              25, [['station', 'gale_whisk'], ['blossom', 'gale']], { bee: 'gale' }),
  T('press',    'Nectar Pressing',   4, 2, ['parcel'],            29, [['building', 'nectar_press']]),
  T('fountain', 'Waterworks',        5, 0, ['signpost'],          24, [['decor', 'prop_fountain']]),
  T('shrine',   'Element Rites',     5, 1, ['academy'],           36, [['building', 'shrine']]),
  T('hauler',   'Honey Hauling',     5, 2, ['cointree', 'gale'],  30, [], { feature: 'autosell', bee: 'gale' }),
  T('lantern',  'Lamplighting',      6, 0, ['fountain'],          38, [['decor', 'prop_lantern']]),
  T('ash',      'Ash Baking',        6, 1, ['gale', 'academy'],   33, [['station', 'ash_oven']], { bee: 'ember' }),
  T('hatchery', 'Brood Keeping',     7, 0, ['royal', 'ash'],      37, [['building', 'hatchery']], { bee: 'loam' }),
  T('storm',    'Storm Brewing',     7, 1, ['ash', 'shrine'],     41, [['station', 'storm_kettle']], { bee: 'gale' }),
  T('picnic',   'Picnics',           8, 1, ['lantern', 'storm'],  45, [['decor', 'prop_picnic']]),
];
export const techDef = id => TECH.find(t => t.id === id);

// One or two lines for each node's tooltip, in the park's own voice.
export const TECH_TEXT = {
  ember:    "Where it starts. A stag beetle, a brazier, and skewers that sell for one coin each.",
  lounge:   "Bees get tired. Give them somewhere to crawl into, and they make beeswax while they sleep.",
  loam:     "Nessa the worm walks the wheel all day. Seed cake is worth ninety-odd times a skewer.",
  lab:      "Hearts start to matter. Spend them on carrying, flight speed, regrowth and stamina.",
  outfits:  "Clothes with stats. A sweater helps her carry more; sunglasses do something too, apparently.",
  tide:     "A snail with a cauldron. Nectar broth is the first dish that pays in thousands.",
  cointree: "Drops coins on the grass every few seconds. Tap them before the hauler gets there.",
  signpost: "Points at the kitchens. Nobody was lost, but profits went up a quarter anyway.",
  academy:  "The snail teaches a bee a second element, so one bee can crew two kinds of kitchen.",
  parcel:   "Standing orders for dishes. Pim pays in gems and pollen, which coins can't buy.",
  royal:    "Gems go here. Bigger, slower upgrades: profit, premium chance, longer offline time.",
  gale:     "Wind-powered whisking. Cloud soufflé, and a lot of it.",
  press:    "Stop the gauge in the gold band and every dish is worth more for a while.",
  fountain: "Blossoms near water come back faster. Nobody knows where the water comes from.",
  shrine:   "Light one element and its bees pay double while it burns.",
  hauler:   "Sells what the kitchens can't hold, at half price, into a bag you collect.",
  lantern:  "Left lit by accident the first night. More hearts, so it stayed.",
  ash:      "Needs two Ember bees and two Loam bees at once. The academy helps.",
  hatchery: "The queen hatches new bees for gems. There's a featured bee every three days.",
  storm:    "Two Gale bees, two Tide bees, and tea that's worth billions a cup.",
  picnic:   "Somebody's lunch, years old and still fine. Bees rest better near it.",
};
export const FEATURE_TEXT = {
  lab: ['The Lab', 'Park-wide upgrades, paid in hearts.', 'nav_lab'],
  outfits: ['Dress-up Stand', 'Buy outfits with gems, level them with pollen.', 'nav_bees'],
  royal: ['The Royal Lab', 'Big upgrades, paid in gems.', 'nav_royal'],
  autosell: ['Honey Hauler', 'Overflow sells at half price into a bag.', 'icon_bag'],
};
export const techCost = (t, incomePerSec) => parkCost(t.n, incomePerSec);

// What you start with for nothing, to place yourself.
export const STARTERS = [['station', 'ember_grill'], ['blossom', 'ember'], ['lounge', 'lounge']];

// --- snail academy --------------------------------------------------------
// The snail is a slow teacher, but a graduate can run attuned trips for a
// second element -- which is exactly what the two-element kitchens want.
export const ACADEMY = {
  seats: 3,
  terms: 300,                                    // seconds per rank, times rank+1
  cost: (rank) => Math.ceil(25 * Math.pow(rank + 1, 1.6)),
  duration: (rank) => 300 * (rank + 1),   // scaled down by the Academy's level
  carryPerRank: 0.08,
  speedPerRank: 0.05,
  maxRank: 3,
};

export const BOOST_SECONDS = 120;
export const BASE_OFFLINE_SECONDS = 3600;
