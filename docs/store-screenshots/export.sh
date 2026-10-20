#!/usr/bin/env bash
# Export store screenshots as PNGs.
# iOS: 1290x2796 (6.9" iPhone). Android: 1080x2160 (phone, 2:1).
# Needs Google Chrome. Usage: ./export.sh
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT="${PORT:-8961}"
NAMES=(proof mood emotions tags year themes privacy)

python3 build.py
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1

shot() { # os scale width height n
  local out="export/$1/$(printf '%02d' "$5")-${NAMES[$(($5 - 1))]}.png"
  "$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor="$2" \
    --window-size="$3,$4" --virtual-time-budget=8000 \
    --screenshot="$out" "http://localhost:$PORT/index.html?export=$1&n=$5" >/dev/null 2>&1
  echo "$out"
}

mkdir -p export/ios export/android
for n in 1 2 3 4 5 6 7; do
  f=$(shot ios 4.3 300 651 "$n") && sips -c 2796 1290 --cropOffset 0 0 "$f" >/dev/null
  shot android 3.6 300 600 "$n" >/dev/null
done
sips -g pixelWidth -g pixelHeight export/*/*.png | grep -c pixel >/dev/null
echo "done: $(ls export/ios | wc -l | tr -d ' ') iOS, $(ls export/android | wc -l | tr -d ' ') Android"
