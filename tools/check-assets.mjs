// Every sprite name the code can ask for must exist in the manifest.
import { readFileSync, readdirSync } from 'node:fs';
const man = JSON.parse(readFileSync('assets/manifest.json', 'utf8'));
const have = new Set([...man.sprites, ...Object.keys(man.anims)]);

const { STATIONS, OUTFITS, DECOR, GLOBAL_LAB, ROYAL_LAB, SHOP, ELEMENT_IDS, BUILDINGS } =
  await import('../src/data.js');

const wanted = new Set(['lounge', 'academy', 'icon_coin', 'icon_heart', 'icon_gem', 'icon_pollen', 'icon_jelly', 'icon_bag']);
for (const el of ELEMENT_IDS) { wanted.add('bee_' + el); wanted.add('blossom_' + el); wanted.add('nectar_' + el); }
for (const s of STATIONS) { wanted.add(s.sprite); wanted.add(s.dishSprite); }
for (const o of OUTFITS) wanted.add('fit_' + o.id);
for (const d of Object.keys(DECOR)) wanted.add(d);
for (const b of Object.values(BUILDINGS)) wanted.add(b.sprite);
for (const u of [...GLOBAL_LAB, ...ROYAL_LAB]) wanted.add(u.art);
for (const i of SHOP) wanted.add(i.art);

const missing = [...wanted].filter(n => !have.has(n) && !have.has(n + '_hover')).sort();
const spare = [...have].filter(n => !wanted.has(n) && !/_hover$/.test(n)).sort();
console.log(`manifest: ${man.sprites.length} sprites, ${Object.keys(man.anims).length} animations`);
console.log(`referenced: ${wanted.size}`);
console.log(missing.length ? 'MISSING:\n  ' + missing.join('\n  ') : 'no missing sprites');
if (spare.length) console.log(`spare art not yet placed (${spare.length}): ` + spare.join(', '));
process.exit(missing.length ? 1 : 0);
