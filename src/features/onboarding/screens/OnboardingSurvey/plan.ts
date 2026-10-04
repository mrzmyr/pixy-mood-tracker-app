import { STEP_OPTIONS } from "@/constants/LoggerSteps";
import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import { REMINDER_TIMES } from "./survey";
import type { Influence, SurveyAnswers } from "./survey";

/**
 * Feature tip on the plan screen. Only features with status `available` in
 * `docs/app-facts.json`.
 */
export type PlanTip =
  | "import"
  | "emotions"
  | "monthly_report"
  | "export"
  | "multiple_entries"
  | "filters"
  | "year_in_pixels"
  | "notes"
  | "pixel_calendar";

/** What the survey sets up, plus tips. `null` keeps the current setting. */
export interface SurveyPlan {
  /** Daily reminder time (`HH:mm`), or `null` for no reminder. */
  reminderTime: string | null;
  /** Logger steps in settings order, or `null` to keep the defaults. */
  steps: ConfigurableLoggerStep[] | null;
  /** Tags to create, in answer order. Empty keeps the default tags. */
  tags: Influence[];
  /** Up to {@link PLAN_TIPS_MAX} tips, most relevant first. */
  tips: PlanTip[];
  /** The user wants help with hard days: Pixy adds a caring line. */
  isCaring: boolean;
}

/** Most tips shown on the plan screen. */
export const PLAN_TIPS_MAX = 3;

const getSteps = (answers: SurveyAnswers): ConfigurableLoggerStep[] | null => {
  const { depth, goals = [], influences = [], experience } = answers;
  if (!depth) {
    return null;
  }

  const steps = new Set<ConfigurableLoggerStep>(["rating"]);
  if (depth === "quick") {
    if (goals.includes("understand") || goals.includes("stress")) {
      steps.add("emotions");
    }
    if (influences.length > 0) {
      steps.add("tags");
    }
  } else {
    steps.add("emotions");
    steps.add("tags");
    steps.add("feedback");
  }
  if (depth === "write" || experience === "journal") {
    steps.add("message");
  }

  return STEP_OPTIONS.filter((step) => steps.has(step));
};

const getTips = ({
  experience,
  goals = [],
  frequency,
  depth,
}: SurveyAnswers): PlanTip[] => {
  const tips = new Set<PlanTip>();
  if (experience === "pixy") {
    tips.add("import");
  }
  if (goals.includes("stress")) {
    tips.add("emotions");
  }
  if (goals.includes("patterns") || goals.includes("understand")) {
    tips.add("monthly_report");
  }
  if (goals.includes("therapy")) {
    tips.add("export");
  }
  if (frequency === "several" || frequency === "moments") {
    tips.add("multiple_entries");
  }
  if (goals.includes("patterns")) {
    tips.add("filters");
  }
  if (goals.includes("habit") || frequency === "daily") {
    tips.add("year_in_pixels");
  }
  if (depth === "write" || experience === "journal") {
    tips.add("notes");
  }
  if (tips.size === 0) {
    tips.add("pixel_calendar");
  }
  return [...tips].slice(0, PLAN_TIPS_MAX);
};

/**
 * Turn survey answers into a plan. Pure: applying it is `useApplyPlan`.
 * Skipped questions keep today's defaults.
 */
export const buildPlan = (answers: SurveyAnswers): SurveyPlan => ({
  reminderTime:
    answers.reminder && answers.reminder !== "none"
      ? REMINDER_TIMES[answers.reminder]
      : null,
  steps: getSteps(answers),
  tags: answers.influences ?? [],
  tips: getTips(answers),
  isCaring: answers.goals?.includes("stress") ?? false,
});
