# Analytics

- Event catalog: [`src/state/analytics/events.ts`](../src/state/analytics/events.ts)
- Screens: `$screen` with the route name, from [`src/navigation/screenTracking.ts`](../src/navigation/screenTracking.ts)
- Super properties on every event: `scale_type`, `reminder_enabled`, `steps` ([`src/state/analytics/index.tsx`](../src/state/analytics/index.tsx))
- Privacy rule: [AGENTS.md footguns](../AGENTS.md#footguns)

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

**Changed meaning**

- `data_import_success` fired twice per import: once when a file was picked, once after the import. `data:import_completed` fires only after the import

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
