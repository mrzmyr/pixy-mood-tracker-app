// Native image manipulator for Jest. Source images exist only after
// `__setImageSize({ uri, width, height })`; unknown URIs reject like a broken
// image. `manipulate` also takes an image ref with `width` and `height`, like
// the one `Image.loadAsync` (src/__mocks__/expo-image.js) returns. Saved
// images land in the expo-file-system mock cache directory.
const { File, Paths } = require("expo-file-system");

const sizes = new Map();
let savedCount = 0;

const getResized = ({ size, target }) => {
  if (target.width) {
    return {
      width: target.width,
      height: Math.round((size.height * target.width) / size.width),
    };
  }
  return {
    width: Math.round((size.width * target.height) / size.height),
    height: target.height,
  };
};

const createImageRef = ({ width, height }) => ({
  width,
  height,
  release: jest.fn(),
  saveAsync: jest.fn(() => {
    savedCount += 1;
    const file = new File(Paths.cache, `manipulated-${savedCount}.jpg`);
    file.create();
    return Promise.resolve({ uri: file.uri, width, height });
  }),
});

// A URI string, or an image ref with its decoded size.
const getSourceSize = (source) => {
  if (source.width === undefined) {
    return sizes.get(source);
  }
  return { width: source.width, height: source.height };
};

const manipulate = jest.fn((source) => {
  const uri = source.width === undefined ? source : "image ref";
  let size = getSourceSize(source);
  const context = {
    resize: jest.fn((target) => {
      size = getResized({ size, target });
      return context;
    }),
    renderAsync: jest.fn(() => {
      if (!size) {
        // Plain Error on purpose: mirrors the native module, whose errors
        // carry no structured fields.
        return Promise.reject(new Error(`Could not load image at ${uri}`));
      }
      return Promise.resolve(createImageRef(size));
    }),
    release: jest.fn(),
  };
  return context;
});

module.exports = {
  ImageManipulator: { manipulate },
  SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" },
  __setImageSize: ({ uri, width, height }) => sizes.set(uri, { width, height }),
  __getImageSize: (uri) => sizes.get(uri),
  __resetImageSizes: () => sizes.clear(),
};
