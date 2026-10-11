// expo-image for Jest: the real components, plus `Image.loadAsync` and
// `Image.clearDiskCache` without native code. `loadAsync` reads image sizes
// from the expo-image-manipulator mock (`__setImageSize`) and fits them into
// `maxWidth` and `maxHeight` like the native decoders; unknown URIs reject
// like a broken image.
const actual = jest.requireActual("expo-image");
const { __getImageSize } = require("expo-image-manipulator");

const fit = ({ size, maxWidth, maxHeight }) => {
  const scale = Math.min(
    1,
    (maxWidth ?? Infinity) / size.width,
    (maxHeight ?? Infinity) / size.height
  );
  return {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  };
};

actual.Image.loadAsync = jest.fn((source, options = {}) => {
  // A URI string or an `{ uri }` source.
  const uri = source.uri ?? source;
  const size = __getImageSize(uri);
  if (!size) {
    // Plain Error on purpose: mirrors the native module, whose errors carry
    // no structured fields.
    return Promise.reject(new Error(`Could not load image at ${uri}`));
  }
  return Promise.resolve({ ...fit({ size, ...options }), release: jest.fn() });
});
actual.Image.clearDiskCache = jest.fn(() => Promise.resolve(true));

module.exports = actual;
