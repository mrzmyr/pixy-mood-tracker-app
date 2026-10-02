# Product analytics

- Usage summary: [`src/shell/usageSummary.ts`](../src/shell/usageSummary.ts). Types in [`events.ts`](../src/state/analytics/events.ts)
- Sent after stores load and on every change. Counts, shares, booleans only
- Values come from last app open. Day counts do not age while app stays closed
- `first_app_version` (`$set_once`): first version that sent usage summary, not install version
- No `identify()`: install stays anonymous
- Photos fields: `photos_enabled` (PostHog flag `photos`), `photos_pct_30d`, `photos_count`, `photos_day_pct`, `photo_library_access` (`unavailable` on Android). Counts and shares only, never photo metadata

## Photos

Events: [analytics.md](analytics.md#photos).

1. Adoption: step reach (`logger:step_viewed` with `step: "photos"`) to entries with photos (`logger:log_saved.photos_count > 0`)
2. Day photos worth the permission: prompt shown, allow rate, granted vs limited vs denied, `photos_day_count` share of saved photos
3. Suggestion hit rate: `photos:day_photos_loaded.count` distribution by `entry_days_ago`. Selected per loaded
4. Friction: picker cancel rate, limit hits, import failures, deselect rate
5. Retention: cohorts by `photos_pct_30d` vs `logged_days_30d`, `current_streak`
6. Step fatigue: `logger:step_disabled` and `settings:step_toggled` off for photos
7. Viewing: `photos:viewer_closed` with `context: "day"` per entry with photos
