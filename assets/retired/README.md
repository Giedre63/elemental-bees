# Retired art

Kept for reference, not loaded by the game. `tools/manifest.sh` only scans
`assets/sprites/`, so nothing in here ends up in `manifest.json`.

- `kitchens-v1/` — the first six kitchen stations. Correct but inert: an
  object on a stone base, nobody working it, and you could not tell a Tide
  Cauldron from an Ash Oven at a glance. Replaced by `kitchen_*` in
  `assets/sprites/`, where every station is run by an insect and shows its own
  finished dish.
- `props-v1/` — first pass at the café kiosk and ice churn, replaced for the
  same reason.
- `icons-v1/` — first resource icons. A generic blue crystal and a plain heart
  said nothing about bees. Replaced by a wax-capped comb cell, a heart-petalled
  bloom, an element prism, a packed pollen basket and a crowned jelly pouch.

## hat-pinned/ (retired 2026-10-30)

Ember Grill and Tide Cauldron idle frames 1-6 with the frame-0 head and hat
pasted at a fixed spot. That stopped the AI animator's hat from melting away
like steam, but froze the head while the body bobbed. Replaced by frames that
take the frame-0 head and hat and move them by each frame's measured head
offset (up to 1px), so they bob together.

## icons-thin/ (retired 2026-11-01)

The first beeswax, amber gem and waggle icons. Each drew a thin object inside a
lot of empty space, so at HUD size they read as faint outlines. Replaced with
chunky versions that fill their frame.

## outfits-v1/ (retired 2026-11-01)

The first wardrobe: sunglasses, earmuffs, bobble hat, chef toque, aviator cap,
snorkel, spectacles, flame crown, straw sun hat, honeycomb sweater, stripy
scarf, frilly apron, oven mitts, leaf cloak, rubber boots, bear slippers.
Three slots (hat / clothes / shoes). Replaced by hats and cloaks only, all
honey, nature or insect themed.

## cointree-v1/ (retired 2026-11-01)

The first Honey Coin Tree. Its crown carried round coins rather than honeycomb
ones, and the prompt asked for "a few coins fallen in the grass at its roots",
so loose coins were painted into every frame. Replaced by a tree with hexagon
honeycomb coins and clean grass. The sleepy caterpillar stayed.
