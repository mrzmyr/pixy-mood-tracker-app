# Codebase deepening plan

Plan for deeper modules: more behavior behind smaller interfaces, one seam per real variation, tests through that interface.

- Visual version: [codebase-deepening.html](codebase-deepening.html)
- Vocabulary: [codebase-design skill](https://github.com/mattpocock/skills/blob/main/skills/engineering/codebase-design/SKILL.md) (module, interface, depth, seam, adapter, leverage, locality)
- Baseline: `main` at `d0a3a2f4` (1.91.0). Line references point there.
- Plan only. Each candidate ships as its own PR.

## Summary

| # | Candidate | Dependency | Payoff |
| --- | --- | --- | --- |
| 1 | Persisted store | local-substitutable (AsyncStorage) | 4 copied load/persist cycles become 1 |
| 2 | App data | local-substitutable | fixes people load gate bug, one store list |
| 3 | Reminder | true external (expo-notifications) | 3 copied flows become 1 tested verb |
| 4 | Backup codec | in-process | export and import format in one place |
| 5 | Highlights report | in-process | 14-day window defined once, thresholds tested |
| 6 | Log draft | in-process | save rules pure and tested, fixes stale button label |

Smaller: photo sweep inside logs store, calendar filter verbs, one consent derivation, questioner fetch, mood groups, emotion lookups.

## Order

1. **App data gate fix** (2, small part): add people to `StorageLoadGate`. Bug fix, ship first.
2. **Persisted store** (1). Unblocks 2 and photo sweep.
3. **App data** (2), then **backup codec** (4). Codec uses app data snapshot.
4. **Reminder** (3), **highlights report** (5), **log draft** (6). Independent, any order.

## 1. Persisted store

**Today**

- Logs, tags, settings, people each wire load, error, persist by hand:
  - [`LogsProvider.tsx:271-341`](../../src/features/logs/LogsProvider.tsx)
  - [`TagsProvider.tsx:143-237`](../../src/features/tags/TagsProvider.tsx)
  - [`settings/index.tsx:129-201`](../../src/state/settings/index.tsx)
  - [`PeopleProvider.tsx:141-261`](../../src/features/people/PeopleProvider.tsx)
- [`useStorageLoad`](../../src/state/persisted/useStorageLoad.ts) is shallow: state plus `markReady` and `markFailed`. Each caller must call both in right place.
- Two readiness signals: `state.loaded` and `StorageLoad.status`. Rule "never write after failed read" repeats 4 times as `status === "ready" && loaded`.
- Callers pick a signal at random:
  - `.loaded` only: calendar, usage summary, analytics, feature flags, reminder taps
  - both: [`useStoreReviewPrompt.ts:76`](../../src/features/review/useStoreReviewPrompt.ts)
- `createContext({} as ...)` in tags and settings: missing-provider guard never fires.
- `load(key, feedback?)`: no caller passes `feedback`.

**Proposed interface**

```ts
type Load =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; error: StructuredError };

function createPersistedStore<S, A>(config: {
  key: string;
  name: string;
  initial: () => S;
  hydrate: (stored: unknown | null) => S; // migrate + sanitize, pure
  reducer: (state: S, action: A) => S;
  waitFor?: () => boolean; // tags waits for settings
}): {
  Provider: React.FC<{ children: React.ReactNode }>;
  useState(): S;
  useDispatch(): React.Dispatch<A>;
  useLoad(): Load;
};
```

- `loaded` leaves domain state. Readiness = `useLoad().status === "ready"`.
- Store owns: no write before successful read, no write after failed read, write only on change.

**Seam**: `KeyValueStorage` port (`get`, `set`, `multiGet`). Adapters: AsyncStorage (production), in-memory (tests). Two adapters, real seam.

**Tests**

- One contract suite for `createPersistedStore`: failed read never writes, no write before load, equal state never writes.
- `hydrate` and `reducer` per store: pure table tests.
- Delete copied "load error never stores" tests in `logs.tsx`, `tags.tsx`, `settings.tsx`.

## 2. App data

**Today**

- **Bug**: [`StorageLoadGate.tsx:168-171`](../../src/shell/StorageLoadGate.tsx) checks settings, logs, tags. Not people. `usePeopleLoad` has zero callers. Failed people read lets app run.
- Store list repeats by hand:
  - [`rawExport.ts:11-16`](../../src/features/datagate/rawExport.ts) lists 4 keys. Misses `PIXY_INTERVENTIONS`.
  - [`DataGate.ts:88-110`](../../src/features/datagate/DataGate.ts) dev import knows on-disk shapes of logs and settings.
- Reset = 6 ordered calls in [`DataGate.ts:188-195`](../../src/features/datagate/DataGate.ts): logs, photo sweep, tags, people, settings, analytics.
- "All loaded" derived 3 times: `useLoadFixture.ts`, `usageSummary.ts`, datagate test.
- Provider order in [`Providers.tsx`](../../src/shell/Providers.tsx) matters but is implicit: tags and people delete call logs updater.

**Proposed interface**

```ts
const PERSISTED_STORES: readonly {
  key: string;
  name: "logs" | "tags" | "people" | "settings" | "interventions";
}[];

function useAppData(): {
  load: Load; // first error wins, ready when all ready
  snapshot(): Promise<Snapshot>;
  replaceAll(snapshot: Snapshot): Promise<void>;
  resetAll(): void; // includes photo sweep and analytics reset
};
```

- `StorageLoadGate` becomes `const { load } = useAppData()`.
- Raw export and dev import iterate `PERSISTED_STORES`.

**Tests**: table test over every key. Corrupt one key, expect `load.status === "error"`. Catches people bug. `resetAll` then reload gives defaults.

## 3. Reminder

**Today**

- [`Notifications.ts:84-101`](../../src/features/notifications/Notifications.ts) is pass-through over expo-notifications: `hasPermission`, `askForPermission`, `schedule`, `cancelAll`.
- 3 callers copy "ask permission, cancel all, schedule daily, save `reminderEnabled` and `HH:mm`":
  - [`SlideReminder.tsx:44-64`](../../src/features/logger/slides/SlideReminder.tsx)
  - [`ReminderSlide.tsx:82-101`](../../src/features/onboarding/screens/Onboarding/ReminderSlide.tsx)
  - [`Reminder.tsx:33-72`](../../src/features/notifications/components/Reminder.tsx)
- `HH:mm` format and hour/minute split live in each caller.
- Analytics differ: settings tracks permission result, slides do not.
- No tests for any of the 3 flows.

**Proposed interface**

```ts
type ReminderResult =
  | { status: "enabled"; time: string }
  | { status: "permission_denied" }
  | { status: "disabled" };

interface ReminderScheduler {
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  replaceDaily(hour: number, minute: number): Promise<void>;
  cancelAll(): Promise<void>;
}

function useReminder(): {
  enabled: boolean;
  time: string; // HH:mm
  enable(time: Date | string): Promise<ReminderResult>;
  disable(): Promise<void>;
};
```

**Seam**: `ReminderScheduler` port. Adapters: expo (native), no-op (web, exists today), in-memory (tests). Same pattern as `NotificationResponseSource` in [`reminderTaps.ts`](../../src/features/notifications/reminderTaps.ts).

**Tests**: in-memory scheduler. Assert settings and scheduled `(hour, minute)` for granted, denied, disable. Callers test only own analytics event.

## 4. Backup codec

**Today**

- `useDatagate` ([`DataGate.ts:138-296`](../../src/features/datagate/DataGate.ts)) mixes prompts, platform branches, analytics, file IO, data format.
- Settings export picked field by field at `DataGate.ts:245-253`. Comment in [`settings/index.tsx:48`](../../src/state/settings/index.tsx) asks to update `useDatagate` too.
- [`import.ts:38-44`](../../src/features/datagate/import.ts): strict schema, manual sync with export.
- Migration twice: `migrateImportData` moves `settings.tags`, then `DataGate.ts:169` reads `settings.tags || tags` again.
- Tests reach past interface: press `Alert.alert` buttons by array index, inspect `FileSystem.writeAsStringAsync` calls.

**Proposed interface**

```ts
// backup.ts, pure
export const encodeBackup = (snapshot: Snapshot, version: string): string;
export const decodeBackup = (
  raw: string,
):
  | { ok: true; snapshot: Snapshot }
  | { ok: false; reason: "invalid_json" | "invalid_schema" };

// settings owns own projection
export const toExportSettings = (settings: SettingsState): ExportSettings;

// FileTransfer port gains pick
interface FileTransfer {
  share(name: string, contents: string): Promise<boolean>;
  pickJsonText(): Promise<string | null>;
}
```

- `useDatagate` keeps prompts and analytics only. Calls `useAppData().snapshot` and `replaceAll`.

**Tests**: `decodeBackup(encodeBackup(s))` equals `s`. Legacy fixtures in `src/dev/fixtures` decode. Flow tests use in-memory `FileTransfer` and assert shared contents.

## 5. Highlights report

**Today**

- [`StatisticsProvider.tsx:94-100`](../../src/features/statistics/StatisticsProvider.tsx) exposes `load`, `isAvailable(type: string)`, `isHighlighted(type: string)`, raw state of 11 datasets. Typos compile.
- 14-day window computed in 6+ places with different edges:
  - provider `:143`: `>` start
  - [`screens/Statistics/index.tsx:44-49`](../../src/features/statistics/screens/Statistics/index.tsx): `>=` start
  - `HighlightsSection.tsx`, `Highlights/index.tsx`, `TagPeaksCards.tsx`
  - [`usageSummary.ts:83`](../../src/shell/usageSummary.ts): `subtract(13)` on day strings
- `items.length >= STATISTIC_MIN_LOGS` 4 times in one screen. `highlightsItemCount >= 4` in 2 files.
- Card thresholds (60%, `>= 2`, `> 5`, delta `>= 0.5`) have no tests.

**Proposed interface**

```ts
type StatisticId =
  | "mood_avg"
  | "mood_peaks_positive"
  // ...
  | "sleep_quality_distribution"
  | "mood_chart";

interface HighlightsReport {
  window: { start: string; end: string };
  unlocked: boolean;
  missingEntries: number;
  cards: Record<StatisticId, { available: boolean; highlighted: boolean }>;
  data: StatisticsState;
}

export const buildHighlightsReport = (input: {
  items: LogItem[];
  tags: Tag[];
  people: Person[];
  now: Date;
}): HighlightsReport;

function useStatistics(): {
  report: HighlightsReport | null;
  isLoading: boolean;
  refresh(force?: boolean): void;
};
```

**Seam**: none needed. Pure function, `now` passed in. Provider = cache glue.

**Tests**: table tests on `buildHighlightsReport` with fixed `now`: unlock edge, each card threshold, window edge.

## 6. Log draft

**Today**

- [`temporaryLog.tsx:30-38`](../../src/features/logger/temporaryLog.tsx) is raw state bag: `data`, `isDirty`, `initialize`, `set`, `update`, `reset`.
- Two update paths: slides call `useTemporaryLog()` and also get `onChange={tempLog.update}` from [`Logger.tsx`](../../src/features/logger/Logger.tsx).
- `date` and `dateTime` sync differs: `SlideMood` updates both, `SlideHeader` updates `dateTime` only.
- Day key recomputed by hand in 3 files instead of `getItemDate`.
- Save rules in [`useLoggerActions.ts:71-102`](../../src/features/logger/hooks/useLoggerActions.ts): neutral fallback mutates input, 3 casts, `closeTo` from stale state, dead branch.
- **Bug**: [`Logger.tsx:255`](../../src/features/logger/Logger.tsx) reads `content.length === 1` before first push. Always `"next"`.

**Proposed interface**

```ts
function useLogDraft(): {
  draft: Draft;
  isDirty: boolean;
  hasContent: boolean;
  setRating(rating: Rating): void;
  setDateTime(iso: string): void; // keeps date in sync
  setTags(ids: string[]): void;
  // ... one setter per field
  commit(): { item: LogItem; closeTo: "calendar" | "back" };
  discard(): void;
};

export const finalizeDraft = (
  draft: Draft,
  existing: LogItem[],
): { item: LogItem; closeTo: "calendar" | "back" };
```

**Seam**: `finalizeDraft` pure. Navigation, analytics, photo sweep stay in thin adapter hook.

**Tests**: `finalizeDraft` table: neutral fallback, null sleep, `closeTo` with 0, 1, 2 entries that day. `setDateTime` keeps `date` in sync.

## Smaller candidates

- **Photo sweep**: callers must call `sweepPhotos()` after delete, reset, logger close ([`LogList/index.tsx:71`](../../src/features/calendar/screens/LogList/index.tsx), [`useLoggerActions.ts:51,100`](../../src/features/logger/hooks/useLoggerActions.ts), [`DataGate.ts:190`](../../src/features/datagate/DataGate.ts)). Move into logs store: delete files an action stopped referencing. Remove `sweepPhotos` from interface.
- **Calendar filters**: callers spread `data` and hand-write toggles ([`Body.tsx:38-70`](../../src/features/calendar/screens/Calendar/CalendarBottomSheet/Body.tsx)). Core tests skipped (`xdescribe` at [`filters.tsx:58`](../../src/features/calendar/__tests__/filters.tsx)). Export pure `matchesFilters`, add `toggleTag`, `togglePerson`, `toggleRating`, `setText`.
- **Consent**: analytics and feature flags derive consent with different rules ([`analytics/index.tsx:55`](../../src/state/analytics/index.tsx), [`featureFlags/index.tsx:58-62`](../../src/state/featureFlags/index.tsx)). One `useConsent()` with pure `deriveConsent(settings)`.
- **Questioner**: `SlideFeedback` calls `useQuestioner()` only for `submit`, triggers second fetch. `question_slide_` prefix in 3 files. Pure `pickNextQuestion`, `QuestionsApi` port.
- **Mood groups**: positive/neutral/negative mapping in `MoodAvg.ts`, `MoodPeaks.ts`, `daySummary.ts`. One `getMoodGroup(rating)` in [`Ratings.ts`](../../src/constants/Ratings.ts).
- **Emotion catalog**: callers build own `keyBy`/`find`/filters over `EMOTIONS`. Add `getEmotion(key)`, `listSelectableEmotions({ mode, category })`.

## Keep as is

Already deep. Small interface, tested through it:

- [`persisted/index.ts`](../../src/state/persisted/index.ts) `load`/`store`
- [`lib/logDates.ts`](../../src/lib/logDates.ts)
- [`logger/steps.ts`](../../src/features/logger/steps.ts)
- [`statistics/Streaks.ts`](../../src/features/statistics/Streaks.ts)
- [`notifications/reminderTaps.ts`](../../src/features/notifications/reminderTaps.ts)
- [`review/storeReview.ts`](../../src/features/review/storeReview.ts)
- [`calendar/navigation.ts`](../../src/features/calendar/navigation.ts)
- [`support/`](../../src/support) `SupportClient` port
- [`datagate/fileTransfer.ts`](../../src/features/datagate/fileTransfer.ts)

## Testing rule

- Replace, do not layer. Tests at new interface replace tests on old shallow modules.
- Assert observable outcome, not internal state.
- Port only with 2+ adapters (production + test).
