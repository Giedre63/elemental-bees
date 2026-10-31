#!/bin/sh
# Screenshot the running game with headless Chrome, and report any console error.
#   ./tools/shoot.sh out.png "?demo=30&tab=park"
# Needs `npm start` on :8137.
#
# Headless Chrome ignores --window-size for layout: it clamps the viewport to at
# least 500 wide and knocks ~143px off the height. 500x1003 gives the 9:16 the
# game is built for.
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="${1:-shot.png}"
Q="${2:-}"
TMP="$(mktemp -d)"
"$CH" --headless=new --disable-gpu --no-sandbox --user-data-dir="$TMP" \
  --window-size=500,1003 --hide-scrollbars --virtual-time-budget=9000 \
  --enable-logging=stderr --log-level=0 \
  --screenshot="$OUT" "http://localhost:8137/$Q" 2>"$TMP/log"
rm -rf "$TMP/Default" 2>/dev/null
ERR=$(grep -iE "CONSOLE:|Uncaught" "$TMP/log" | sed 's/^.*CONSOLE[^]]*] //' | sort -u)
rm -rf "$TMP"
echo "wrote $OUT"
[ -n "$ERR" ] && { echo "CONSOLE ERRORS:"; echo "$ERR"; exit 1; }
exit 0
