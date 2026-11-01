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
// Each tier is a big jump in dish value, the way idle-game production tiers
// generally are. Dual-element kitchens are the elemental twist: they need two nectars,
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
  ember_grill:   "Bram has kept this fire since before the park had a name. He fans it with one wing and talks to it with the other, and the fire, for its part, mostly listens.",
  loam_mill:     "Nessa walks the wheel and the wheel, she tells the stones, walks the world. She counted her steps once. She has never said the number aloud.",
  tide_cauldron: "Oskar climbed onto the rim one spring and found he couldn't get down. That was nine summers ago. The broth has been excellent ever since.",
  gale_whisk:    "Pip pedals and the soufflé rises, and if Pip ever stops it will come down like a cathedral in a gale. Pip knows this. Pip has started asking for more.",
  ash_oven:      "Dag bakes with a pillbug called Kev, who rolls the dough and asks for nothing. There are old stories about bakers and their familiars. Dag doesn't read them.",
  storm_kettle:  "The cloud followed the kettle home one wet Tuesday and wouldn't leave. Mab tied a rod to her shell and made tea of it, which is roughly how empires begin.",
  academy:       "Professor Quill has taught the second element for forty years and is nearly halfway through lesson two. His students graduate anyway. Snails take the long view.",
  lounge:        "Nine tubes and no bookings. The top-left one catches the afternoon sun, and there have been feuds over it the hotel still won't discuss.",
  coin_tree:     "It grew from a coin someone dropped and forgot, which is how most fortunes start. The caterpillar came later. It pays no rent and has never been asked to.",
  order_board:   "Pim stamps every order twice: once for the ledger, once for the sound. Somewhere a great book records each one. Pim suspects it's his.",
  nectar_press:  "Ivo will tell you that you let go too early. He has said it to queens. He was right then, too.",
  hatchery:      "The queen does not come out and she does not explain. Eggs appear in the cells. The arrangement is older than the park and has never needed signing.",
  shrine:        "It was here before the first bee and it'll be here after the last. Light one of the four signs and it burns for a while, then sleeps, and waits to be asked again.",
  prop_sign:     "It points at the kitchens. Nobody was lost. Profits rose anyway, which tells you most of what you need to know about signs.",
  prop_fountain: "The water comes from somewhere no one has found, though several bees have gone looking. One came back wet and wiser. Blossoms nearby grow back quicker.",
  prop_lantern:  "Someone left it lit the first night and the flowers took to it. They've shown their hearts more freely ever since, and nobody has had the heart to blow it out.",
  prop_picnic:   "Somebody's lunch, left on the grass a very long time ago and still perfectly good. Bees sleep better beside it. Nobody has dared ask whose it was.",
  prop_books:    "Recipes, mostly. Some are complaints about other recipes, and one near the back is in a language the kitchens pretend not to recognise.",
  prop_stump:    "A good sitting stump. Bees that pass it fly a little lighter afterwards, and if the stump knows why, it hasn't said.",
};

// --- the park track -------------------------------------------------------
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
// track never turns into the days-per-level wall this genre tends to hit.
export function parkCost(index, incomePerSec) {
  if (index === 0) return 0;
  const curve = 45 * Math.pow(1.9, index);
  const capped = incomePerSec * 100 + 15;
  return Math.max(10, Math.floor(Math.min(curve, capped)));
}

// --- lab (hearts) ---------------------------------------------------------
// Every upgrade says what changes, in the park's own words.
export const GLOBAL_LAB = [
  { id: 'carry',  name: 'Stronger backs',   blurb: 'Every bee carries more nectar a trip', art: 'bee_ember',    step: 0.20, base: 20,  curve: 1.26 },
  { id: 'speed',  name: 'Quicker wings',    blurb: 'Every bee flies faster',               art: 'bee_gale',     step: 0.06, base: 12,  curve: 1.22 },
  { id: 'bloom',  name: 'Greener lawn',     blurb: 'Blossoms come back sooner',            art: 'blossom_tide', step: 0.08, base: 15,  curve: 1.22 },
  { id: 'stam',   name: 'Longer days',      blurb: 'Bees tire more slowly',                art: 'bld_hotel',    step: 0.12, base: 18,  curve: 1.24 },
];
export const labCost = (u, lvl) => Math.ceil(u.base * Math.pow(u.curve, lvl));
export const stationSpdCost = lvl => Math.ceil(10 * Math.pow(1.2, lvl));
export const stationPremCost = lvl => Math.ceil(15 * Math.pow(1.24, lvl));

// --- royal lab (gems) -----------------------------------------------------
export const ROYAL_LAB = [
  { id: 'newbee', name: 'Call another bee',  blurb: 'One more bee answers',                  art: 'bee_loam',     cost: 60,  curve: 1.5, max: 12 },
  { id: 'heartc', name: 'Fonder blossoms',   blurb: 'Hearts turn up more often',             art: 'icon_heart',   cost: 80,  curve: 1.3, step: 0.04 },
  { id: 'boost',  name: 'A longer summer',   blurb: 'The free boost counts for more',        art: 'prop_watch',   cost: 40,  curve: 1.3, step: 0.2 },
  { id: 'profit', name: 'Sweeter trade',     blurb: 'Every dish sells for more',             art: 'icon_coin',    cost: 90,  curve: 1.3, step: 0.20 },
  { id: 'prem',   name: 'A finer hand',      blurb: 'More dishes come out premium',          art: 'icon_jelly',   cost: 100, curve: 1.3, step: 0.01 },
  { id: 'attune', name: 'Deeper attunement', blurb: 'Attuned deliveries pay better',         art: 'nectar_ember', cost: 120, curve: 1.35, step: 0.15 },
  { id: 'offline',name: 'Nights away',       blurb: 'The park keeps earning for longer',     art: 'prop_watch',   cost: 70,  curve: 1.4, step: 1800, max: 8 },
];
export const royalCost = (u, lvl) => Math.ceil(u.cost * Math.pow(u.curve, lvl));

// --- outfits --------------------------------------------------------------
// Two slots: something on her head, something over her back. Everything a bee
// wears comes off the park itself, so it's honey, plant or insect.
export const OUTFITS = [
  // hats
  { id: 'acorn',       name: 'Acorn Cap',        slot: 'hat',   stars: 1, stat: 'carry', step: 0.04 },
  { id: 'buttercup',   name: 'Buttercup Hood',   slot: 'hat',   stars: 1, stat: 'heart', step: 0.025 },
  { id: 'bonnet',      name: 'Lavender Bonnet',  slot: 'hat',   stars: 1, stat: 'heart', step: 0.03 },
  { id: 'birchcap',    name: 'Birch Bark Cap',   slot: 'hat',   stars: 2, stat: 'speed', step: 0.05 },
  { id: 'hazelnut',    name: 'Hazelnut Helm',    slot: 'hat',   stars: 2, stat: 'carry', step: 0.06 },
  { id: 'pinecone',    name: 'Pine Cone Hat',    slot: 'hat',   stars: 2, stat: 'carry', step: 0.055 },
  { id: 'toadstool',   name: 'Toadstool Cap',    slot: 'hat',   stars: 2, stat: 'prem',  step: 0.012 },
  { id: 'clovercrown', name: 'Clover Crown',     slot: 'hat',   stars: 3, stat: 'heart', step: 0.05 },
  { id: 'combcrown',   name: 'Honeycomb Crown',  slot: 'hat',   stars: 3, stat: 'prem',  step: 0.02 },
  // cloaks
  { id: 'strawcloak',  name: 'Dry Grass Cloak',  slot: 'cloak', stars: 1, stat: 'carry', step: 0.045 },
  { id: 'leafcloak',   name: 'Leaf Cloak',       slot: 'cloak', stars: 2, stat: 'speed', step: 0.06 },
  { id: 'mosscloak',   name: 'Moss Cloak',       slot: 'cloak', stars: 2, stat: 'heart', step: 0.04 },
  { id: 'feathercloak',name: 'Down Cloak',       slot: 'cloak', stars: 2, stat: 'carry', step: 0.07 },
  { id: 'elytra',      name: 'Beetle Elytra',    slot: 'cloak', stars: 3, stat: 'speed', step: 0.09 },
  { id: 'mothcloak',   name: 'Moth Wing Cloak',  slot: 'cloak', stars: 3, stat: 'speed', step: 0.08 },
  { id: 'ambercape',   name: 'Amber Cape',       slot: 'cloak', stars: 3, stat: 'prem',  step: 0.018 },
  // shoes
  { id: 'grassboots',  name: 'Woven Grass Boots',slot: 'shoes', stars: 1, stat: 'speed', step: 0.03 },
  { id: 'petalshoes',  name: 'Petal Slippers',   slot: 'shoes', stars: 1, stat: 'heart', step: 0.02 },
  { id: 'acornboots',  name: 'Acorn Boots',      slot: 'shoes', stars: 2, stat: 'carry', step: 0.05 },
  { id: 'mossboots',   name: 'Moss Booties',     slot: 'shoes', stars: 2, stat: 'speed', step: 0.05 },
  { id: 'toadstoolboots', name: 'Toadstool Boots', slot: 'shoes', stars: 2, stat: 'heart', step: 0.035 },
  { id: 'waxclogs',    name: 'Beeswax Clogs',    slot: 'shoes', stars: 3, stat: 'carry', step: 0.08 },
  { id: 'shellshoes',  name: 'Snail Shell Shoes',slot: 'shoes', stars: 3, stat: 'speed', step: 0.085 },
];
export const OUTFIT_SLOTS = ['hat', 'cloak', 'shoes'];
export const outfitUpCost = (o, lvl) => Math.ceil(o.stars * 4 * Math.pow(1.35, lvl));

// --- decor ----------------------------------------------------------------
// Decorations help what's near them, Elvenar-style: anything of the kind they
// affect whose footprint reaches into the square DECOR_RANGE cells round them.
// Bees count when they fly through it. stat: the key the bonus feeds.
export const DECOR_RANGE = 2;
export const DECOR = {
  prop_sign:     { name: 'Honey Signpost', affects: 'kitchen', stat: 'profit', amt: 0.25, effect: 'Kitchens nearby sell for 25% more' },
  prop_fountain: { name: 'Little Fountain',affects: 'blossom', stat: 'bloom',  amt: 0.30, effect: 'Blossoms nearby regrow 30% faster' },
  prop_lantern:  { name: 'Park Lantern',   affects: 'blossom', stat: 'heart',  amt: 0.20, effect: 'Blossoms nearby drop hearts 20% more often' },
  prop_picnic:   { name: 'Picnic Basket',  affects: 'hotel',   stat: 'rest',   amt: 0.40, effect: 'Bees in hotels nearby sleep it off 40% faster' },
  prop_books:    { name: 'Recipe Books',   affects: 'kitchen', stat: 'spd',    amt: 0.15, effect: 'Kitchens nearby cook 15% faster' },
  prop_stump:    { name: 'Stump Stool',    affects: 'bee',     stat: 'speed',  amt: 0.10, effect: 'Bees fly 10% faster while they pass by' },
};
export const AFFECTS_KIND = { kitchen: 'station', blossom: 'blossom', hotel: 'lounge' };

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
// The tech tree, laid out like old Elvenar mobile's: bubbles in columns, read
// left to right, joined by arrows. Every node unlocks exactly one thing: a
// kitchen, a blossom, a building, a decoration, a feature or a new bee. n is
// the old park-track position the node stands in for: it prices the node on
// the old curve and tells a track-era save what it had. col/row place the
// bubble; rows are lanes (0 blossoms and decor, 1 kitchens, 2 bees, 3 park).
const T = (id, name, col, row, req, n, unlock, extra = {}) =>
  ({ id, name, col, row, req, n, unlocks: unlock ? [unlock] : [], ...extra });

export const TECH = [
  // I. Embers
  T('grill',    'Ember Grill',      0, 1, [],                     0,  ['station', 'ember_grill']),
  T('emberbl',  'Ember Blossom',    1, 0, ['grill'],              1,  ['blossom', 'ember']),
  T('bee1',     'Ember Bee',        1, 2, ['grill'],              2,  null, { bee: 'ember' }),
  T('stump',    'Stump Stool',      2, 0, ['emberbl'],            3,  ['decor', 'prop_stump']),
  T('bee2',     'Ember Bee II',     2, 2, ['bee1'],               5,  null, { bee: 'ember' }),
  T('hotel',    'Bee Hotel',        2, 3, ['bee1'],               4,  ['lounge', 'lounge']),
  // II. Loam
  T('loam',     'Loam Mill',        3, 1, ['grill', 'bee2'],      7,  ['station', 'loam_mill']),
  T('lab',      'The Lab',          3, 3, ['hotel'],              6,  null, { feature: 'lab' }),
  T('loambl',   'Loam Blossom',     4, 0, ['loam'],               8,  ['blossom', 'loam']),
  T('bee3',     'Loam Bee',         4, 2, ['loam'],               9,  null, { bee: 'loam' }),
  T('outfits',  'Dress-up Stand',   4, 3, ['lab'],                14, null, { feature: 'outfits' }),
  T('sign',     'Honey Signpost',   5, 0, ['loambl', 'stump'],    11, ['decor', 'prop_sign']),
  T('bee4',     'Loam Bee II',      5, 2, ['bee3'],               12, null, { bee: 'loam' }),
  T('cointree', 'Coin Tree',        5, 3, ['lab', 'loam'],        13, ['building', 'coin_tree']),
  // III. Tide
  T('tide',     'Tide Cauldron',    6, 1, ['loam', 'lab'],        15, ['station', 'tide_cauldron']),
  T('tidebl',   'Tide Blossom',     7, 0, ['tide'],               16, ['blossom', 'tide']),
  T('bee5',     'Tide Bee',         7, 2, ['tide'],               17, null, { bee: 'tide' }),
  T('parcel',   'Parcel Desk',      7, 3, ['cointree', 'tide'],   20, ['building', 'order_board']),
  T('fountain', 'Little Fountain',  8, 0, ['sign', 'tidebl'],     24, ['decor', 'prop_fountain']),
  T('bee6',     'Tide Bee II',      8, 2, ['bee5'],               23, null, { bee: 'tide' }),
  T('royal',    'The Royal Lab',    8, 3, ['outfits', 'parcel'],  21, null, { feature: 'royal' }),
  // IV. Gale
  T('gale',     'Gale Whisk',       9, 1, ['tide'],               25, ['station', 'gale_whisk']),
  T('academy',  'Snail Academy',    9, 3, ['tide', 'bee6'],       22, ['academy', 'academy']),
  T('galebl',   'Gale Blossom',     10, 0, ['gale'],              26, ['blossom', 'gale']),
  T('bee7',     'Gale Bee',         10, 2, ['gale'],              27, null, { bee: 'gale' }),
  T('press',    'Nectar Press',     10, 3, ['parcel'],            29, ['building', 'nectar_press']),
  T('books',    'Recipe Books',     11, 0, ['galebl', 'academy'], 28, ['decor', 'prop_books']),
  T('bee8',     'Gale Bee II',      11, 2, ['bee7'],              31, null, { bee: 'gale' }),
  T('hauler',   'Honey Hauler',     11, 3, ['cointree', 'gale'],  30, null, { feature: 'autosell' }),
  // V. Ash and storm
  T('ash',      'Ash Oven',         12, 1, ['gale', 'academy'],   33, ['station', 'ash_oven']),
  T('shrine',   'Element Shrine',   12, 3, ['academy'],           36, ['building', 'shrine']),
  T('lantern',  'Park Lantern',     13, 0, ['fountain'],          38, ['decor', 'prop_lantern']),
  T('bee9',     'Ember Bee III',    13, 2, ['ash'],               35, null, { bee: 'ember' }),
  T('hatchery', 'Brood Cells',      13, 3, ['royal', 'ash'],      37, ['building', 'hatchery']),
  T('storm',    'Storm Kettle',     14, 1, ['ash', 'shrine'],     41, ['station', 'storm_kettle']),
  T('bee10',    'Loam Bee III',     14, 2, ['bee9'],              40, null, { bee: 'loam' }),
  T('picnic',   'Picnic Basket',    15, 0, ['lantern', 'storm'],  45, ['decor', 'prop_picnic']),
  T('bee11',    'Gale Bee III',     15, 2, ['storm'],             43, null, { bee: 'gale' }),
];
// Waggles: the bees' waggle dance, which is how a hive shares what it has
// found. They're Elvenar's knowledge points: one trickles in every so often,
// even while you're away, up to a cap, and every research node needs some
// poured in before coins can finish it. That's what keeps research slow.
export const WAGGLE = { every: 90, cap: 10, start: 5, gems: 4 };
export const techKp = t => (t.n === 0 ? 0 : 1 + Math.floor(t.n / 5));

export const CHAPTERS = [
  { name: 'Embers', col: 0 }, { name: 'Loam', col: 3 }, { name: 'Tide', col: 6 },
  { name: 'Gale', col: 9 }, { name: 'Ash & Storm', col: 12 },
];
export const techDef = id => TECH.find(t => t.id === id);
// The old track's curve. What makes research slow now is waggles (and twice
// as many nodes), not the coin price: the income figure the cap uses assumes
// every kitchen is fed, so a bigger cap punished small parks hardest.
export const techCost = (t, incomePerSec) => (t.n === 0 ? 0 : parkCost(t.n, incomePerSec));

// One line for each node's tooltip. Flavour, so it's allowed to be strange. Bees get theirs
// from BEE_TEXT, by element.
export const TECH_TEXT = {
  grill:    "Every kingdom starts with a fire. This one starts with a beetle, a brazier, and skewers at a coin apiece.",
  emberbl:  "Ember blossoms are warm to the touch. Plant them near the grill and the bees will thank you, quietly.",
  stump:    "Somewhere to sit. Bees that pass it fly lighter, and nobody can say why.",
  hotel:    "Bees tire, like everyone. Give them tubes to crawl into and they'll make beeswax in their sleep.",
  loam:     "Nessa the worm walks the wheel. Seed cake is worth ninety skewers, and she's well aware of it.",
  lab:      "Hearts begin to matter. Spend them on stronger backs, quicker wings and greener lawns.",
  loambl:   "Loam nectar is heavy and dark and smells of rain. The mill wants four for every cake.",
  outfits:  "Clothes with a purpose. A good sweater lets a bee carry more, which is the old secret of sweaters.",
  sign:     "It points at the kitchens. Trade near it goes up a quarter, and signs have been worshipped for less.",
  cointree: "A tree that drops coins on the grass. Pick them up before the hauler does, or don't, and see who's richer by spring.",
  tide:     "A snail who never leaves the rim of his cauldron. His broth is the first dish worth thousands.",
  tidebl:   "Tide nectar, cool and blue, for the cauldron now and the storm kettle later.",
  parcel:   "Pim takes standing orders for dishes and pays in gems and pollen, which coins have never been able to buy.",
  fountain: "Water from nowhere anyone has found. Blossoms near it grow back faster and ask no questions.",
  royal:    "Gems are spent here, on the slow grand changes: richer dishes, rarer ones, longer nights away.",
  gale:     "A grasshopper on a bicycle, a whisk, and a soufflé the height of a small tower.",
  academy:  "The old snail teaches a bee a second element, so one bee can serve two kitchens.",
  galebl:   "Gale nectar is light enough to blow away, and sometimes does.",
  press:    "Stop the gauge in the gold and every dish sells dearer for a while. Ivo will still say you let go too early.",
  books:    "Recipes, mostly. Kitchens near them cook faster, possibly out of embarrassment.",
  hauler:   "Someone to sell what the kitchens can't hold, at half price, into a bag you collect when you remember.",
  ash:      "Two Ember bees and two Loam bees working side by side, for once. The academy helps with that.",
  shrine:   "An old stone that was here before the bees. Light one sign and its bees earn double while it burns.",
  lantern:  "Left lit the first night by accident. The flowers nearby have been more generous with their hearts since.",
  hatchery: "The queen hatches new bees for gems, and every three days she favours one in particular.",
  storm:    "Two Gale bees, two Tide bees and a captured cloud. The tea sells for billions and tastes faintly of thunder.",
  picnic:   "Somebody's lunch, years old and still fine. Bees sleep better beside it.",
};
export const BEE_TEXT = {
  ember: "Ember bees run warm and fly straight. The grill needs one; the ash oven, later, two.",
  loam:  "Loam bees are slow and steady and strong. The mill needs one, and the ash oven two.",
  tide:  "Tide bees hum like rain on a roof. The cauldron needs one; the storm kettle, two.",
  gale:  "Gale bees never quite land. The whisk needs one, and the storm kettle two.",
};
// Before every node did one thing, nodes did several. A save researched under
// the old ids gets every node its old one covered.
export const TECH_V4 = {
  ember: ['grill', 'emberbl', 'bee1'], lounge: ['hotel', 'stump', 'bee2'],
  loam: ['loam', 'loambl', 'bee3'], lab: ['lab'], outfits: ['outfits'],
  tide: ['tide', 'tidebl', 'bee5'], cointree: ['cointree'], signpost: ['sign', 'bee4'],
  academy: ['academy', 'books', 'bee6'], parcel: ['parcel'], royal: ['royal'],
  gale: ['gale', 'galebl', 'bee7'], press: ['press'], fountain: ['fountain'],
  shrine: ['shrine'], hauler: ['hauler', 'bee8'], lantern: ['lantern'],
  ash: ['ash', 'bee9'], hatchery: ['hatchery', 'bee10'], storm: ['storm', 'bee11'],
  picnic: ['picnic'],
};
export const FEATURE_TEXT = {
  lab: ['The Lab', 'Park-wide upgrades, paid in hearts.', 'nav_lab'],
  outfits: ['Dress-up Stand', 'Buy outfits with gems, level them with pollen.', 'nav_bees'],
  royal: ['The Royal Lab', 'Big upgrades, paid in gems.', 'nav_royal'],
  autosell: ['Honey Hauler', 'Overflow sells at half price into a bag.', 'icon_bag'],
};

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

// --- neighbouring hives -----------------------------------------------------
// The ranking: other hives in the county, each with a Hive Rank that creeps up
// over real days, so climbing the table never quite stops. Bases are spread
// from a new hive's to a finished one's.
export const RIVALS = [
  'The Bramble Court', 'Old Mossback', 'Hollyhock Combs', "Queen Tamsin's Rest", 'Wort & Willow',
  'The Ninefold Hive', 'Lantern Hill', "Sorrel's Reach", 'Thistledown', 'The Quiet Apiary',
  "Mabel's Folly", 'Ironbark Combs', 'The Last Orchard', 'Clover Throne', 'Hazel Hollow',
  'The Sundial Hive', 'Tansy Gate', 'Brackenmoor', 'The Waxen Tower', 'Foxglove Rest',
  'Kettle Lane', "Saint Agnes' Bees", 'The Drowsy Combe', 'Elderflower Keep', 'Gorse End',
  'The Amber Cloister', 'Little Hamwick', "Rook's Meadow", "The Pale Queen's Hive", 'Marigold Market',
  'Duskwing', 'The Crooked Skep', 'Honeysuckle Row', 'Owlbury', 'The Second Garden',
  'Larkspur', 'Nettlebed', 'The Gilded Comb', 'Wychwood', 'Barrow Down',
].map((name, i, all) => ({ name, base: Math.round(14 * Math.pow(3600 / 14, (all.length - 1 - i) / (all.length - 1))) }));
