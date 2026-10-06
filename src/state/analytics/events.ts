import type { FeedackType, FeedbackSource } from "@/types/Feedback";
import type { LoggerStep } from "@/constants/LoggerSteps";
import type { AppIconId } from "@/constants/AppIcons";
import type { CalendarLayout, SettingsState } from "@/state/settings";
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
  /** `status`: error code of the OS prompt, for example `lockout`. */
  "app:unlock_failed": { status: string };
  /** Flag `app-lock-bypass` opened a locked app. */
  "app:app_lock_bypassed": undefined;

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
    people_count: number;
    emotions_count: number;
    photos_count: number;
    /** Photos by origin. The two counts add up to `photos_count`. */
    photos_day_count: number;
    photos_library_count: number;
    /** Never the place itself. */
    has_location: boolean;
  };
  "logger:log_deleted": undefined;
  "logger:flow_cancelled": { mode: "create" | "edit" };
  "logger:emotions_tooltip_closed": undefined;
  "logger:reminder_enabled": undefined;
  "logger:reminder_postponed": undefined;
  "logger:confirmation_viewed": SavedEntryProperties;
  "logger:store_review_requested": {
    trigger: "entries_7";
    entries_count: number;
  };

  "widget:guide_opened": undefined;
  "widget:guide_step_viewed": { step: number };
  "widget:guide_dismissed": { step: number };
  "widget:guide_completed": undefined;

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
  /** `source`: the permission card or the "Show Photos from …" button after "Not Now". */
  "photos:day_access_answered": {
    status: "granted" | "limited" | "denied";
    source: "card" | "button";
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
    source: "calendar" | "timeline" | "map" | "mood_peaks" | "tag_peaks";
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
    people_count: number;
  };
  "calendar:filters_reset": undefined;
  "calendar:filters_closed": undefined;
  "calendar:layout_changed": { layout: CalendarLayout };
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
    people_distribution_show?: boolean;
    people_distribution_count?: number;
    people_peaks_show?: boolean;
    people_peaks_count?: number;
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

  "people:person_added": { source: "manual"; has_avatar: boolean };
  "people:contacts_imported": {
    count: number;
    avatars_count: number;
    is_limited: boolean;
  };
  "people:person_updated": {
    name_changed: boolean;
    avatar_changed: boolean;
    is_archived: boolean;
  };
  "people:delete_requested": { entries_count: number };
  "people:person_deleted": { entries_count: number };
  "people:delete_cancelled": undefined;

  "settings:rate_app_tapped": undefined;
  "settings:vote_features_tapped": undefined;
  "settings:changelog_tapped": undefined;
  "settings:scale_changed": { scale_type: SettingsState["scaleType"] };
  "settings:step_toggled": { step: LoggerStep; enabled: boolean };
  "settings:location_toggled": { enabled: boolean };
  "settings:privacy_policy_opened": undefined;
  "settings:analytics_toggled": { enabled: boolean };
  "settings:app_lock_toggled": { enabled: boolean };
  "settings:app_icon_changed": { icon: AppIconId };
  "settings:theme_changed": { color_scheme: SettingsState["colorScheme"] };

  "reminders:reminder_toggled": {
    enabled: boolean;
    permission_granted: boolean;
  };
  "reminders:time_changed": { time: string };
  "reminders:notification_opened": {
    /** App launched from the tap, not resumed from background. */
    cold_start: boolean;
    /** Minutes from delivery to tap. */
    minutes_since_delivered: number;
  };

  "data:export_started": { format: "json" | "csv" };
  "data:export_completed": { format: "json" | "csv" };
  "data:export_failed": { format: "json" | "csv" };
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

  "interventions:card_shown": {
    surface: InterventionSurface;
    cluster: InterventionCluster;
    matched_emotions: string[];
    options_shown: string[];
    completed_today_count: number;
  };
  "interventions:option_selected": InterventionSessionProperties & {
    cluster: InterventionCluster;
    length: InterventionLength;
    surface: InterventionSurface;
    option_position: number;
    /** Already completed today. */
    repeat_today: boolean;
  };
  "interventions:intro_viewed": InterventionSessionProperties;
  "interventions:flow_started": InterventionSessionProperties & {
    intro_ms: number;
    step_count: number;
  };
  "interventions:step_viewed": InterventionSessionProperties & {
    step_index: number;
    step_count: number;
    step_type: InterventionStepType;
  };
  "interventions:step_back": InterventionSessionProperties & {
    from_step: number;
  };
  "interventions:flow_paused": InterventionSessionProperties & {
    step_index: number;
  };
  "interventions:flow_resumed": InterventionSessionProperties & {
    step_index: number;
  };
  "interventions:flow_abandoned": InterventionSessionProperties & {
    how: "close" | "end_early";
    /** Step index, or `intro` when closed before starting. */
    last_step: number | "intro";
    total_ms: number;
    pauses: number;
  };
  "interventions:flow_completed": InterventionSessionProperties & {
    length: InterventionLength;
    surface: InterventionSurface;
    total_ms: number;
    expected_ms: number;
    pauses: number;
  };
  "interventions:feedback_answered": InterventionSessionProperties & {
    answer: InterventionFeedback;
  };
  "interventions:feedback_skipped": InterventionSessionProperties;
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
  people_count: number;
  archived_people_count: number;
  reminder_enabled: boolean;
  reminder_hour: number | null;
  scale_type: SettingsState["scaleType"];
  steps: SettingsState["steps"];
  onboarding_done: boolean;
  questions_answered_count: number;
  /** Value of the `photos` feature flag on this install. */
  photos_enabled: boolean;
  /** Share of entries in the last 30 days with at least 1 photo, 0 to 100. */
  photos_pct_30d: number | null;
  /** Photos on all entries. */
  photos_count: number;
  /** Share of stored photos with `source: "day"`, 0 to 100. */
  photos_day_pct: number | null;
  /** Photo library read access. `unavailable`: Android, or photos off. */
  photo_library_access:
    | "undetermined"
    | "granted"
    | "limited"
    | "denied"
    | "unavailable";
};

/** Usage summary fields written once, on the first send. */
// oxlint-disable-next-line typescript/consistent-type-definitions -- PostHog takes index-signature objects; interfaces have no index signature.
export type UsageSummaryOnce = {
  first_app_version: string;
};

type LogItem = z.infer<typeof LogItemSchema>;

/** Where an intervention card shows. */
export type InterventionSurface = "confirmation" | "calendar";

/** Emotion group that picks the suggested interventions. */
export type InterventionCluster = "anxiety";

/** Quick: 1-2 min, medium: 3-5 min, long: 6-10 min. */
export type InterventionLength = "quick" | "medium" | "long";

/** Step screen kind: breathing circle, thinking prompt, or timed text. */
export type InterventionStepType = "breath" | "prompt" | "timed";

/** Joins all events of one intervention run. */
export interface InterventionSessionProperties {
  intervention_session_id: string;
  intervention_id: string;
}

/** Answer to "How do you feel compared to before?" after a flow. */
export type InterventionFeedback = "worse" | "same" | "better";

/**
 * Saved entry metadata sent with the confirmation events. Holds no free
 * text: notes and tag names are sent as counts only.
 */
export interface SavedEntryProperties {
  rating: LogItem["rating"];
  emotions: LogItem["emotions"];
  emotions_count: number;
  tags_count: number;
  people_count: number;
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
