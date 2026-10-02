# Product analytics

- Usage summary: [`src/shell/usageSummary.ts`](../src/shell/usageSummary.ts). Types in [`events.ts`](../src/state/analytics/events.ts)
- Sent after stores load and on every change. Counts, shares, booleans only
- Values come from last app open. Day counts do not age while app stays closed
- `first_app_version` (`$set_once`): first version that sent usage summary, not install version
- No `identify()`: install stays anonymous
- Photos fields: `photos_enabled` (PostHog flag `photos`), `photos_pct_30d`, `photos_count`, `photos_day_pct`. Counts and shares only, never photo metadata
