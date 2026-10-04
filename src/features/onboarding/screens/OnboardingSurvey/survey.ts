/**
 * Onboarding survey: six questions in three sections. Answers set up the app
 * (reminder, check-in steps, tags) and pick feature tips, see `plan.ts`.
 *
 * Labels are translation keys: `onboarding_survey_<question>_title`,
 * `onboarding_survey_<question>_<value>`. Values are fixed and safe to send
 * to analytics.
 */

/** Survey section; one segment of the progress bar. */
export type SurveySection = "about" | "rhythm" | "matters";

/** Experience with mood tracking. */
export type Experience = "first" | "pixy" | "other_app" | "journal";
/** Why the user is here. Multi choice. */
export type Goal =
  | "understand"
  | "patterns"
  | "stress"
  | "habit"
  | "therapy"
  | "curious";
/** How often the user wants to check in. */
export type Frequency = "daily" | "several" | "moments" | "unsure";
/** Reminder slot, or no reminder. */
export type ReminderSlot = "morning" | "midday" | "evening" | "none";
/** Time per check-in; decides the logger steps. */
export type Depth = "quick" | "minute" | "write";
/** What affects the mood most. Multi choice; each becomes a tag. */
export type Influence =
  | "sleep"
  | "work"
  | "school"
  | "friends"
  | "family"
  | "partner"
  | "exercise"
  | "food"
  | "weather"
  | "health"
  | "screen"
  | "hobbies";

/** Survey answers. A skipped question is `undefined`. */
export interface SurveyAnswers {
  experience?: Experience;
  goals?: Goal[];
  frequency?: Frequency;
  reminder?: ReminderSlot;
  depth?: Depth;
  influences?: Influence[];
}

/** Key of one survey question. */
export type SurveyQuestionId = keyof SurveyAnswers;

/** One answer option. Label key: `onboarding_survey_<question>_<value>`. */
export interface SurveyOption {
  value: string;
  emoji: string;
  /** Pixy's reply after a single-choice pick: `onboarding_survey_react_<question>_<value>`. */
  hasReaction?: boolean;
}

/** One survey question. */
export interface SurveyQuestion {
  id: SurveyQuestionId;
  section: SurveySection;
  type: "single" | "multi";
  /** Chips wrap many short options; list shows one card per option. */
  layout: "list" | "chips";
  hasSubtitle?: boolean;
  /** Options with a second line: `onboarding_survey_<question>_<value>_hint`. */
  hasHints?: boolean;
  options: SurveyOption[];
}

/** Daily reminder time per slot (`HH:mm`). */
export const REMINDER_TIMES: Record<Exclude<ReminderSlot, "none">, string> = {
  morning: "08:00",
  midday: "12:30",
  evening: "20:00",
};

/** Reminder time (`HH:mm`) for an option value; `undefined` for "none". */
export const getReminderTime = (value: string) =>
  Object.entries(REMINDER_TIMES).find(([slot]) => slot === value)?.[1];

/** Emoji per influence, shared by the question and the created tags. */
export const INFLUENCE_EMOJI: Record<Influence, string> = {
  sleep: "😴",
  work: "💼",
  school: "🎒",
  friends: "🫂",
  family: "🏡",
  partner: "❤️",
  exercise: "🏃",
  food: "🥗",
  weather: "🌦️",
  health: "🩹",
  screen: "📱",
  hobbies: "🎨",
};

/** Survey questions in order. */
export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: "experience",
    section: "about",
    type: "single",
    layout: "list",
    options: [
      { value: "first", emoji: "🌱", hasReaction: true },
      { value: "pixy", emoji: "🔁", hasReaction: true },
      { value: "other_app", emoji: "📱", hasReaction: true },
      { value: "journal", emoji: "📓", hasReaction: true },
    ],
  },
  {
    id: "goals",
    section: "about",
    type: "multi",
    layout: "list",
    hasSubtitle: true,
    options: [
      { value: "understand", emoji: "🔍" },
      { value: "patterns", emoji: "📈" },
      { value: "stress", emoji: "🌊" },
      { value: "habit", emoji: "🗓️" },
      { value: "therapy", emoji: "🩺" },
      { value: "curious", emoji: "✨" },
    ],
  },
  {
    id: "frequency",
    section: "rhythm",
    type: "single",
    layout: "list",
    options: [
      { value: "daily", emoji: "☀️", hasReaction: true },
      { value: "several", emoji: "🔂", hasReaction: true },
      { value: "moments", emoji: "⚡", hasReaction: true },
      { value: "unsure", emoji: "🤷", hasReaction: true },
    ],
  },
  {
    id: "reminder",
    section: "rhythm",
    type: "single",
    layout: "list",
    hasSubtitle: true,
    options: [
      { value: "morning", emoji: "🌅", hasReaction: true },
      { value: "midday", emoji: "🌤️", hasReaction: true },
      { value: "evening", emoji: "🌙", hasReaction: true },
      { value: "none", emoji: "🔕", hasReaction: true },
    ],
  },
  {
    id: "depth",
    section: "rhythm",
    type: "single",
    layout: "list",
    hasHints: true,
    options: [
      { value: "quick", emoji: "⏱️", hasReaction: true },
      { value: "minute", emoji: "☕", hasReaction: true },
      { value: "write", emoji: "✍️", hasReaction: true },
    ],
  },
  {
    id: "influences",
    section: "matters",
    type: "multi",
    layout: "chips",
    hasSubtitle: true,
    options: Object.entries(INFLUENCE_EMOJI).map(([value, emoji]) => ({
      value,
      emoji,
    })),
  },
];

/** Sections in order, for the progress bar. */
export const SURVEY_SECTIONS: SurveySection[] = ["about", "rhythm", "matters"];

/**
 * Progress per section, 0 to 1, after `answeredCount` questions (answered or
 * skipped).
 */
export const getSectionProgress = (answeredCount: number) =>
  SURVEY_SECTIONS.map((section) => {
    const questions = SURVEY_QUESTIONS.filter((q) => q.section === section);
    const done = questions.filter(
      (q) => SURVEY_QUESTIONS.indexOf(q) < answeredCount
    ).length;
    return { key: section, progress: done / questions.length };
  });
