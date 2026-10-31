// What the player is holding while laying out the park. The renderer draws
// from it, main.js feeds it taps, ui.js starts and ends it.
export const E = {
  on: false,        // move mode: grid showing, a tap picks a thing up
  key: null,        // what is held: a placed key, or null
  kind: null,       // its footprint kind
  sprite: null,     // for a new build that is not on the grid yet
  c: 0, r: 0,       // where the ghost sits
  fresh: null,      // { kind, type, cost } a new build waiting for its spot
  ok: false,        // can it go down where the ghost is
  auto: false,      // picked up straight after buying, so Place also ends move mode
};

export function clearHold() {
  E.key = null; E.kind = null; E.sprite = null; E.fresh = null; E.ok = false;
}
