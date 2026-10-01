/**
 * Whether the note slide pulses its add-photo button. The hint teaches the
 * photo toolbar once: only for users with no photo on any entry yet, and
 * never under reduce motion. `isReduceMotionEnabled` is `null` until the
 * system answers; the hint waits for it.
 */
export const shouldShowPhotosHint = ({
  isActive,
  isSettingsReady,
  isHintShown,
  hasStoredPhotos,
  draftPhotosCount,
  isReduceMotionEnabled,
}: {
  /** The note slide is the current slide. */
  isActive: boolean;
  /** Settings loaded from storage, so the flag can persist. */
  isSettingsReady: boolean;
  /** Settings flag `photosHintShown`. */
  isHintShown: boolean;
  /** Any stored entry has at least one photo. */
  hasStoredPhotos: boolean;
  draftPhotosCount: number;
  isReduceMotionEnabled: boolean | null;
}) =>
  isActive &&
  isSettingsReady &&
  !isHintShown &&
  !hasStoredPhotos &&
  draftPhotosCount === 0 &&
  isReduceMotionEnabled === false;
