/**
 * Photo files that fixtures reference by `fileName`: abstract gradients made
 * with ffmpeg, no third-party images. React Native only; the CLI imports
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
} satisfies Record<string, number>;
