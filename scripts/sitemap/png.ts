// Deterministic PNG bytes: decode, drop every metadata chunk, re-encode
// with fixed settings. Same pixels give the same bytes and hash on any host
// with the same Bun version.
import { PNG } from "pngjs";

import { sha256 } from "./inputs.ts";

/** Decoded image. Width and height in pixels. */
export interface Image {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel. */
  data: Buffer;
}

/** Decode any PNG the simulator writes to RGBA. */
export const decodePng = (bytes: Buffer): Image => {
  const png = PNG.sync.read(bytes);
  return { width: png.width, height: png.height, data: png.data };
};

/** RGB PNG without ancillary chunks, fixed filter and zlib level. */
export const encodePng = (image: Image): Buffer =>
  PNG.sync.write(
    Object.assign(new PNG({ width: image.width, height: image.height }), {
      data: image.data,
    }),
    { colorType: 2, inputHasAlpha: true, deflateLevel: 9, filterType: 4 }
  );

/** Normalized bytes and their hash. */
export const normalizePng = (bytes: Buffer) => {
  const normalized = encodePng(decodePng(bytes));
  return { bytes: normalized, hash: sha256(normalized) };
};

/** Hash of pixels only: equal pixels, equal hash, whatever the encoder. */
export const hashPixels = (image: Image) =>
  sha256(
    Buffer.concat([Buffer.from(`${image.width}x${image.height}:`), image.data])
  );

/** Box filter: each output pixel is the mean of a factor x factor block. */
export const downscale = (image: Image, factor: number): Image => {
  const width = Math.floor(image.width / factor);
  const height = Math.floor(image.height / factor);
  const data = Buffer.alloc(width * height * 4);
  const area = factor * factor;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sums = [0, 0, 0, 0];
      for (let dy = 0; dy < factor; dy += 1) {
        const row = ((y * factor + dy) * image.width + x * factor) * 4;
        for (let dx = 0; dx < factor; dx += 1) {
          const offset = row + dx * 4;
          sums[0] += image.data[offset];
          sums[1] += image.data[offset + 1];
          sums[2] += image.data[offset + 2];
          sums[3] += image.data[offset + 3];
        }
      }
      const out = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        data[out + channel] = Math.round(sums[channel] / area);
      }
    }
  }
  return { width, height, data };
};
