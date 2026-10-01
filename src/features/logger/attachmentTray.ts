/** Height of the attachment tray strip in pt. */
export const TRAY_HEIGHT = 64;

/**
 * Distance in pt from the bottom safe area to the tray: the floating
 * next/save button (54pt) with its 16pt bottom margin, plus an 8pt gap.
 */
export const TRAY_BOTTOM_OFFSET = 16 + 54 + 8;

// Slides already keep about 16pt free at the bottom for the floating button
// row. The tray takes the rest of the space above that row.
const SLIDE_BOTTOM_SPACE = 16;

/**
 * Whether the logger shows the attachment tray.
 *
 * The tray hides with 0 photos on every slide. This rule also keeps the
 * rating slide clean until the user picks a rating or adds a photo.
 */
export const isTrayVisible = ({ photosCount }: { photosCount: number }) =>
  photosCount > 0;

/**
 * Bottom padding of the slide container, so the tray never covers slide
 * content. Slides draw their own bottom row (for example the "disable step"
 * link) next to the floating button; with the tray, that row moves above
 * the tray.
 */
export const getSlidePaddingBottom = ({
  photosCount,
}: {
  photosCount: number;
}) =>
  isTrayVisible({ photosCount })
    ? TRAY_HEIGHT + TRAY_BOTTOM_OFFSET - SLIDE_BOTTOM_SPACE
    : 0;
