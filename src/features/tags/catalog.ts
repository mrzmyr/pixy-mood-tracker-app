import type { TAG_COLOR_NAMES } from "@/constants/config";
import { tDynamic } from "@/lib/translation";

/**
 * What a tag usually means for how someone feels. A prior only: recaps let
 * the user's own mood data decide, the same rule as for people.
 */
export type TagPolarity = "helps" | "hurts" | "mixed";

/**
 * Fixed meaning of a catalog category. Recaps and analytics read this key,
 * never the title, which the user can rename.
 */
export type TagCategoryKind =
  | "triggers"
  | "calm"
  | "small_wins"
  | "focus"
  | "medication"
  | "evening"
  | "connection"
  | "work"
  | "remembering"
  | "body"
  | "food_drink"
  | "movement"
  | "screens";

/** Tag the catalog can suggest. */
export interface CatalogTag {
  /** Stable key; the title comes from `tag_catalog_<key>`. */
  key: string;
  emoji: string;
  polarity: TagPolarity;
}

/** Category the catalog can suggest, with its tags. */
export interface CatalogCategory {
  kind: TagCategoryKind;
  color: (typeof TAG_COLOR_NAMES)[number];
  /** Most useful first: onboarding suggests the first few. */
  tags: CatalogTag[];
}

const tag = (
  key: string,
  emoji: string,
  polarity: TagPolarity
): CatalogTag => ({
  key,
  emoji,
  polarity,
});

/**
 * Tag categories Pixy can suggest. Concepts with their own check-in step
 * (emotions, people, places, sleep quality, photos) stay out of tags.
 */
export const TAG_CATALOG: CatalogCategory[] = [
  {
    kind: "triggers",
    color: "red",
    tags: [
      tag("deadline", "⏰", "hurts"),
      tag("conflict", "⚡", "hurts"),
      tag("overloaded", "📋", "hurts"),
      tag("bad_news", "📰", "hurts"),
      tag("money_worries", "💸", "hurts"),
      tag("running_late", "⏱️", "hurts"),
      tag("crowds", "👥", "hurts"),
      tag("health_worries", "🩺", "hurts"),
    ],
  },
  {
    kind: "calm",
    color: "teal",
    tags: [
      tag("breathing", "🌬️", "helps"),
      tag("time_outside", "☀️", "helps"),
      tag("music", "🎧", "helps"),
      tag("journaling", "✍️", "helps"),
      tag("quiet_time", "🕯️", "helps"),
      tag("stretching", "🤸", "helps"),
      tag("warm_drink", "🍵", "helps"),
      tag("hug", "🤗", "helps"),
    ],
  },
  {
    kind: "small_wins",
    color: "amber",
    tags: [
      tag("got_outside", "🚪", "helps"),
      tag("showered", "🚿", "helps"),
      tag("real_meal", "🍲", "helps"),
      tag("talked_to_someone", "💬", "helps"),
      tag("got_up_on_time", "🌅", "helps"),
      tag("tidied_up", "🧺", "helps"),
      tag("did_something_fun", "🎈", "helps"),
      tag("asked_for_help", "🙋", "helps"),
    ],
  },
  {
    kind: "focus",
    color: "violet",
    tags: [
      tag("hyperfocus", "🎯", "mixed"),
      tag("scattered", "🌀", "hurts"),
      tag("procrastinated", "⏳", "hurts"),
      tag("finished_task", "✅", "helps"),
      tag("forgot_something", "🧠", "hurts"),
      tag("lost_track_of_time", "⌛", "hurts"),
      tag("overstimulated", "🔊", "hurts"),
      tag("followed_routine", "🗓️", "helps"),
    ],
  },
  {
    kind: "medication",
    color: "blue",
    tags: [
      tag("took_meds", "💊", "helps"),
      tag("missed_meds", "⏭️", "hurts"),
      tag("side_effects", "⚠️", "hurts"),
      tag("therapy_session", "🛋️", "mixed"),
      tag("doctor_visit", "🏥", "mixed"),
    ],
  },
  {
    kind: "evening",
    color: "indigo",
    tags: [
      tag("screens_in_bed", "📱", "hurts"),
      tag("late_caffeine", "🥤", "hurts"),
      tag("wind_down", "🛁", "helps"),
      tag("napped", "😴", "mixed"),
      tag("woke_at_night", "🌙", "hurts"),
      tag("late_meal", "🍝", "hurts"),
      tag("same_bedtime", "🕙", "helps"),
    ],
  },
  {
    kind: "connection",
    color: "pink",
    tags: [
      tag("called_someone", "📞", "helps"),
      tag("met_up", "🫶", "helps"),
      tag("deep_talk", "🗣️", "helps"),
      tag("felt_left_out", "🫥", "hurts"),
      tag("argument", "💢", "hurts"),
      tag("alone_time", "🪴", "mixed"),
      tag("made_plans", "📅", "helps"),
      tag("helped_someone", "🤲", "helps"),
    ],
  },
  {
    kind: "work",
    color: "slate",
    tags: [
      tag("overtime", "🕰️", "hurts"),
      tag("meetings", "📊", "mixed"),
      tag("deep_work", "🧑‍💻", "helps"),
      tag("said_no", "🛑", "helps"),
      tag("lunch_break", "🥪", "helps"),
      tag("hard_feedback", "📝", "hurts"),
      tag("got_praise", "🌟", "helps"),
      tag("commute", "🚆", "mixed"),
      tag("exam", "🎓", "mixed"),
    ],
  },
  {
    kind: "remembering",
    color: "purple",
    tags: [
      tag("missed_someone", "🕊️", "mixed"),
      tag("shared_memories", "📷", "mixed"),
      tag("hard_reminder", "🌧️", "hurts"),
      tag("felt_supported", "🫂", "helps"),
      tag("let_myself_cry", "😢", "mixed"),
      tag("anniversary", "🎗️", "mixed"),
    ],
  },
  {
    kind: "body",
    color: "rose",
    tags: [
      tag("headache", "🤕", "hurts"),
      tag("pain", "🩹", "hurts"),
      tag("fatigue", "🔋", "hurts"),
      tag("brain_fog", "🌫️", "hurts"),
      tag("nausea", "🤢", "hurts"),
      tag("feeling_sick", "🤒", "hurts"),
      tag("restless", "🦵", "hurts"),
      tag("felt_strong", "💪", "helps"),
    ],
  },
  {
    kind: "food_drink",
    color: "lime",
    tags: [
      tag("drank_water", "💧", "helps"),
      tag("coffee", "☕", "mixed"),
      tag("alcohol", "🍷", "mixed"),
      tag("skipped_meal", "🍽️", "hurts"),
      tag("home_cooked", "🍳", "helps"),
      tag("sweets", "🍫", "mixed"),
      tag("fast_food", "🍔", "mixed"),
      tag("fruit_veg", "🥦", "helps"),
    ],
  },
  {
    kind: "movement",
    color: "green",
    tags: [
      tag("walk", "🚶", "helps"),
      tag("gym", "🏋️", "helps"),
      tag("yoga", "🧘", "helps"),
      tag("run", "🏃", "helps"),
      tag("cycling", "🚴", "helps"),
      tag("swimming", "🏊", "helps"),
      tag("dancing", "💃", "helps"),
      tag("team_sport", "⚽", "helps"),
    ],
  },
  {
    kind: "screens",
    color: "sky",
    tags: [
      tag("doomscrolling", "📉", "hurts"),
      tag("phone_free", "📵", "helps"),
      tag("too_much_news", "🗞️", "hurts"),
      tag("lots_of_screen_time", "🖥️", "hurts"),
      tag("video_calls", "💻", "mixed"),
      tag("gaming_with_friends", "🕹️", "mixed"),
    ],
  },
];

/** Catalog entry for `kind`; undefined only for kinds a newer version added. */
export const getCatalogCategory = (kind: TagCategoryKind) =>
  TAG_CATALOG.find((category) => category.kind === kind);

/** Localized category title, as stored on a new category. */
export const getCatalogCategoryTitle = (kind: TagCategoryKind) =>
  tDynamic(`tag_catalog_category_${kind}`);

/** Localized tag title with its emoji, the same shape as default tags. */
export const getCatalogTagTitle = (catalogTag: CatalogTag) =>
  `${tDynamic(`tag_catalog_${catalogTag.key}`)} ${catalogTag.emoji}`;
