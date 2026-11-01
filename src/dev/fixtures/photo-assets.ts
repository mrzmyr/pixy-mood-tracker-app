/**
 * Photo files that fixtures reference by `fileName`: abstract gradients made
 * with ffmpeg, and generated photos of the demo characters (`klara-*`, see
 * DESIGN.md "Demo characters"). No third-party images. React Native only; the CLI imports
 * the fixtures without these. The fixture loader imports each file and
 * points entries at the stored copy.
 */
export const FIXTURE_PHOTO_ASSETS = {
  "fixture-photo-1.jpg": require("./photos/photo-1.jpg"),
  "fixture-photo-2.jpg": require("./photos/photo-2.jpg"),
  "fixture-photo-3.jpg": require("./photos/photo-3.jpg"),
  "fixture-photo-4.jpg": require("./photos/photo-4.jpg"),
  "fixture-photo-5.jpg": require("./photos/photo-5.jpg"),
  "fixture-photo-6.jpg": require("./photos/photo-6.jpg"),
  "klara-breakfast.jpg": require("./photos/klara/breakfast.jpg"),
  "klara-chuky-park.jpg": require("./photos/klara/chuky-park.jpg"),
  "klara-copenhagen-bikes.jpg": require("./photos/klara/copenhagen-bikes.jpg"),
  "klara-jen-call.jpg": require("./photos/klara/jen-call.jpg"),
  "klara-kaifu-bad.jpg": require("./photos/klara/kaifu-bad.jpg"),
  "klara-letter.jpg": require("./photos/klara/letter.jpg"),
  "klara-playground-swing.jpg": require("./photos/klara/playground-swing.jpg"),
  "klara-rain-walk.jpg": require("./photos/klara/rain-walk.jpg"),
  "klara-reading-sofa.jpg": require("./photos/klara/reading-sofa.jpg"),
  "klara-sea-dunes.jpg": require("./photos/klara/sea-dunes.jpg"),
  "klara-sea-fishbun.jpg": require("./photos/klara/sea-fishbun.jpg"),
  "klara-sea-sandcastle.jpg": require("./photos/klara/sea-sandcastle.jpg"),
  "klara-swimming.jpg": require("./photos/klara/swimming.jpg"),
  "klara-underwater.jpg": require("./photos/klara/underwater.jpg"),
} satisfies Record<string, number>;
