/** Spin of the launch splash logo, in ms. */
export const LAUNCH_SPIN_MS = 900;
/** Fade of the launch splash overlay, in ms. */
export const LAUNCH_FADE_MS = 350;
/** Delay before the fade when reduce motion is on, in ms. */
export const LAUNCH_REDUCED_DELAY_MS = 250;

/** Total time on screen. The launch splash unmounts after this. */
export const getLaunchSplashDuration = ({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) =>
  (reduceMotion ? LAUNCH_REDUCED_DELAY_MS : LAUNCH_SPIN_MS) + LAUNCH_FADE_MS;
