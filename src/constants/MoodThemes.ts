import { z } from "zod";

/** Stable appearance IDs. Classic keeps the original colored pixels. */
export const MoodThemeSchema = z.enum(["classic", "blobs", "cats", "robots"]);

/** Character appearance, independent of the rating color scale. */
export type MoodTheme = z.infer<typeof MoodThemeSchema>;
