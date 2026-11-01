# Elemental Bees

A cosy idle park where elemental bees cook. Built as a base game on the
mechanics of cosy idle-management games, re-themed to elementals +
cooking. All art is pixel art generated through PixelLab.

```sh
npm start          # serves on http://localhost:8137
npm run assets     # rebuild assets/manifest.json after adding sprites
npm run smoke      # headless economy run, prints an hour of pacing
node tools/check-assets.mjs   # every sprite the code asks for exists
./tools/shoot.sh out.png "?demo=30&tab=park"   # headless screenshot
node tools/bundle.mjs /tmp/pub                 # publishable copy
```

Dev URL params: `?demo=N` builds N park entries for free and fast-forwards the
sim, `?tab=park|lab|royal|outfit|shop|academy` opens a panel, `?dress` opens the
dress-up sub-tab, `?fit` dresses the whole roster, `?tip=coin|wax|gem|...` pops
a HUD tooltip, `?rename` opens the rename box, `?move` starts move mode,
`?hold=ember_grill` picks something up, `?sleep` puts every bee to bed, `?look=1200,900` points the camera at a
world point, `?zoom=0.6` zooms, `?ttip=tide` opens a research tooltip, `?thing=lg:0` opens that building's panel,
`?showcase=gale_whisk` hides the UI (and those kitchens) for screenshots, `?debug` writes sim state into the page title.

`tools/wear.html` (served) shows every bee in every wrapped top, two frames each.

No build step and no dependencies — plain ES modules and a canvas.
`node tools/bundle.mjs <dir>` writes the publishable copy (CSS inlined into
index.html, `src/` and `assets/` beside it, retired art dropped).

## How to play

- Blossoms grow nectar. Bees fetch it and feed the kitchens.
- Tap a kitchen, or its chip in the right rail, to **sell**. Overflow sells
  itself at half price. Tap an empty kitchen for its panel and upgrade.
- **Landscape, Elvenar-style.** Drag to pan the map either way; mouse wheel or
  two fingers to zoom. Resources across the top, dishes down the right, boost
  and skills bottom left, the menu bottom centre with Build biggest. Panels open
  as centred windows; Research opens wide and reads left to right.
- The park is a **grid on land you own**: an 8×6 map of 5×5 lots. You start
  with the middle four and buy outward in any direction. Everything takes cells:
  kitchens and buildings 3×3, lounges 2×2, blossoms and decorations 1×1.
- **Signposts** on the lots next to yours sell them. Land only opens next to land
  you have, and each lot costs more.
- Kitchens, blossoms and lounges can be built again. Kitchen copies cost
  about fifteen minutes of that kitchen's output, and need more bees to feed
  them. Park buildings and decorations are one each.
- **Long-press** any building to pick it up, then drag and let go, or tap
  where it goes. It drops straight away; red means it doesn't fit and it goes
  back. **Move** in the menu (or on any panel) does the same with a plain tap.
  New builds: one tap places and pays.
- Hover or tap a **research node** for a card with the building, a line about
  it and its numbers.
- Tap the heart bubbles over blossoms and sleeping bees.
- Tired bees fly into a tube in a **Bee Hotel** and sleep there; z's drift out
  of the tube. The more tired, the longer they sleep. Each hotel has nine tubes.
- **Research** (the hammer tab) is a bubble tree in five chapters: 38 nodes,
  each unlocking exactly one thing (a kitchen, blossom, building, decoration,
  feature or bee), joined by arrows that turn green as you go.
- **Hive Rank badge** top left opens the county ranking; you can name your hive there.
- **Waggles** (the dance medallion at the top) trickle in, one every 90
  seconds up to 10, even while you're away. Pour them into a research bubble,
  then pay coins to finish it. + on the chip buys one for 4 gems.
- **Build** lists every building, decoration, blossom and kitchen: locked ones
  say which research opens them. Pick one, drag it where you want, Build.
  A new park starts with the Ember Grill, an Ember Blossom and a lounge free
  to place. **Lab** spends hearts, **Royal Lab** spends
  gems, **Dress-up** spends gems and pollen.
- Tap the **Snail Academy** to teach a bee a second element.
- Tap the **Parcel Desk** for dish orders, the **Nectar Press** for a timed
  profit boost, the **Element Shrine** to make one element pay double, and the
  coins under the **Coin Tree** before the hauler gets them.
- Tap any building for its panel: its story, what it needs, its upgrade, and
  Move.
- **Bees** tab has the roster and the dress-up stand. Twelve named bees, one to
  three stars. Summon them at the **Brood Cells**, promote them with royal
  jelly, pin them to a kitchen or let them roam.
- A kitchen only runs if enough bees are attuned to every element it burns. The
  Ash Oven and Storm Kettle each want two of each, which is what the Academy is
  for.
- Every bee has an **active skill**. The dock above the nav shows up to six,
  ready ones first.
- The Brood Cells run a **rotating banner**: the featured Legendary takes 60% of
  Legendary pulls, and losing that roll guarantees her next time.
- **Hive Rank** gates the kitchen tiers. It comes from your bees and how far the
  park is built.
- Upgrades take **real time** and, from Lv.3, **beeswax** from the lounges. One
  site at a time; gems finish it now.
- Body clothes (sweater, cloak, apron, scarf) are painted onto the bee's body,
  not pasted in front of it.
- **Rename any bee** from the roster card or the dress-up strip.
- Tap a **HUD chip** to find out what that resource is and where it comes from.

A bee carrying its own element makes an *attuned* delivery — worth more, and
more likely to come out premium. The two-element kitchens need bees that have
been to school.

## Layout

```
index.html  style.css
src/   num   data   state   sim   render   ui   assets   main
assets/sprites/*.png + manifest.json
tools/ manifest.sh   check-assets.mjs   smoke.mjs   bundle.mjs   shoot.sh
docs/  DESIGN.md     ← the reverse-engineering writeup
```

`src/data.js` holds every tunable: kitchens, the park track, lab and royal-lab
upgrades, outfits, decor, the academy.
