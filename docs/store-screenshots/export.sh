#!/usr/bin/env bash
# Export store screenshots as PNGs, one folder per store, numbered in upload order.
# App Store: 1320x2868 (6.9" iPhone) -> export/app-store/screenshots/.
# Google Play: 1080x1920 (phone, 9:16) -> export/google-play/screenshots/.
# App Store header 3840x1646 (21:9), search results 3840x2560 (3:2). Play feature graphic 1024x500.
# Copy and frame order per store: STORES in build.py. Needs Google Chrome. Usage: ./export.sh
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT="${PORT:-8961}"

python3 build.py
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1

shot() { # store dir scale css-height width height
  local store=$1 dir=$2 scale=$3 css_h=$4 w=$5 h=$6 n=1
  rm -rf "$dir" && mkdir -p "$dir"
  for name in $(python3 build.py --frames "$store"); do
    local out="$dir/$(printf '%02d' "$n")-$name.png"
    "$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor="$scale" \
      --window-size="300,$css_h" --virtual-time-budget=8000 \
      --screenshot="$out" "http://localhost:$PORT/index.html?export=$store&n=$n" >/dev/null 2>&1
    sips -c "$h" "$w" --cropOffset 0 0 "$out" >/dev/null
    n=$((n + 1))
  done
}

shot apple export/app-store/screenshots 4.4 652 1320 2868
shot play export/google-play/screenshots 3.6 534 1080 1920

# Google Play: taglines should not cover more than 20% of the image.
n=1; for name in $(python3 build.py --frames play); do
  share=$("$CHROME" --headless=new --window-size=300,534 --virtual-time-budget=8000 --dump-dom \
    "http://localhost:$PORT/index.html?export=play&n=$n&measure=1" 2>/dev/null | grep -o 'caption-share" content="[0-9.]*' | grep -o '[0-9.]*$')
  echo "play $n-$name caption share: $share"
  n=$((n + 1))
done

creative() { # name height [dir width scale]
  local out="export/${3:-app-store}/$1.png" w="${4:-3840}" s="${5:-4}"
  "$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor="$s" \
    --window-size="$((w / ${6:-$s})),$(($2 / ${6:-$s} + 1))" --virtual-time-budget=8000 \
    --screenshot="$out" "http://localhost:$PORT/index.html?export=creative&n=$1" >/dev/null 2>&1
  sips -c "$(($2 * s / ${6:-$s}))" "$((w * s / ${6:-$s}))" --cropOffset 0 0 "$out" >/dev/null
  sips -z "$2" "$w" "$out" >/dev/null
}
creative header 1646
creative search 2560
creative feature 500 google-play 1024 2 1 # Play feature graphic: render 2x, downsample to 1024x500
echo "done: $(ls export/app-store/screenshots | wc -l | tr -d ' ') App Store, $(ls export/google-play/screenshots | wc -l | tr -d ' ') Google Play screenshots, header + search + feature graphic"
