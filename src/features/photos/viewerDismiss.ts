/** Drag distance, as share of the screen height, that closes the viewer. */
export const DISMISS_DISTANCE_RATIO = 0.25;

/** Flick speed in points per second that closes the viewer. */
export const DISMISS_VELOCITY = 1000;

/**
 * Release decision of the viewer's swipe to close, up or down.
 *
 * A fast flick away from the start closes at any distance. A fast flick
 * back toward the start keeps the viewer open, even after a long drag.
 * A slow release closes after {@link DISMISS_DISTANCE_RATIO} of the screen
 * height.
 */
export const shouldDismissPhoto = ({
  translationY,
  velocityY,
  screenHeight,
}: {
  translationY: number;
  velocityY: number;
  screenHeight: number;
}): boolean => {
  "worklet";
  if (Math.abs(velocityY) > DISMISS_VELOCITY) {
    return (
      translationY === 0 || Math.sign(velocityY) === Math.sign(translationY)
    );
  }
  return Math.abs(translationY) > screenHeight * DISMISS_DISTANCE_RATIO;
};
