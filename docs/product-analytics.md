# Product analytics

- Person properties: [`src/shell/personProperties.ts`](../src/shell/personProperties.ts). Types in [`events.ts`](../src/state/analytics/events.ts)
- Sent after stores load and on every change. Counts, shares, booleans only
- Values come from last app open. Day counts do not age while app stays closed
- `first_app_version` (`$set_once`): first version that sent person properties, not install version
- No `identify()`: PostHog anonymous id is the person
