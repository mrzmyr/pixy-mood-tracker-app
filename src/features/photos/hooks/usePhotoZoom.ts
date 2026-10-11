import {
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from "react-native-gesture-handler";
import {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  DOUBLE_TAP_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOMED_THRESHOLD,
  clampZoomOffset,
  getContainSize,
  getFocalOffset,
} from "../viewerZoom";

// A pinch may go this far past the limits, then springs back on release.
const PINCH_OVERSHOOT = 0.25;
const DOUBLE_TAP_DURATION = 250;

/**
 * Pinch, pan, and double tap zoom for one photo of the viewer.
 *
 * Pinch zooms around the fingers, up to {@link MAX_ZOOM}. Below
 * {@link MIN_ZOOM} the photo springs back on release. While zoomed in, one
 * finger pans and a flick glides to a stop at the photo edge. Double tap
 * zooms in at the tap point, or back out.
 *
 * `onZoomChange` runs when the photo starts or stops being zoomed in, so the
 * viewer can stop paging and swipe to close.
 */
export const usePhotoZoom = ({
  width,
  height,
  photoSize,
  onZoomChange,
}: {
  width: number;
  height: number;
  photoSize?: { width: number; height: number };
  onZoomChange: (isZoomed: boolean) => void;
}) => {
  const view = { width, height };
  const photo = getContainSize({ view, photo: photoSize });
  const zoom = useSharedValue(MIN_ZOOM);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startZoom = useSharedValue(MIN_ZOOM);
  const startOffsetX = useSharedValue(0);
  const startOffsetY = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);
  const isZoomed = useSharedValue(false);

  useAnimatedReaction(
    () => zoom.get() > ZOOMED_THRESHOLD,
    (next, previous) => {
      isZoomed.set(next);
      if (previous !== null && next !== previous) {
        scheduleOnRN(onZoomChange, next);
      }
    }
  );

  const saveStart = () => {
    "worklet";
    cancelAnimation(zoom);
    cancelAnimation(offsetX);
    cancelAnimation(offsetY);
    startZoom.set(zoom.get());
    startOffsetX.set(offsetX.get());
    startOffsetY.set(offsetY.get());
  };

  // Springs after a pinch, eases after a double tap.
  const animateTo = (
    nextZoom: number,
    offset: { x: number; y: number },
    { isTap }: { isTap: boolean }
  ) => {
    "worklet";
    const clamped = clampZoomOffset({ offset, zoom: nextZoom, view, photo });
    const animate = (value: number) =>
      isTap
        ? withTiming(value, { duration: DOUBLE_TAP_DURATION })
        : withSpring(value);
    zoom.set(animate(nextZoom));
    offsetX.set(animate(clamped.x));
    offsetY.set(animate(clamped.y));
  };

  const pinch = usePinchGesture({
    onActivate: (event) => {
      saveStart();
      startFocalX.set(event.focalX - width / 2);
      startFocalY.set(event.focalY - height / 2);
    },
    onUpdate: (event) => {
      const nextZoom = Math.min(
        Math.max(startZoom.get() * event.scale, MIN_ZOOM - PINCH_OVERSHOOT),
        MAX_ZOOM + PINCH_OVERSHOOT
      );
      const offset = getFocalOffset({
        focal: { x: startFocalX.get(), y: startFocalY.get() },
        startOffset: { x: startOffsetX.get(), y: startOffsetY.get() },
        startZoom: startZoom.get(),
        zoom: nextZoom,
      });
      // Two fingers that move together also pan the photo.
      const focalX = event.focalX - width / 2;
      const focalY = event.focalY - height / 2;
      zoom.set(nextZoom);
      offsetX.set(offset.x + focalX - startFocalX.get());
      offsetY.set(offset.y + focalY - startFocalY.get());
    },
    onDeactivate: () => {
      const current = zoom.get();
      if (current < ZOOMED_THRESHOLD) {
        animateTo(MIN_ZOOM, { x: 0, y: 0 }, { isTap: false });
        return;
      }
      const nextZoom = Math.min(current, MAX_ZOOM);
      // Shrink back toward the center of the view, like the pinch did.
      const offset = getFocalOffset({
        focal: { x: 0, y: 0 },
        startOffset: { x: offsetX.get(), y: offsetY.get() },
        startZoom: current,
        zoom: nextZoom,
      });
      animateTo(nextZoom, offset, { isTap: false });
    },
  });

  const pan = usePanGesture({
    enabled: isZoomed,
    maxPointers: 1,
    onActivate: saveStart,
    onUpdate: (event) => {
      const offset = clampZoomOffset({
        offset: {
          x: startOffsetX.get() + event.translationX,
          y: startOffsetY.get() + event.translationY,
        },
        zoom: zoom.get(),
        view,
        photo,
      });
      offsetX.set(offset.x);
      offsetY.set(offset.y);
    },
    onDeactivate: (event) => {
      const max = clampZoomOffset({
        offset: { x: Infinity, y: Infinity },
        zoom: zoom.get(),
        view,
        photo,
      });
      offsetX.set(
        withDecay({ velocity: event.velocityX, clamp: [-max.x, max.x] })
      );
      offsetY.set(
        withDecay({ velocity: event.velocityY, clamp: [-max.y, max.y] })
      );
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: (event) => {
      saveStart();
      if (zoom.get() > ZOOMED_THRESHOLD) {
        animateTo(MIN_ZOOM, { x: 0, y: 0 }, { isTap: true });
        return;
      }
      const offset = getFocalOffset({
        focal: { x: event.x - width / 2, y: event.y - height / 2 },
        startOffset: { x: 0, y: 0 },
        startZoom: MIN_ZOOM,
        zoom: DOUBLE_TAP_ZOOM,
      });
      animateTo(DOUBLE_TAP_ZOOM, offset, { isTap: true });
    },
  });

  const gesture = useSimultaneousGestures(pinch, pan, doubleTap);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.get() },
      { translateY: offsetY.get() },
      { scale: zoom.get() },
    ],
  }));

  return { gesture, photoStyle };
};
