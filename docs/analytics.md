# Analytics

- Event catalog: [`src/state/analytics/events.ts`](../src/state/analytics/events.ts)
- Usage summary and behaviour signals: [product-analytics.md](product-analytics.md)
- Screens: `$screen` with the route name, from [`src/shell/screenTracking.ts`](../src/shell/screenTracking.ts)
- Super properties on every event: `scale_type`, `reminder_enabled`, `steps` ([`src/state/analytics/index.tsx`](../src/state/analytics/index.tsx))
- Privacy rule: [AGENTS.md footguns](../AGENTS.md#footguns)
- Default: on for all users. Onboarding privacy slide says so. Factory reset turns it back on ([`src/constants/Settings.ts`](../src/constants/Settings.ts))
- Off switch: Settings > Privacy > Behavioral Data
- Feature flags load only with consent ([development.md](development.md#feature-flags))
- Store review prompt: `logger:store_review_requested` ([`src/features/review`](../src/features/review))
  - Fires once per install, after the save that reaches 7 entries
  - Properties: `trigger`, `entries_count`
  - OS decides whether prompt shows
- Confirmation after a new entry: `logger:confirmation_viewed`, `logger:confirmation_answered`, `logger:confirmation_skipped` ([`src/features/logger/confirmation`](../src/features/logger/confirmation))
  - Answer: `worse`, `same`, `better`. Asked only after create, not edit
  - Entry metadata: `rating`, `emotions`, counts, `message_word_count`, `sleep_quality`, `entries_count`

## Photos

- Events: `photos:*` in [`events.ts`](../src/state/analytics/events.ts). Sent through `track()` only, so consent applies
- Never file names, URIs, dimensions, EXIF, location, photo timestamps, or library ids
- `mode`: `create` or `edit`. `entry_days_ago`: 0 for today, like `calendar:day_opened.days_ago`
- Questions: [product-analytics.md](product-analytics.md#photos)

| Event | When | Properties |
| --- | --- | --- |
| `logger:step_viewed` | Photos step shown | `step: "photos"` |
| `photos:day_access_prompt_shown` | Permission row shows, once per step mount | `mode`, `entry_days_ago` |
| `photos:day_access_prompt_dismissed` | Close button on the row | `mode` |
| `photos:day_access_answered` | System dialog closes | `status`, `source` (`row`, `button`) |
| `photos:day_photos_loaded` | Day query resolves | `count` (0 to 20), `access`, `entry_days_ago` |
| `photos:picker_opened` | Library picker opens | `remaining` |
| `photos:picker_closed` | Library picker returns | `picked_count`, `is_cancelled` |
| `photos:photo_added` | Photo attached: picked in the library picker, or a suggestion tapped. Before its import ends | `source` (`day`, `library`), `count`, `mode` |
| `photos:photo_removed` | Remove button on a tile or in the viewer | `source`, `count`, `mode` |
| `photos:limit_reached` | Suggestion tapped at 6 attached | `mode` |
| `photos:import_failed` | Import error | `source`, `status` |
| `photos:viewer_closed` | Viewer closes | `context` (`logger`, `day`), `photos_count`, `viewed_count` |
| `logger:log_saved` | Save | `photos_count`, `photos_day_count`, `photos_library_count` |
| `settings:step_toggled` | Check-in toggle | `step: "photos"` |
| `logger:step_disabled` | "I Don’t Add Photos" | `step: "photos"` |

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

- Photo attachments, first release with photos ([`src/features/photos`](../src/features/photos))
  - `photos:day_access_prompt_shown`: `mode`, `entry_days_ago`
  - `photos:day_access_prompt_dismissed`: `mode`
  - `photos:day_access_answered`: `status` (`granted`, `limited`, `denied`), `source` (`row`, `button`)
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

**Removed properties** (never sent under the new names)

- All events: `userId`
- `log_*`: `rating`, `emotions`, `date`, `dateTime`
- `calendar_filters_filtered`: `ratings`
- `statistics_relevant_highlights`, `statistics_all_highlights`: `mood_avg_type`, `mood_avg_percentage`
- `feedback_send`: `message`, `email`, `deviceId`, `locale`, `version`, `os`, `date`, `environment`
- `questioner_submit`: `question_text`, `answer_texts`, `question`, `deviceId`, `language`, `locale`, `version`, `os`, `date`
- `loaded_logs`: `unit` (always `mb`)

**Removed events**

- Statistics card feedback and its App Store review prompt removed in first release after `v1.88.0`. Last sent in `v1.88.0`. No replacement
  - `statistics_feedback`
  - `statistics_feedback_store_review_request`
  - `statistics_feedback_store_review_done`
  - `statistics_feedback_store_review_error`
- New names never shipped in a release: `statistics:card_feedback_submitted`, `statistics:store_review_requested`, `statistics:store_review_completed`, `statistics:store_review_failed`
- `feedback:type_changed`: feedback modal lost its type selector. Settings opens it as "Request a feature" (`type: "idea"`) or "Report a bug" (`type: "issue"`). Use `type` on `feedback:modal_opened`

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
| `log_emotions_tooltip_close` | `logger:emotions_tooltip_closed` |  |
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
