# Telemetry

Pixy sends anonymous usage events to PostHog. This file lists what is sent, what is never sent, and how to switch it off.

## What is sent

| Data | Sent | Details |
| --- | --- | --- |
| Feature usage events | Yes | For example `logger:log_saved`, `calendar:filters_opened`. Catalog: [`events.ts`](src/state/analytics/events.ts). `track()` accepts only events from this file |
| Usage summary | Yes | Counts, shares, and booleans ([product-analytics.md](docs/product-analytics.md)) |
| Screen views | Yes | Route name only |
| Settings on every event | Yes | `scale_type`, `reminder_enabled`, `steps` |
| Install id | Yes | Random. New id after "Delete all my data" |
| Entry content | Never | Photos, photo metadata, coordinates, place names |
| Health values | Never | Rating, emotion keys, sleep quality, Apple Health data, intervention cluster and feedback answer, mood-derived counts. Sent as `has_*` booleans and counts only |
| Free text | Never | Notes, tag names, people names, filter text, feedback messages. Sent as counts and lengths only |
| Identity | Never | No account, no `identify()`. The install stays anonymous |

## Consent and opt out

- Default off in the EU, EEA, UK, Switzerland, and when the region is unknown. Default on elsewhere ([`consent.ts`](src/state/analytics/consent.ts))
- Off switch: Settings > Privacy > Behavioral Data
- Off means no PostHog requests at all (no events, flags, or remote config) and no startup metrics. The PostHog client starts disabled until onboarding is done (privacy slide included) and consent is on. `onboarding:*` events are therefore not sent ([`consent-posthog-provider.tsx`](src/shell/consent-posthog-provider.tsx))
- "Delete all my data" restores the regional default and clears `analyticsConsentAt`
- Each choice stores its time in `analyticsConsentAt`. Backups never carry the switch or the time; import keeps the values of this device
- Crash reports go to Sentry. The Behavioral Data switch does not cover them
  - Sentry gets: error status, message, fix, stack trace, device and OS model, app version, breadcrumbs other than console
  - Removed before send ([`sentry-scrub.ts`](src/lib/sentry-scrub.ts)): error `why`, user and install id, console breadcrumbs, URL query strings and fragments
  - Scrub covers JavaScript errors. Native crashes use the native Sentry SDK defaults

## Developer reference

- Event catalog: [`src/state/analytics/events.ts`](src/state/analytics/events.ts)
- Usage summary and behaviour signals: [product-analytics.md](docs/product-analytics.md)
- Screens: `$screen` with the route name, from [`src/shell/screen-tracking.ts`](src/shell/screen-tracking.ts)
- Super properties on every event: `scale_type`, `reminder_enabled`, `steps` ([`src/state/analytics/index.tsx`](src/state/analytics/index.tsx))
- Privacy rule: [AGENTS.md footguns](AGENTS.md#footguns)
- Feedback and question answers to pixy.day carry a separate random `feedbackId`, never the analytics install id. JSON key stays `deviceId` for the server. Backups never carry it. "Delete all my data" renews it ([`src/state/settings/index.tsx`](src/state/settings/index.tsx))
- Default: off in consent regions and when region is unknown; on elsewhere. Factory reset restores the device-region default ([`src/state/analytics/consent.ts`](src/state/analytics/consent.ts))
- Onboarding skip: consent regions land on the privacy slide before completion.
- Off switch: Settings > Privacy > Behavioral Data
- Feature flags load only with consent ([development.md](docs/development.md#feature-flags))
- People ([spec](docs/specs/people.md#analytics)): `people:person_added`, `people:contacts_imported` (count, avatars count, limited access), `people:person_updated`, `people:delete_requested`, `people:person_deleted`, `people:delete_cancelled`, `people:people_reordered` (`people_count`, `method`: `drag` or `accessibility_action`). Counts and booleans only, never names or photos. `logger:log_saved`, confirmation events, and `calendar:filters_applied` add `people_count`. Usage summary adds `people_count` and `archived_people_count`. Highlights events add `people_distribution_show`, `people_distribution_count`, `people_peaks_show`, `people_peaks_count` while the flag is on
- Location ([development.md](docs/development.md#location)): `settings:location_toggled` (`enabled`). `logger:log_saved` adds `has_location`. Never coordinates or place names
- Calendar layout menu (Calendar, Timeline): `calendar:layout_changed` with `layout`
- Apple Health ([development.md](docs/development.md#apple-health)): `settings:health_sleep_toggled` (`enabled`), `logger:health_sleep_filled` (no properties). Never Apple Health values
- Data exports: `data:export_started`, `data:export_completed`, `data:export_failed` send `format: "json" | "csv"`.
- Store review prompt: `logger:store_review_requested` ([`src/features/review`](src/features/review))
  - Fires when a good moment requests the system prompt. Max 3 per 365 days, 120 days apart, 1 per app version
  - `trigger`: `first` (first prompt, from 7 entries), `later` (later prompt, from 30 entries). Never the mood behind it
  - `entries_count`: all saved entries. Never ratings or averages
  - OS decides whether prompt shows
- Quick check-in ([`src/features/quickcheckin`](src/features/quickcheckin)), flag `quick-check-in`: `quick_check_in:entry_saved` (`source`), `quick_check_in:completed` (`source`, `has_emotion`, `influences_count`), `quick_check_in:setting_changed` (`enabled`), `quick_check_in:schedule_changed` (`every_hours`, `from`, `until` as picked `HH:mm`, `times_count`), `quick_check_in:notification_tapped` (`cold_start`). `source`: `notification` (Android), `app`. Never people or tag names
- Confirmation after a new entry: `logger:confirmation_viewed` ([`src/features/logger/confirmation`](src/features/logger/confirmation))
  - Shown only after create, not edit
  - Entry metadata: `has_rating`, `has_sleep`, counts, `message_word_count`, `entries_count`
- Interventions: `interventions:*` ([`src/features/interventions`](src/features/interventions)), flag `interventions`
  - Card on confirmation and calendar: `card_shown`, then `option_selected` with a new `intervention_session_id`
  - Flow: `intro_viewed`, `flow_started`, `step_viewed`, `step_back`, `flow_paused`, `flow_resumed`, then `flow_completed` or `flow_abandoned` (`how`: `close`, `end_early`)
  - End check: `feedback_answered` or `feedback_skipped`. Never the answer
  - Never the emotion cluster or matched emotions
  - No dismiss control and no cooldown: cards show for every matching entry of today
- Reminder taps: `reminders:notification_opened` ([`src/features/notifications/reminder-taps.ts`](src/features/notifications/reminder-taps.ts))
  - One event per tap on reminder body. Dismisses and other actions not sent
  - Properties: `cold_start`, `minutes_since_delivered`
  - Cold start taps wait for stored settings, so a stored opt-out wins
  - Reminders scheduled before this event match by repeating trigger. New reminders carry `data.kind: "reminder"`
- Tag categories: `tags:category_updated` (`title_length`), `tags:category_deleted` (`tags_count` without archived tags, `categories_count`), `tags:categories_reordered` (`categories_count`, `method`), `tags:tags_arranged` (`tags_count`, `categories_count`, `category_changed`, `method`). `method` is `drag` or `accessibility_action`. Never category or tag names
- Recaps (flag `recaps`): `recaps:card_shown` once per card per screen visit, when half of the card is on screen. `recaps:card_feedback_sent` adds `helpful`, `reasons` (fixed keys), `has_note`; the note itself goes to the feedback service like other feedback, never to analytics. `recaps:nudge_tapped` adds `action` (`turn_on`, `not_now`); Turn On also sends the event of the setting it changes (`settings:step_toggled`, `reminders:reminder_toggled`). All send `card_type`, `family`, `modules`, `signal`, `period`, `source`. Never tag, person, or place names, emotion keys, or ratings from the card. `reminders:recaps_toggled` (`enabled`; `permission_granted` only when turning on) from the Recaps toggle in Settings > Reminder. `recaps:notification_tapped` (`period`: `week`, `month`, `year`) once per tap on a recap notification body
- Recap stories (flag `recaps`): `recaps:story_opened` (`period`: `week` or `month`, `source`: `recaps`, `calendar`, `notification`; `slides_count`), `recaps:story_slide_shown` (`slide_type`, `position`, `slides_count`) once per slide change, `recaps:story_feedback_sent` (`slide_type`, `position`, `helpful`, `reasons` fixed keys, `has_note`; the note goes to the feedback service, never here), `recaps:story_closed` (`position`, `slides_count`, `completed`). `recaps:story_shared` (`has_photos`, `shuffles`, `slide_type`: every slide has Share) after the share sheet finished, never the photos or lines. Slide types only, never tag, person, or place names, counts shown on a slide, or ratings

## Photos

- Events: `photos:*` in [`events.ts`](src/state/analytics/events.ts). Sent through `track()` only, so consent applies
- Never file names, URIs, dimensions, EXIF, location, photo timestamps, or library ids
- `mode`: `create` or `edit`. `entry_days_ago`: 0 for today, like `calendar:day_opened.days_ago`
- Questions: [product-analytics.md](docs/product-analytics.md#photos)

| Event | When | Properties |
| --- | --- | --- |
| `logger:step_viewed` | Photos step shown | `step: "photos"` |
| `photos:day_access_prompt_shown` | Permission card shows, once per step mount | `mode`, `entry_days_ago` |
| `photos:day_access_prompt_dismissed` | Not Now on the card | `mode` |
| `photos:day_access_answered` | System dialog closes | `status`, `source` (`card`, `button`) |
| `photos:day_photos_loaded` | Day query resolves | `count` (0 to 20), `access`, `entry_days_ago` |
| `photos:picker_opened` | Library picker opens | `remaining` |
| `photos:picker_closed` | Library picker returns | `picked_count`, `is_cancelled` |
| `photos:photo_added` | Photo attached: picked in the library picker, or a suggestion tapped. Before its import ends | `source` (`day`, `library`), `count`, `mode` |
| `photos:photo_removed` | Remove button on a tile or in the viewer | `source`, `count`, `mode` |
| `photos:limit_reached` | Unchecked photo or More… tapped at 6 attached | `mode` |
| `photos:import_failed` | Import error | `source`, `status` |
| `photos:viewer_closed` | Viewer closes | `context` (`logger`, `day`), `photos_count`, `viewed_count` |
| `logger:log_saved` | Save | `photos_count`, `photos_day_count`, `photos_library_count` |
| `settings:step_toggled` | Check-in toggle | `step: "photos"` |
| `logger:step_disabled` | "I Don’t Add Photos" | `step: "photos"` |

## Server-side filter

- PostHog transformation "Drop health properties" runs in every app project
- Drops `rating`, `emotions`, `sleep_quality`, `matched_emotions`, `cluster`, `answer_texts`, `answer_ids`, `question_text`, `question`, `mood_peaks_positive_count`, `mood_peaks_negative_count`, `mood_avg_percentage`, `mood_avg_type`, and their flattened keys (`emotions__0`)
- Also drops `quality` on `logger:health_sleep_filled` and `answer` on `interventions:feedback_answered`
- Keeps `rating` on `voice:feedback_submitted`: it rates voice mode, not mood
- Applies to every app version, including old ones

## Event history

Use this section to join old and new events in PostHog, for example with an Action that matches both names.

**Versions**

- Up to `v1.86.0`: old names, properties sent. Every event also had `userId` (device id)
- `v1.86.1` to `v1.88.0`: old names, no properties. `track()` dropped them (fixed in #436)
- First release after `v1.88.0`: new names, snake_case properties, entry content removed (#436, #437)

**Merged events**

- `log_saved`, `log_created`, `log_changed`, `log_saved_without_rating` became one `logger:log_saved`
  - `log_created` = `logger:log_saved` with `mode: "create"`
  - `log_changed` = `logger:log_saved` with `mode: "edit"`
  - `log_saved_without_rating` = `logger:log_saved` with `has_rating: false`

**Added events**

- Photo attachments, first release with photos ([`src/features/photos`](src/features/photos))
  - `photos:day_access_prompt_shown`: `mode`, `entry_days_ago`
  - `photos:day_access_prompt_dismissed`: `mode`
  - `photos:day_access_answered`: `status` (`granted`, `limited`, `denied`), `source` (`card`, `button`)
  - `photos:day_photos_loaded`: `count`, `access` (`granted`, `limited`), `entry_days_ago`
  - `photos:picker_opened`: `remaining`
  - `photos:picker_closed`: `picked_count`, `is_cancelled`
  - `photos:photo_added`, `photos:photo_removed`: `source` (`day`, `library`), `count` (attached after the change), `mode`
  - `photos:limit_reached`: `mode`
  - `photos:import_failed`: `source`, `status`
  - `photos:viewer_closed`: `context` (`logger`, `day`), `photos_count`, `viewed_count`
  - `logger:log_saved`: new `photos_count`, `photos_day_count`, `photos_library_count`
  - Counts and enums only. Never file names, URIs, dimensions, EXIF, location, photo timestamps, or library ids
- Never shipped in a release, replaced before the first photos release: `logger:library_permission_answered` (now `photos:day_access_answered`), `logger:photo_added` (now `photos:photo_added`), `logger:photo_removed` (now `photos:photo_removed`), `photos:photo_selected` (now `photos:photo_added`), `photos:photo_deselected` (now `photos:photo_removed`), `logger:photo_limit_reached` (now `photos:limit_reached`), `logger:camera_permission_denied` (dropped: no camera), `day:photo_opened` (now `photos:viewer_closed` with `context: "day"`)

**Changed meaning**

- `data_import_success` fired twice per import: once when a file was picked, once after the import. `data:import_completed` fires only after the import
- `data:reset_*`: Settings > Data has one "Delete all my data" item since the first release after `v1.88.0`. It sends only `kind: "factory"`. `kind: "data"` (entries and tags only) is no longer sent
- `calendar:layout_changed` `layout` and `calendar:day_opened` `source`: value `map` no longer sent after `v1.102.0`. Calendar map layout (flag `calendar-map`) removed
- `recaps:card_shown`, `recaps:card_feedback_sent`, `recaps:nudge_tapped`: `period` no longer sends `quarter`. Recaps lost the quarter period. Only `week`, `month`, `year` remain
- `recaps:*` `card_type`: `person-back`, `person-new`, `person-milestone` merged into `people-moments` (one card per period, all people in it). Old values no longer sent
- `recaps:*` `card_type`: `places-trips` renamed to `places`. The card now also lists home areas and nearby towns and runs in week recaps
- `recaps:*` `card_type`: `intro-categories` no longer sent. The "Group your tags" nudge card was removed with category creation
- `recaps:story_*` `slide_type`: `lifted` renamed to `positive-tags`. New `negative-tags`. No longer sent: `best-day`, `week-mood`, `top-emotions`, `close-by`, `far-out`, `weekday-habit`, `made-of`, `people`, `hard-pattern`, `first-city`, `vs-last`, `moments`, `came-back`, `quiz`. Stories keep intro, cover, positive and negative tags, orbit, coming up, share

**Removed events**

- `logger:log_deleted`: the logger lost its trash button. Entries are deleted from the day view entry menu, which sends `day:delete_tapped`
- `log_emotions_tooltip_close`, `logger:emotions_tooltip_closed`: emotion description tooltip removed from the logger. No replacement
- `logger:confirmation_answered`, `logger:confirmation_skipped`: the "How are you feeling now?" question left the confirmation. `logger:confirmation_viewed` stays
- `widget:guide_opened`, `widget:guide_step_viewed`, `widget:guide_dismissed`, `widget:guide_completed`: widget guide and Settings > Widgets removed. No replacement
- `tags:category_created`: users can no longer create tag categories. Existing categories stay; rename, delete, and reorder still send their events. No replacement
- `recaps:story_quiz_answered`: quiz slide removed from recap stories. No replacement

**Changed properties** (first release after `v1.104.0`)

- `logger:confirmation_viewed`: `rating`, `emotions`, `sleep_quality`. New: `has_rating`, `has_sleep`
- `logger:health_sleep_filled`: `quality`, `has_bedtime`, `has_interruptions`. No properties left
- `quick_check_in:entry_saved`: `rating`
- `interventions:card_shown`: `cluster`, `matched_emotions`
- `interventions:option_selected`: `cluster`
- `interventions:feedback_answered`: `answer`
- `statistics:highlights_viewed`, `statistics:all_highlights_viewed`: `mood_peaks_positive_count`, `mood_peaks_negative_count`
- `logger:store_review_requested` `trigger`: `entries_7` became `first`, `good_entry_30` became `later`

**Removed properties** (never sent under the new names)

- All events: `userId`
- `log_*`: `rating`, `emotions`, `date`, `dateTime`
- `calendar_filters_filtered`: `ratings`
- `statistics_relevant_highlights`, `statistics_all_highlights`: `mood_avg_type`, `mood_avg_percentage`
- `feedback_send`: `message`, `email`, `deviceId`, `locale`, `version`, `os`, `date`, `environment`
- `questioner_submit`: `question_text`, `answer_texts`, `question`, `deviceId`, `language`, `locale`, `version`, `os`, `date`
- `loaded_logs`: `unit` (always `mb`)

**New events**

- `reminders:notification_opened`: added after `v1.88.0`. No older event. Earlier reminder taps sent nothing
- `interventions:*`: added with the `interventions` flag

**Removed events**

- Statistics card feedback and its App Store review prompt removed in first release after `v1.88.0`. Last sent in `v1.88.0`. No replacement
  - `statistics_feedback`
  - `statistics_feedback_store_review_request`
  - `statistics_feedback_store_review_done`
  - `statistics_feedback_store_review_error`
- New names never shipped in a release: `statistics:card_feedback_submitted`, `statistics:store_review_requested`, `statistics:store_review_completed`, `statistics:store_review_failed`
- `feedback:type_changed`: feedback modal lost its type selector. Settings opens it as "Request Feature" (`type: "idea"`) or "Report Bug" (`type: "issue"`). Use `type` on `feedback:modal_opened`

**Renames**

| Old event | New event | Property changes |
| --- | --- | --- |
| `loaded_logs` | `app:logs_loaded` | `size` to `size_mb` |
| `onboarding_slide` | `onboarding:slide_viewed` |  |
| `onboarding_reminder_enable` | `onboarding:reminder_enabled` |  |
| `onboarding_reminder_later` | `onboarding:reminder_postponed` |  |
| `onboarding_finished` | `onboarding:flow_completed` |  |
| `onboarding_skipped` | `onboarding:flow_skipped` |  |
| `log_saved` | `logger:log_saved` | `messageLength`, `tagsCount`, `emotionsCount` to `message_length`, `tags_count`, `emotions_count`. New: `mode`, `has_rating` |
| `log_created` | `logger:log_saved` | `mode: "create"` |
| `log_changed` | `logger:log_saved` | `mode: "edit"` |
| `log_saved_without_rating` | `logger:log_saved` | `has_rating: false` |
| `log_deleted` | `logger:log_deleted` |  |
| `log_cancled` | `logger:flow_cancelled` | New: `mode` |
| `log_reminder_enable` | `logger:reminder_enabled` |  |
| `log_reminder_later` | `logger:reminder_postponed` |  |
| `log_list_add` | `day:add_tapped` |  |
| `log_list_edit` | `day:edit_tapped` |  |
| `log_list_delete` | `day:delete_tapped` |  |
| `log_list_close` | `day:closed` |  |
| `calendar_filters_opened` | `calendar:filters_opened` |  |
| `calendar_filters_filtered` | `calendar:filters_applied` | `textLength`, `ratingsCount`, `tagsCount` to `text_length`, `ratings_count`, `tags_count` |
| `calendar_filters_reset` | `calendar:filters_reset` |  |
| `calendar_filters_closed` | `calendar:filters_closed` |  |
| `promo_changelog_clicked` | `calendar:promo_tapped` | New: `card: "changelog"` |
| `statistics_relevant_highlights` | `statistics:highlights_viewed` | `itemsCount` to `items_count` |
| `statistics_all_highlights` | `statistics:all_highlights_viewed` | `itemsCount` to `items_count`. `sleep_quality_chart_show` to `sleep_quality_distribution_show` |
| `statstics_shared` | `statistics:card_shared` | `type` to `card` |
| `tag_create` | `tags:tag_created` | `titleLength`, `containsEmoji` to `title_length`, `has_emoji` |
| `delete_tag_ask` | `tags:delete_requested` | Same as `tag_create`. Old `titleLength` held the tag title, not its length |
| `tag_delete_success` | `tags:tag_deleted` | Same as `delete_tag_ask` |
| `tag_delete_cancelled` | `tags:delete_cancelled` |  |
| `rate_app` | `settings:rate_app_tapped` |  |
| `settings_vote_features` | `settings:vote_features_tapped` |  |
| `settings_changelog` | `settings:changelog_tapped` |  |
| `colors_scale_changed` | `settings:scale_changed` | `scaleType` to `scale_type` |
| `privacy_policy_opened` | `settings:privacy_policy_opened` |  |
| `analytics_toggle` | `settings:analytics_toggled` |  |
| `reminder_enabled_change` | `reminders:reminder_toggled` |  |
| `reminder_time_change` | `reminders:time_changed` |  |
| `data_export_started` | `data:export_started` |  |
| `data_import_start` | `data:import_started` |  |
| `data_import_success` | `data:import_completed` | See changed meaning |
| `data_import_error` | `data:import_failed` |  |
| `data_reset_asked` | `data:reset_requested` | New: `kind` |
| `data_reset_success` | `data:reset_completed` | `type` to `kind` |
| `data_reset_cancel` | `data:reset_cancelled` | New: `kind` |
| `feedback_open` | `feedback:modal_opened` | New: `type` |
| `feedback_type_change` | `feedback:type_changed` |  |
| `feedback_send` | `feedback:feedback_submitted` | New: `message_length`, `has_email` |
| `feedback_close` | `feedback:modal_closed` |  |
| `questioner_submit` | `feedback:question_answered` | `answer_ids` (comma string) to `answer_ids` (array). New: `question_id` |
