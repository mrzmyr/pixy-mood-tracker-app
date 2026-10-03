# People

Status: spec, 2026-10-03. Not built. Local draft, not committed.

Track who user was with per entry. Goal: statistics per person ("avg mood with Sam").

## Decisions

- Name: **People**. Not Friends (excludes partner, family, coworkers), not Connections (network vibe)
- Own store and own logger slide, not a tag subtype
- Behind PostHog flag `people`. Flag off hides settings entry, slide, step toggle. Data stays
- Step `people` disabled by default. User enables in Settings > Steps. Later: in-app announcement enables it (separate spec)
- No color per person. Fallback avatar: gray user icon
- Max 50 people (`MAX_PEOPLE`), name max 30 chars (reuse `MAX_TAG_LENGTH`)
- Delete mirrors tags: strips references from all entries, confirm shows entry count. Archive hides from slide, stats, filters; history stays
- Contact photo update: none. Photo changes come from the library. No background sync, no extra permission prompt
- Export self contained: avatars base64 inline in JSON
- Avatar files change only on save in the person form. Cancel keeps the stored file
- All 33 locales translated before merge ([i18n](../i18n.md))
- Widget: out of scope

## Data model

- Storage key `PIXEL_TRACKER_PEOPLE`, provider mirrors [`TagsProvider`](../../src/features/tags/TagsProvider.tsx)
- Never persist after failed read ([footguns](../../AGENTS.md#footguns))

```ts
// src/features/people/PeopleProvider.tsx
export interface Person {
  id: string; // uuid v4
  name: string; // user editable, max MAX_TAG_LENGTH
  avatar: string | null; // relative path "people/<id>.jpg", never absolute
  contactId?: string; // OS contact id, used only for duplicate check
  isArchived?: boolean;
  createdAt: string; // ISO
}

interface State {
  loaded?: boolean;
  people: Person[];
}
```

```ts
// src/types/index.ts
export const PersonReferenceSchema = z.object({ id: z.uuid() });
// LogItemSchema
people: z.array(PersonReferenceSchema).default([]),
```

- Entries reference by `id` only. Rename follows history
- Unlimited people per entry
- `logsUpdater.removePersonFromLogs(id)` on delete, mirrors `removeTagFromLogs`
- Logger step type: add `"people"` to `LoggerStep` and `STEP_OPTIONS` after `"tags"` ([LoggerSteps](../../src/constants/LoggerSteps.ts))

## Avatars

- Files under `FileSystem.documentDirectory + "people/<id>.jpg"`
- Resize 256x256, JPEG quality 0.8 via `expo-image-manipulator`. ~15 KB each, 50 people ~750 KB
- Store relative path. iOS container path changes on app update
- Write on add, replace on edit, unlink on delete
- Orphan sweep on provider load: file without person gets deleted
- Render with `expo-image`, cache key `id + updatedAt`
- No photo: gray user icon

## Import sources

- Contact: `Contact.presentPicker()` from `expo-contacts`, both platforms. Read `getFullName()` + `getImage()`. Never read phone, email, or other fields
- Manual: name + optional photo from library (`expo-image-picker`)
- Duplicate `contactId`: toast "already added", open existing person
- Permissions: `expo-contacts` config plugin adds `READ_CONTACTS` + `WRITE_CONTACTS` (Android) and `NSContactsUsageDescription` (iOS). Keep plugin defaults. Document why in privacy policy and Play Console declaration: picker only, no address book read, no write
- Permission prompt: `requestPermissionsAsync()` runs before `presentPicker()` on both platforms. Spike result (expo-contacts 57 source): the picker itself needs no permission, but `getFullName()` and `getImage()` read the picked contact from the contact store by id. Android throws `PermissionException(READ_CONTACTS)`, iOS `unifiedContact(withIdentifier:)` returns nothing without authorization. Denied: alert with "Open Settings", manual add stays available
- `contactId` is platform specific. Export from iOS imported on Android keeps id, duplicate check silently fails there. Accepted

## Export and import

- Export shape in [`DataGate`](../../src/features/datagate/DataGate.ts):

```ts
people: Array<
  Omit<Person, "avatar"> & {
    avatar: { base64: string; mime: "image/jpeg" } | null;
  }
>;
```

- 50 avatars ~1 MB base64. Single JSON file stays
- Import: decode, write file, set relative path. Corrupt avatar becomes `null`, person kept
- [`migration.ts`](../../src/features/datagate/migration.ts): `people ?? []` on root, `item.people ?? []` per entry
- Reset: `peopleUpdater.reset()` + delete `people/` directory

## UI

### `PersonChip` (shared component)

- Path `src/features/people/components/PersonChip.tsx`
- One component for slide, log detail, logs list, filters, stats. Consistent everywhere
- Pill like [`Tag`](../../src/features/tags/components/Tag.tsx): 1px border, radius 100, selected = `tagBackgroundActive` + tint border
- Left: 24px circle avatar or gray user icon. Right: name 17px
- Variants: `chip` (default), `large` (detail screen)

### Logger slide `SlidePeople`

- Position after tags
- Headline: "Who were you with?"
- Tap chip = toggle select. Archived hidden unless already on draft (copy `SlideTags` filter)
- "Manage people" `MiniButton` pushes `/people`
- Chip order: most used in last 90 days first, then alphabetical
- Step enabled and `people.length === 0`: simple empty state, one "Add people" button pushes `/people`. No skip
- Disable link like tags

### Settings > People (`/settings/people`)

- Visible only with flag `people`
- List active, "Archived" link, "Add" button hidden at `MAX_PEOPLE`
- Add sheet: **From contacts** / **Manual**
- Tap row opens detail

### Person detail (`/people/[id]`, create reuses with `/people/create`)

- Large avatar centered, name below (see design reference in session screenshot)
- Tap avatar or Change Photo: photo library directly. Nobody takes a camera photo of a person while adding them
- Remove Photo: link below, only when a photo is set
- Name inline editable
- Bottom: Archive (primary), Delete (secondary, confirm with entry count)

### Elsewhere

- Log detail: chips under tags
- Logs filter: multi select, OR logic, mirrors tag filter. Section hidden without flag or without active people

## Statistics

- `PeopleDistribution`: count per person, most seen first. Mirrors [`TagsDistribution`](../../src/features/statistics/TagsDistribution.ts)
- `PeoplePeaks`: avg mood with person vs overall avg. Min 5 entries per person. All qualifying persons sorted by delta. One card with one row per person
- Scale 1 to 7 (`RATING_MAPPING` plus one) so the worst rating reads 1, not 0
- Statistics tab short list shows the peaks card only when one person differs by 0.5 or more; full highlights always
- Copy neutral: "Avg. mood with Sam: 4.2 (+0.6)". Never "worse"
- Cards show `PersonChip`, single tint color, no per person color. Tapping a distribution row filters the calendar to that person

## Analytics

Counts and booleans only. Never names, never images ([footguns](../../AGENTS.md#footguns)).

Names follow the `<area>:<object>_<verb>` convention of [events.ts](../../src/state/analytics/events.ts).

- `people:person_added { source: "contacts" | "manual", has_avatar }`
- `people:person_updated { name_changed, avatar_changed, is_archived }` (archive is an update)
- `people:delete_requested { entries_count }`, `people:person_deleted { entries_count }`, `people:delete_cancelled`
- `logger:log_saved` gets `people_count` (like `tags_count`), no separate slide event
- `calendar:filters_applied` gets `people_count`
- Usage summary: `people_count`, `archived_people_count`
- Register in [`events.ts`](../../src/state/analytics/events.ts), document in [analytics.md](../analytics.md)

## Privacy

- Privacy policy: "Contact name and photo stay on device. Included in your own backup file. Never sent to us"
- Apple nutrition label: Contacts, not linked, not used for tracking
- Play Console: contacts permission declaration, picker only
- Testers must accept privacy policy to see flag ([AGENTS.md](../../AGENTS.md#feature-flags))
- In-app Settings > Privacy adds a "People" section (`privacy_people_content`) while flag on

## Testing

- Contact picker and photo library = OS UI, Maestro cannot drive
- `PeopleSources` override like [`fileTransfer.ts`](../../src/features/datagate/fileTransfer.ts), fake in [`src/dev/fakePeopleSources.ts`](../../src/dev/fakePeopleSources.ts). `<scheme>://dev/fake-files` enables both fakes
- Fixture `people`: `year` plus Sam (photo), Alex, Mia (archived) on every 3rd, 4th, 7th entry ([fixtures](../../src/dev/fixtures/index.ts))
- E2E: manual add, fake contact pick, duplicate block, slide select, filter, stats cards, export import round trip, delete strips references
- Unit: provider reducer, migration, avatar file lifecycle, peaks math

## Dependencies

- `expo-contacts`, `expo-image-manipulator`, `expo-image-picker`, `expo-image` (check installed)
- New native binary. Check `bun builds list` before compile

## PRs

1. Foundation: store, avatars, export/import, settings screens, flag, i18n, e2e `people.yaml`
2. Logger: slide, step toggle, log detail chips, filters
3. Statistics: `PeopleDistribution`, `PeoplePeaks`

## Rollout

0. Spike: done, see permission prompt under Import sources
1. Build behind flag `people`, EN + 30 locales
2. Internal + testers via flag
3. Privacy policy, store labels updated
4. Flag 100%
5. Announcement enabling step (separate spec)
