import { usePanGesture } from "react-native-gesture-handler";
import {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { shouldDismissPhoto } from "../viewerDismiss";

/**
 * Points a drag travels before it picks an axis. Use the same value to make
 * a horizontal pager fail on vertical drags.
 */
export const AXIS_LOCK_DISTANCE = 10;

// Share of the screen height a drag travels until the backdrop or the
// controls are fully transparent.
const BACKDROP_FADE_RATIO = 0.5;
const CONTROLS_FADE_RATIO = 0.1;
const CLOSE_DURATION = 200;
// Snap-back carries the release velocity and may overshoot a little,
// because the finger gave it momentum.
const SNAP_BACK_SPRING = { duration: 400, dampingRatio: 0.8 };

/**
 * Vertical swipe to close for the photo viewer, up or down.
 *
 * The photo follows the finger, the backdrop and the controls fade with the
 * distance. On release, velocity + distance decide (`shouldDismissPhoto`):
 * the photo leaves the screen and `onClose` runs, or it springs back. A new
 * drag catches the photo mid spring.
 *
 * With reduce motion the photo stays in place. The same release decision
 * calls `onClose`, and the screen fades out with its own transition.
 *
 * `isEnabled: false` turns the swipe off, for example while a zoomed photo
 * pans.
 */
export const useSwipeToClose = ({
  screenHeight,
  isEnabled = true,
  onClose,
}: {
  screenHeight: number;
  isEnabled?: boolean;
  onClose: () => void;
}) => {
  const isReducedMotion = useReducedMotion();
  const offsetY = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const isClosing = useSharedValue(false);

  const gesture = usePanGesture({
    enabled: isEnabled,
    maxPointers: 1,
    activeOffsetY: [-AXIS_LOCK_DISTANCE, AXIS_LOCK_DISTANCE],
    failOffsetX: [-AXIS_LOCK_DISTANCE, AXIS_LOCK_DISTANCE],
    onActivate: () => {
      cancelAnimation(offsetY);
      dragStartY.set(offsetY.get());
    },
    onUpdate: (event) => {
      if (isReducedMotion || isClosing.get()) {
        return;
      }
      offsetY.set(dragStartY.get() + event.translationY);
    },
    onDeactivate: (event) => {
      if (isClosing.get()) {
        return;
      }
      const translationY = isReducedMotion ? event.translationY : offsetY.get();
      const isDismissed =
        !event.canceled &&
        shouldDismissPhoto({
          translationY,
          velocityY: event.velocityY,
          screenHeight,
        });
      if (!isDismissed) {
        offsetY.set(
          withSpring(0, { ...SNAP_BACK_SPRING, velocity: event.velocityY })
        );
        return;
      }
      isClosing.set(true);
      if (isReducedMotion) {
        scheduleOnRN(onClose);
        return;
      }
      const direction = Math.sign(translationY || event.velocityY);
      offsetY.set(
        withTiming(
          direction * screenHeight,
          { duration: CLOSE_DURATION, easing: Easing.bezier(0.23, 1, 0.32, 1) },
          (isFinished) => {
            if (isFinished) {
              scheduleOnRN(onClose);
            }
          }
        )
      );
    },
  });

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offsetY.get() }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(offsetY.get()),
      [0, screenHeight * BACKDROP_FADE_RATIO],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));
  const controlsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(offsetY.get()),
      [0, screenHeight * CONTROLS_FADE_RATIO],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  return { gesture, photoStyle, backdropStyle, controlsStyle };
};
