# Product analytics

- Usage summary: [`src/shell/usage-summary.ts`](../src/shell/usage-summary.ts). Types in [`events.ts`](../src/state/analytics/events.ts)
- Sent after stores load and on every change. Counts, shares, booleans only
- Values come from last app open. Day counts do not age while app stays closed
- `first_app_version` (`$set_once`): first version that sent usage summary, not install version
- `identify(deviceId)` after opt-in and settings load: random install UUID, no traits. Code: [`src/state/analytics/index.tsx`](../src/state/analytics/index.tsx)
- Reset: PostHog `reset()` plus new device id, then regional default decides opt-in
- Photos fields: `photos_enabled` (PostHog flag `photos`), `photos_pct_30d`, `photos_count`, `photos_day_pct`, `photo_library_access` (`unavailable` on Android). Counts and shares only, never photo metadata

## Photos

Events: [TELEMETRY.md](../TELEMETRY.md#photos).

1. Adoption: step reach (`logger:step_viewed` with `step: "photos"`) to entries with photos (`logger:log_saved.photos_count > 0`)
2. Day photos worth the permission: prompt shown, allow rate, granted vs limited vs denied, `photos_day_count` share of saved photos
3. Suggestion hit rate: `photos:day_photos_loaded.count` distribution by `entry_days_ago`. `photos:photo_added` with `source: "day"` per loaded
4. Friction: picker cancel rate, limit hits, import failures, `photos:photo_removed` per `photos:photo_added`
5. Retention: cohorts by `photos_pct_30d` vs `logged_days_30d`, `current_streak`
6. Step fatigue: `logger:step_disabled` and `settings:step_toggled` off for photos
7. Viewing: `photos:viewer_closed` with `context: "day"` per entry with photos
