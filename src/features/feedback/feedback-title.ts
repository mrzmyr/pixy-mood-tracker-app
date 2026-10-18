import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import type { FeedackType } from "./feedback";

const TITLE_KEYS: Partial<Record<FeedackType, TranslationKey>> = {
  issue: "report_a_bug",
  idea: "request_a_feature",
};

/** Header title of the feedback form for one feedback type. */
export const getFeedbackTitle = (type: FeedackType) =>
  t(TITLE_KEYS[type] ?? "feedback_modal_title");
