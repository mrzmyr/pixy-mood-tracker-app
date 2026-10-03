import type { FeedackType, FeedbackSource } from "@/types/Feedback";
import type { LoggerStep } from "@/constants/LoggerSteps";
import type { SettingsState } from "@/state/settings";
import type { z } from "zod";
import type { LogItemSchema, PhotoSourceKind } from "@/types";

/**
 * Every analytics event the app sends, keyed by name, with its properties.
 *
 * - Name: `<area>:<object>_<verb>`, verb in past tense
 * - Properties: snake_case, JSON values only
 * - Never send free text (notes, custom tag names). Send counts and lengths
 *   instead. Fixed values (rating, emotion keys, sleep quality) are fine.
 * - Photo events never carry file names, URIs, dimensions, EXIF, location,
 *   photo timestamps, or library ids.
 * - `undefined`: the event has no properties
 */
export interface AnalyticsEvents {
  "app:logs_loaded": { size_mb: number };
  "app:storage_load_failed": { status: string | number };
  "app:storage_recovery_tapped": { action: "export" | "contact" };

  "onboarding:slide_viewed": { index: number };
  "onboarding:reminder_enabled": undefined;
  "onboarding:reminder_postponed": undefined;
  "onboarding:flow_completed": undefined;
  "onboarding:flow_skipped": { index: number };

  "logger:flow_started": { mode: "create" | "edit"; steps_count: number };
  "logger:step_viewed": {
    mode: "create" | "edit";
    step: LoggerStep;
    index: number;
    steps_count: number;
  };
  "logger:step_disabled": { step: LoggerStep };
  "logger:log_saved": {
    mode: "create" | "edit";
    duration_ms: number;
    has_rating: boolean;
    message_length: number;
    tags_count: number;
    emotions_count: number;
  };
  "logger:log_deleted": undefined;
  "logger:flow_cancelled": { mode: "create" | "edit" };
  "logger:emotions_tooltip_closed": undefined;
  "logger:reminder_enabled": undefined;
  "logger:reminder_postponed": undefined;
  "logger:confirmation_viewed": SavedEntryProperties;
  "logger:confirmation_answered": SavedEntryProperties & {
    answer: ConfirmationAnswer;
    answer_ms: number;
  };
  "logger:confirmation_skipped": SavedEntryProperties & { skip_ms: number };
  "logger:store_review_requested": {
    trigger: "entries_7";
    entries_count: number;
  };

  "day:add_tapped": undefined;
  "day:edit_tapped": undefined;
  "day:delete_tapped": undefined;
  "day:closed": undefined;

  /** `entry_days_ago`: 0 for today, like `calendar:day_opened.days_ago`. */
  "photos:day_access_prompt_shown": {
    mode: "create" | "edit";
    entry_days_ago: number;
  };
  "photos:day_access_prompt_dismissed": { mode: "create" | "edit" };
  /** `source`: the permission row or the "Show Photos from …" button after "Not Now". */
  "photos:day_access_answered": {
    status: "granted" | "limited" | "denied";
    source: "row" | "button";
  };
  /** `count`: library photos of the entry's day, 0 to 20. */
  "photos:day_photos_loaded": {
    count: number;
    access: "granted" | "limited";
    entry_days_ago: number;
  };
  /** `remaining`: photos the entry can still take. */
  "photos:picker_opened": {
    remaining: number;
  };
  "photos:picker_closed": {
    picked_count: number;
    is_cancelled: boolean;
  };
  /**
   * `count`: photos attached to the entry after the change, imports still
   * running included.
   */
  "photos:photo_added": {
    source: PhotoSourceKind;
    count: number;
    mode: "create" | "edit";
  };
  "photos:photo_removed": {
    source: PhotoSourceKind;
    count: number;
    mode: "create" | "edit";
  };
  "photos:limit_reached": { mode: "create" | "edit" };
  /** `status`: structured error status, for example `photo_import_failed`. */
  "photos:import_failed": { source: PhotoSourceKind; status: string };
  /** `viewed_count`: distinct photos shown before close. */
  "photos:viewer_closed": {
    context: "logger" | "day";
    photos_count: number;
    viewed_count: number;
  };

  "calendar:day_opened": {
    source: "calendar" | "mood_peaks" | "tag_peaks";
    entries_count: number;
    days_ago: number;
  };
  "calendar:add_today_tapped": { has_entries: boolean };
  "calendar:today_tapped": undefined;
  "calendar:filters_opened": undefined;
  "calendar:filters_applied": {
    text_length: number;
    ratings_count: number;
    tags_count: number;
  };
  "calendar:filters_reset": undefined;
  "calendar:filters_closed": undefined;
  "calendar:promo_tapped": { card: "changelog" };

  "statistics:highlights_viewed": {
    items_count: number;
    mood_avg_show: boolean;
    mood_peaks_positive_show: boolean;
    mood_peaks_positive_count?: number;
    mood_peaks_negative_show: boolean;
    mood_peaks_negative_count?: number;
    tags_peaks_show: boolean;
    tags_peaks_count?: number;
    tags_distribution_show: boolean;
    tags_distribution_tag_count?: number;
    tags_distribution_item_count?: number;
    mood_chart_show: boolean;
    mood_chart_item_count?: number;
    emotions_distribution_show?: boolean;
    emotions_distribution_item_count?: number;
    sleep_quality_distribution_show?: boolean;
  };
  "statistics:all_highlights_viewed": AnalyticsEvents["statistics:highlights_viewed"];
  "statistics:card_shared": { card: string };

  "tags:tag_created": {
    title_length: number;
    color: string;
    has_emoji: boolean;
  };
  "tags:tag_updated": {
    title_length: number;
    color: string;
    has_emoji: boolean;
    is_archived: boolean;
  };
  "tags:delete_requested": AnalyticsEvents["tags:tag_created"];
  "tags:tag_deleted": AnalyticsEvents["tags:tag_created"];
  "tags:delete_cancelled": undefined;

  "settings:rate_app_tapped": undefined;
  "settings:vote_features_tapped": undefined;
  "settings:changelog_tapped": undefined;
  "settings:scale_changed": { scale_type: SettingsState["scaleType"] };
  "settings:step_toggled": { step: LoggerStep; enabled: boolean };
  "settings:privacy_policy_opened": undefined;
  "settings:analytics_toggled": { enabled: boolean };

  "reminders:reminder_toggled": {
    enabled: boolean;
    permission_granted: boolean;
  };
  "reminders:time_changed": { time: string };

  "data:export_started": undefined;
  "data:export_completed": undefined;
  "data:export_failed": undefined;
  "data:import_started": undefined;
  "data:import_completed": undefined;
  "data:import_failed": {
    reason: "invalid_json_schema" | "document_picker_error";
  };
  "data:reset_requested": { kind: ResetKind };
  "data:reset_completed": { kind: ResetKind };
  "data:reset_cancelled": { kind: ResetKind };

  "feedback:modal_opened": { type: FeedackType };
  "feedback:feedback_submitted": {
    type: FeedackType;
    source: FeedbackSource;
    message_length: number;
    has_email: boolean;
  };
  "feedback:submit_failed": { http_status: number | null };
  "feedback:modal_closed": undefined;
  "feedback:question_answered": { question_id: string; answer_ids: string[] };
}

/** Name of any event in {@link AnalyticsEvents}. */
export type AnalyticsEvent = keyof AnalyticsEvents;

/** `track(event)` for events without properties, else `track(event, properties)`. */
export type TrackArgs<Event extends AnalyticsEvent> =
  AnalyticsEvents[Event] extends undefined
    ? [event: Event]
    : [event: Event, properties: AnalyticsEvents[Event]];

/** `data` (entries and tags only) was last sent before the merged "Delete all my data" item. */
type ResetKind = "factory";

/**
 * Usage summary: anonymous usage counts of one install.
 *
 * Counts, shares, and booleans only. Never entry content (rating, emotions,
 * text) or tag titles.
 */
// oxlint-disable-next-line typescript/consistent-type-definitions -- PostHog takes index-signature objects; interfaces have no index signature.
export type UsageSummary = {
  entries_count: number;
  entries_30d: number;
  logged_days_7d: number;
  logged_days_30d: number;
  days_since_first_entry: number | null;
  days_since_last_entry: number | null;
  current_streak: number;
  longest_streak: number;
  /** Share of entries in the last 30 days with a note, 0 to 100. */
  notes_pct_30d: number | null;
  tags_pct_30d: number | null;
  emotions_pct_30d: number | null;
  statistics_unlocked: boolean;
  tags_count: number;
  archived_tags_count: number;
  reminder_enabled: boolean;
  reminder_hour: number | null;
  scale_type: SettingsState["scaleType"];
  steps: SettingsState["steps"];
  onboarding_done: boolean;
  questions_answered_count: number;
};

/** Usage summary fields written once, on the first send. */
// oxlint-disable-next-line typescript/consistent-type-definitions -- PostHog takes index-signature objects; interfaces have no index signature.
export type UsageSummaryOnce = {
  first_app_version: string;
};

type LogItem = z.infer<typeof LogItemSchema>;

/** Answer to "How are you feeling now?" after saving a new entry. */
export type ConfirmationAnswer = "worse" | "same" | "better";

/**
 * Saved entry metadata sent with the confirmation events. Holds no free
 * text: notes and tag names are sent as counts only.
 */
export interface SavedEntryProperties {
  rating: LogItem["rating"];
  emotions: LogItem["emotions"];
  emotions_count: number;
  tags_count: number;
  message_length: number;
  /** Whitespace-separated words; Chinese, Japanese, and Thai notes count as 1. */
  message_word_count: number;
  sleep_quality: LogItem["sleep"]["quality"] | null;
  /** All entries, including the saved one. */
  entries_count: number;
}

/** Properties of the statistics highlight events: shown cards and item counts. */
export type HighlightsProperties =
  AnalyticsEvents["statistics:highlights_viewed"];
