import { t } from "@/lib/translation";

/** Spoken name of the leading button: Cancel drops edits, Close loses nothing. */
export const getCloseLabel = (hasConfirm: boolean) =>
  hasConfirm ? t("cancel") : t("close");
