# Elemental Bees — design

A cosy bee city builder. The loop takes its shape from the idle-management
genre — **Honey Bee Park** (Wondersquad, 2023) is the clearest example of it,
and Part 1 is our reading of how that kind of game works. Everything in Part 2
is this game's own: its art, its buildings, its words and its systems.

## Part 1 — how this kind of game works

Reconstructed from the store listing, a hands-on review, and five screenshots.

### The loop

1. Blossoms grow on a lawn. Bees fly out and harvest from them.
2. Bees carry the harvest to a **food station** and drop it in a buffer.
3. The station cooks on a timer and pushes finished goods onto a stack.
4. Stacks sit in a rail down the right edge. **You tap one to sell it.**
   Anything that overflows auto-sells at **half price**.
5. Coins buy the next thing on a single linear **Park** list.

Two deliberate anti-idle frictions: selling is manual, and hearts that pop over
flowers are manual. That is what keeps you opening the app.

### Currencies

| | Source | Spent on |
|---|---|---|
| Coins | selling goods | the Park track |
| Hearts | tapping bubbles over flowers and napping bees | Lab |
| Gems | park levels, shop, ads | Royal Lab |
| Pink pollen | — | levelling costume items |

### The five tabs

- **Lab** (hearts) — a 2-wide grid. Per-station *Production SPD +x%* and
  *Premium Production Chance +x%*, plus global ones like *Carrying Capacity +20%*.
- **Royal Lab** (gems) — same grid, bigger global levers: *Bring a New Bee*,
  *All Products Profit +20%*, *Flower Heart Generation Chance +4%*,
  *Ad Buff Efficiency +0.2*.
- **Park** (coins) — a vertical list of numbered levels. Each is one purchase:
  *Bring a New Bee*, *Plant Dandelion*, *Build Mover*. Done ones carry a green
  tick, the next one is gold with a price, the rest are greyed with
  "Park LV n Required". Entirely linear.
- **Outfits** — a bee carousel with Hat / Clothes / Shoes tabs. Items have a
  star rarity and a level. Not cosmetic: they buff the bee.
- **Shop** — decor and boosts.

### Readability details that earn their place

- Some signal beside every station for *starved or backed up*. Mostly empty →
  you need more bees. Mostly full → you need more station speed. One glance,
  one decision. Ours is a comb of four cells that fills with the nectar the
  kitchen burns (`combGauge` in `render.js`).
- Numbers use `K M B T` then `aa ab ac…`.
- Tapping a prop shows a plain-language tooltip: *"Promotion — Increases All
  Products Profit by 100%."*
- A free recurring boost within reach. Ours is the **sunny spell**, a round sun
  badge bottom-left.
- Coins physically drop on the grass and can be tapped.

### The flaw to fix

The reviewer's complaint: the upgrade path is linear, so there is little
planning, and around park level 34 progress slows to days per level.

## Part 2 — what this build changes

### Theme

Four elements: **Ember, Gale, Tide, Loam**.

Bees, blossoms and kitchens all carry one. Blossoms grow elemental nectar;
kitchens cook it into dishes.

| Kitchen | Needs | Makes |
|---|---|---|
| Ember Grill | 3 Ember | Honey Skewer |
| Loam Mill | 4 Loam | Seed Cake |
| Tide Cauldron | 5 Tide | Nectar Broth |
| Gale Whisk | 6 Gale | Cloud Soufflé |
| **Ash Oven** | 8 Ember + 8 Loam | Ember Loaf |
| **Storm Kettle** | 10 Gale + 10 Tide | Monsoon Tea |

Every kitchen is run by an insect and shows the dish it makes, so you can read
the park without labels: a stag beetle fans the grill over its skewers, an
earthworm walks a treadmill that turns the mill, a snail chef leans off the
cauldron rim, a grasshopper pedals the whisk under an absurd soufflé, a beetle
baker rolls dough with a pillbug, and a snail in a lightning rod brews tea
under its own small thundercloud. The first, plainer pass is kept in
`assets/retired/kitchens-v1/`.

### Attunement — the planning layer

A bee carrying nectar of **its own** element makes an *attuned* delivery. The
share of attuned nectar in a dish raises both its sale value and its premium
chance. So the question stops being "what is next on the list" and becomes
"which bees should be flying which routes".

The two-element kitchens are where it bites: no single bee can attune to both
halves of an Ash Oven dish.

### The Snail Academy

Which is what the snail is for. Enrol a bee, pay hearts, and the snail teaches
it a **second element** over a slow real-time term. A graduate runs attuned
trips for both — and gains +8% carrying and +5% speed per rank.

While a bee is at its desk it is out of the workforce. That is the cost.

### Buildings that aren't just multipliers

The original fills its park with building types, not only food stations. Same
here, and each one is a different thing to do:

| Building | What it asks of you |
|---|---|
| **Honey Coin Tree** | Drops coins on the grass. Tap them, or the hauler takes half. |
| **Parcel Desk** | Standing orders for dishes. Pays gems and pollen, which nothing else does at volume. |
| **Nectar Press** | A sweeping gauge you stop by hand. Gold band is 3.5x profit for three minutes. |
| **Element Shrine** | Light one element. Its attuned runs pay double and its blossoms regrow faster, for ten minutes. |
| **Snail Academy** | Teaches a bee a second element over a real-time term. |
| **Honeycomb Lounge** | Where tired bees nap, and where half the hearts come from. |

The park is 540x1400 and scrolls vertically, so there is room for all of it.

Every building has a story on it. Tap one and you get a couple of lines about
whoever runs it. They're in `STORIES` in `src/data.js`, keyed by building id.

### The squad layer

Bees are not interchangeable workers any more. There are **twelve named bees**,
three per element, at one, two or three stars. Each carries a passive that
applies park-wide, and rarity sets how much she carries and how fast she flies.

- **Brood Cells** hatch them. 40 gems an egg, 360 for ten. 5% Legendary,
  rising with the building's level, and a Legendary is guaranteed inside 25
  eggs. A bee you already have, or one you have no room for, pays out in
  **royal jelly**.
- **Royal jelly** promotes a bee: five levels, each +12% carrying, +8% speed,
  and the passive scales with it.
- The park holds twelve. That is the squad.
- Bees can be **pinned to one kitchen** or left to roam.

### Kitchens gate on coverage

A kitchen does not run unless enough bees are attuned to every element it
burns. One for the single-element kitchens; **two of each** for the Ash Oven
(Ember + Loam) and the Storm Kettle (Gale + Tide). Attuned means born to it or
taught at the Academy, which is the only other way in. A short-staffed kitchen
shows the sigils it is missing and cooks nothing.

So the question is no longer "what is next on the list". It is which bees you
have, which you promote, and who you send to school.

### Active skills

Every bee has one, fired from the dock above the nav. Twelve of them, on
cooldowns that shorten as she levels:

- **Flashfire** (Vesta) finishes whatever every kitchen is cooking, now.
- **Gust** (Wisp) 2.5x flight speed for 20s. **Updraft** (Zephyr) double carrying.
- **Resonance** (Aura) 3x profit for 45s. **Deep Current** (Nerida) double attunement.
- **Downpour** (Marin) fills every blossom. **Good Morning** (Dew) pops every heart.
- **Golden Hour** (Sol) makes the next 8 dishes premium. **Ledger** (Thorne) shakes
  8 coins out of the tree. **Shortcut** (Fen) delivers every loaded bee on the spot.

This is the layer you actually touch. Passives are the background; skills are
the reason to open the game.

### Rotating banners

The Brood Cells run one banner at a time, rotating every 72 hours. The featured
Legendary takes 60% of Legendary pulls, and two Rares are up alongside her. Lose
a Legendary roll to a non-featured bee and the **next one is guaranteed hers**.
Four banners, one per element, each with its own name and notice.

### Hive Rank

Account power: bees weighted by rarity and level, plus academy ranks, plus how
far the park is built. Kitchen tiers are gated on it, so a new kitchen is
something you qualify for rather than only something you can afford.

| Kitchen | Hive Rank |
|---|---|
| Ember Grill | 0 |
| Loam Mill | 70 |
| Tide Cauldron | 190 |
| Gale Whisk | 400 |
| Ash Oven | 750 |
| Storm Kettle | 1300 |

### Building levels

Every building takes levels, paid in coins, Elvenar style. Cost is anchored to
your income so it stays a few minutes of play, growing 1.9x per level.

| Building | Per level |
|---|---|
| Kitchens | Cook speed +15%, dish value +10%, stock cap +10% (to Lv.10) |
| Snail Academy | Term time −10% (to Lv.5) |
| Honeycomb Lounge | Rest speed +20%, heart chance +8% |
| Honey Coin Tree | Coin value +25% (to Lv.10) |
| Parcel Desk | Rewards +15%, +1 order slot at 3 and 5 |
| Nectar Press | Boost lasts +25% |
| Element Shrine | Burns +2 minutes |
| Brood Cells | Legendary chance +0.6%, pity −2 |

Upgrades are not instant. Each takes real time on a growing curve (1 minute at
Lv.1, about an hour at Lv.9), one site at a time, with a gem cost to finish
now. From Lv.3 they also want **beeswax**, which the lounges produce slowly and
nothing else does. That is the Elvenar shape: a queue, a soft resource, and a
reason to come back.

### UI skins

Five complete interface skins, switchable from the gear: Honeycomb, Beeswax,
Orchard Night, Picnic, Botanical. Each is a generated 512x512 pixel-art panel
frame, 9-sliced into the sheet, plus its own palette, header treatment, border
weight and disabled states. Orchard Night is a true dark theme, re-tuned rather
than inverted.

The slice numbers matter more than they look. Each panel's corner ornament runs
further in than you'd guess, so the slice has to clear it or the browser cuts
the ornament in half and stretches the stump down the edge. Measured corners:
honeycomb 104, botanical 96, orchard 90, picnic 82, beeswax 72, all on 512px
art. Border width stays at roughly 0.36 of the slice, which keeps the gold rail
the same visual thickness it had before.

### Reading the park without a legend

Callouts over a building carry a word and an icon, not a bare `!` or a number:
"3 orders" over the parcel desk, "Collect" over the nectar press. Tapping a HUD
chip pops a card saying what that resource is and where it comes from, with the
live rate for coins and beeswax.

Bees keep a sticky facing. A bee flying almost straight up or down has no
sideways travel to read, so she holds the way she was already pointing instead
of snapping back to the default and looking like she's flying tail-first.

### Lawn

The grass is a procedural 128x128 tile built at load: soft mottling plus short
blades, every stroke drawn nine times so it wraps at the edges. No repeating
seam to spot, and nothing scattered on top of it beyond the hedge line.

### No level-34 wall

Park costs are `min(45 × 1.9^n, 100 seconds of your current income)`. The curve
governs late, the income cap governs early, and no step is ever more than a
couple of minutes of play away.

### Everything else kept

Manual selling with 50% auto-sell overflow, tappable hearts, the comb gauge,
the five tabs, the star-rarity outfits, `K M B T aa ab`, offline catch-up at
45% for up to an hour (extendable in the Royal Lab).

### Elvenar layout

The park used to be a fixed picture: every kitchen, building, blossom, lounge
and decoration had hardcoded coordinates and the park track dropped each one
into its slot. It's now a grid.

- **Landscape.** The screen layout copies Elvenar: a free camera (pan both
  ways, wheel/pinch zoom about the cursor, 0.45–1.8×), resources top centre,
  menu cluster bottom right, centred panel windows. The map is a fixed 8×6 lots
  with a wood round the edge.
- **Cells** are 54px; **lots** 5×5. You start with the middle four and buy
  outward; a lot is for sale when it shares an edge with one you own. A lot is for sale when it touches one you own. Cost is
  `min(220 × 2.2^k, 240s of income + 300(k+1))`, the same curve-with-a-cap
  shape as the park track.
- **Copies**: kitchens, blossoms and lounges can be built again from the Build
  menu. The six park buildings and the decorations stay one each (decoration
  buffs stack, so copies would be free power). A kitchen copy costs
  `(value / cook × 900 + 300) × 2.1^(n−1)`: about fifteen minutes of that
  kitchen flat out. Each copy levels on its own; Lab upgrades are per kitchen
  type. Orders and the product rail treat copies as one dish.
- **One unlock per node, and waggles.** The tree is now 38 bubbles in five
  chapters, laid out like old Elvenar mobile (columns, right-angled arrows,
  chapter tabs). Each unlocks one thing; bees are their own nodes. Waggles
  are the knowledge points: one per 90s to a cap of 10, `1 + n/5` per node,
  poured in before the coin price can be paid. Coin prices stay on the old
  track curve; the waggle trickle is what slows research. A headless hour now
  reaches 16/38 (it was 15/21).
- **Research replaced the park track.** `TECH` in `data.js` is a 21-node tree
  laid out three wide; each node lists what it unlocks (building types,
  features) and some grant a bee, eleven in all, which is what the track used
  to hand out. A node's `n` is the track position it replaces: it prices the
  node on the old curve (`parkCost`) and tells a pre-tree save which nodes it
  already has. Kitchen nodes keep the Hive Rank gate.
- **Nothing is placed for you.** The Build menu shows every type, locked ones
  naming their research. First kitchen of a type costs
  `min(value/cook × 300 + 40, 40s income + 40)`; park buildings and decorations
  `45s income + 80`. The Ember Grill, an Ember Blossom and one lounge are free
  for a new park, offered one after another to place.
- **Old saves**: v2 (8-column phone grid) and v3 (10-column phone grid) are
  read back into pixels, shifted so the old park's top left sits at the
  starting lots, and laid out again, granting free land nearest each thing as
  needed and at least as many cells as before. v1/v2 track position becomes
  research.
- **Bees fly**, so there are no roads. The squeeze is land and bees: a copy
  with no extra bees just splits the nectar.
- **Old saves** (v1) are migrated on load: each thing goes to the free spot
  nearest where it stood, biggest first, with land granted free as needed.
  Levels, stock and bees are untouched.

### Sitting on the ground

Building art has 6-12px of empty rows under it. Drawn from the image edge, the
art hovered over its own shadow. `plant()` in `render.js` measures each
sprite's empty rows once (from frame 0 of an animation, so frames don't
jitter) and drops it so the lowest painted pixel sits on the anchor. The
shadow is centred a fifth of its width behind that line, with a tight dark
contact patch at the base.

### Bee hotels

The lounge is now a hexagon insect hotel (`bld_hotel`, PixelLab). A bee under
`HOTEL.tired` stamina takes a free tube (nine per hotel, positions measured off
the art), flies to its mouth, shrinks in, and is not drawn while asleep; z's
rise from the tube. She regains `HOTEL.regen × stamina stat` per second, so
sleep length scales with how tired she was: about 20s from the threshold.
No free tube anywhere, and she keeps working.

### Our own words

Upgrade labels are written in the park's voice rather than the genre's stock
phrasing: *Stronger backs*, *Quicker wings*, *Sweeter trade*, *A finer hand*,
*Nights away*. Per-kitchen upgrades read *a hotter fire* and *a careful hand*.
Flavour text (building stories, research lines) is written to be read, not
skimmed.

### Clothes on the body

The clothes art is front-on shop art; pasted over a round side-on bee it reads
as a sticker. `src/wear.js` paints body clothes into each bee frame instead:
the item's own fabric, tiled at its pixel size, clipped to the body silhouette,
behind the face line and under the wings, shaded from the top left, with a
ribbed collar and hem on the sweater. Hats, glasses, shoes and mitts are still
overlays. The wing palette is shared with the Gale body and Tide stripes, so a
wing pixel is that palette *and* in the top of the frame.

## Numbers

All in `src/data.js`. `npm run smoke` runs an hour of play headless and prints
park level, income and bee idleness at 1m / 5m / 15m / 30m / 1h.

Current pacing: park LV 24 and ~141K/s at the one-hour mark, 21 of 41 entries
bought, no idle bees.
