// Sprite loading. Anything missing falls back to a drawn placeholder so the
// game still runs while art is being generated.
const imgs = new Map();
const anims = new Map();
export let manifest = { sprites: [], anims: {} };

function load(src) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

export async function loadAssets() {
  try {
    manifest = await (await fetch('assets/manifest.json', { cache: 'no-store' })).json();
  } catch { manifest = { sprites: [], anims: {} }; }

  await Promise.all([
    ...manifest.sprites.map(async n => {
      const im = await load(`assets/sprites/${n}.png`);
      if (im) imgs.set(n, im);
    }),
    ...Object.entries(manifest.anims).map(async ([n, count]) => {
      const frames = await Promise.all(
        Array.from({ length: count }, (_, i) => load(`assets/sprites/${n}_${i}.png`))
      );
      const ok = frames.filter(Boolean);
      if (ok.length) anims.set(n, ok);
    }),
  ]);
}

export const sprite = n => imgs.get(n) || null;
export const hasSprite = n => imgs.has(n);

export function animFrame(name, t, fps = 12) {
  const fr = anims.get(name);
  if (!fr) return imgs.get(name.replace(/_[a-z]+$/, '')) || null;
  return fr[Math.floor(t * fps) % fr.length];
}

export const animCount = name => (anims.get(name) || []).length;

// data: URL for a sprite, for use as a CSS background in the DOM UI.
const urlCache = new Map();
export function spriteUrl(n) {
  if (urlCache.has(n)) return urlCache.get(n);
  const u = imgs.has(n) ? `assets/sprites/${n}.png` : '';
  urlCache.set(n, u);
  return u;
}
