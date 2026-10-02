# Product analytics

- Usage summary: [`src/shell/usageSummary.ts`](../src/shell/usageSummary.ts). Types in [`events.ts`](../src/state/analytics/events.ts)
- Sent after stores load and on every change. Counts, shares, booleans only
- Values come from last app open. Day counts do not age while app stays closed
- `first_app_version` (`$set_once`): first version that sent usage summary, not install version
- No `identify()`: install stays anonymous
- Every event: `local_hour`, `local_weekday`, `session_source` ([`src/state/analytics/context.ts`](../src/state/analytics/context.ts))
- `session_source: "reminder"` after reminder tap, until app goes to background ([`src/shell/reminderOpenTracking.ts`](../src/shell/reminderOpenTracking.ts))
- Session length: PostHog sessions, not sent
