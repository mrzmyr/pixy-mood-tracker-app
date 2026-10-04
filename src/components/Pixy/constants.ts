/** Pixy's face expression. The brand color never changes, only the face. */
export type PixyTone = "good" | "neutral" | "bad";

/** Ink color for pupils and mouth. */
export const PIXY_INK = "#3b1606";

/** Cheek blush color. */
export const PIXY_CHEEK = "#ff8fa3";

/** Eyes sit on the top row of the app icon's 2x2 dot grid (100 x 100 box). */
export const PIXY_EYE_Y = 38;

/** Eye radius in the 100 x 100 box. */
export const PIXY_EYE_R = 13;

/** Horizontal eye centers in the 100 x 100 box. */
export const PIXY_EYES_X = [33.5, 66.5];

/** Pupil radius in the 100 x 100 box. */
export const PIXY_PUPIL_R = PIXY_EYE_R * 0.44;
