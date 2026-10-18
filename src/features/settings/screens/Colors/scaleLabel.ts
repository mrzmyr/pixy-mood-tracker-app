import { t } from "@/lib/translation";

/**
 * Spoken name of a scale row. Scales have no names, so screen readers hear
 * the position, for example "Color scale 2 of 3".
 */
export const scaleLabel = (index: number, total: number) =>
  t("colors_scale_label", { position: index + 1, total });
