import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { HostInstance, LayoutChangeEvent, View } from "react-native";

/** Layout size in points, as `onLayout` reports it. */
export interface MeasuredSize {
  width: number;
  height: number;
}

const EMPTY: MeasuredSize = { width: 0, height: 0 };
// `offsetWidth` and `offsetHeight` round to whole points.
const ROUNDING_TOLERANCE = 1;

/**
 * Layout size of a host view right now, or `null` when it cannot be read
 * synchronously. Matches what `onLayout` reports on each platform.
 */
export const readMeasuredSize = (
  node: HostInstance | null | undefined
): MeasuredSize | null => {
  // The Jest test renderer gives refs without DOM methods.
  if (node?.getBoundingClientRect === undefined) {
    return null;
  }
  // react-native-web `onLayout` reports `offsetWidth` and `offsetHeight`.
  if (Platform.OS === "web") {
    return { width: node.offsetWidth, height: node.offsetHeight };
  }
  // Fabric: exact layout size, but with transforms applied. A scaled view
  // (enter animation) would read too small, so wait for `onLayout` then.
  const { width, height } = node.getBoundingClientRect();
  const isTransformed =
    Math.abs(width - node.offsetWidth) > ROUNDING_TOLERANCE ||
    Math.abs(height - node.offsetHeight) > ROUNDING_TOLERANCE;
  return isTransformed ? null : { width, height };
};

/**
 * Size of a view in the first painted frame. Attach `ref` and `onLayout` to
 * the same view. Size stays `{ width: 0, height: 0 }` until known.
 *
 * - New Architecture and web: read in a layout effect, before paint
 * - Later size changes (rotation, Dynamic Type, parent bleed): `onLayout`
 */
export const useMeasuredSize = () => {
  const ref = useRef<View>(null);
  const [size, setSize] = useState<MeasuredSize>(EMPTY);

  const update = useCallback(({ width, height }: MeasuredSize) => {
    setSize((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height }
    );
  }, []);

  // No dependency list: runs after every commit of the owner. The first read
  // always changes the size, so the owner commits again in the same pre-paint
  // pass and reads a parent that resized meanwhile (Android MenuList bleed).
  // Equal sizes keep the state, so this settles.
  useLayoutEffect(() => {
    const measured = readMeasuredSize(ref.current);
    if (measured) {
      update(measured);
    }
  });

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => update(event.nativeEvent.layout),
    [update]
  );

  return { ref, size, onLayout };
};
