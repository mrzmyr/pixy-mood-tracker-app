# Product analytics

Goal: learn why and how people use Pixy. Who keeps logging, where people drop, what reminders and statistics do.

- Event catalog and property types: [`src/state/analytics/events.ts`](../src/state/analytics/events.ts)
- Event basics, consent, rename history: [analytics.md](analytics.md)
- PostHog project: `Pixy App - Production`

## Privacy rules

- Send counts, shares, booleans, step names, day offsets
- Never send ratings, emotion keys, sleep values, notes, tag titles. Same rule as [AGENTS.md footguns](../AGENTS.md#footguns)
- Person properties and events respect Settings > Privacy > Behavioral Data
- No `identify()` call. PostHog anonymous id is the person. Factory reset makes a new person

## Questions and signals

**Who becomes a habit user?**

- Person properties: `entries_count`, `logged_days_7d`, `logged_days_30d`, `current_streak`, `longest_streak`, `days_since_first_entry`, `days_since_last_entry`
- Compare cohorts by `reminder_enabled`, `reminder_hour`, `steps`, `statistics_unlocked`

## Person properties

- Built from local data: [`getPersonProperties`](../src/shell/personProperties.ts)
- Sent after stores load and on every change. Unchanged values are not sent again
- Values reflect last app open. Day counts do not age while app stays closed: filter churned users by last event time, not `days_since_last_entry`
- `first_app_version` (`$set_once`): first version that sent person properties. For installs older than this feature, it is not the install version
- Day windows include today, in device local time

## Derive in PostHog, not sent

- Session length: PostHog sessions. Every event has `$session_id`
- Screen time: gap between consecutive `$screen` events
- Import, export, reset history: `data:*` events
- Onboarding funnel: `onboarding:*` events

## Example queries

Habit users (4+ logged days in last 7) by reminder state:

```sql
SELECT properties.reminder_enabled AS reminder,
       count() AS people,
       countIf(toInt(properties.logged_days_7d) >= 4) AS habit_people
FROM persons
WHERE toInt(properties.entries_count) > 0
GROUP BY reminder
```

## Add a signal

- Start from a question in this file. Add question first, then signal
- Add event or property to [`events.ts`](../src/state/analytics/events.ts). Types block unknown events and properties
- Record renames in [analytics.md event history](analytics.md#event-history)
