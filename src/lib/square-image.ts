import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * Center-crops `sourceUri` to a square, scales it to `size` pixels, and
 * writes a JPEG to the cache. Callers move the file to its final place and
 * wrap errors with their own status.
 *
 * @returns the file URI of the rendered JPEG.
 */
export const renderSquareJpeg = async ({
  sourceUri,
  size,
  quality,
}: {
  sourceUri: string;
  size: number;
  quality: number;
}): Promise<string> => {
  const original = await ImageManipulator.manipulate(sourceUri).renderAsync();
  const edge = Math.min(original.width, original.height);
  const rendered = await ImageManipulator.manipulate(original)
    .crop({
      originX: Math.floor((original.width - edge) / 2),
      originY: Math.floor((original.height - edge) / 2),
      width: edge,
      height: edge,
    })
    .resize({ width: size, height: size })
    .renderAsync();
  const saved = await rendered.saveAsync({
    compress: quality,
    format: SaveFormat.JPEG,
  });
  return saved.uri;
};
