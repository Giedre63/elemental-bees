#!/bin/sh
# Rebuild assets/manifest.json from whatever PNGs are in assets/sprites.
# Files named <name>_<n>.png are grouped into an animation called <name>.
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
import json, os, re
d = 'assets/sprites'
stills, anims = [], {}
for f in sorted(os.listdir(d)):
    if not f.endswith('.png'): continue
    n = f[:-4]
    m = re.match(r'^(.*)_(\d+)$', n)
    if m:
        anims[m.group(1)] = max(anims.get(m.group(1), 0), int(m.group(2)) + 1)
    else:
        stills.append(n)
json.dump({'sprites': stills, 'anims': anims},
          open('assets/manifest.json', 'w'), indent=1)
print(f'{len(stills)} sprites, {len(anims)} animations')
PY
