# Spec: Native menu lists

Status: phase 1 done (Settings tab). Phases 2 and 3 open.

## Goal

- Replace JS menu lists ([`MenuList`](../../src/components/MenuList.tsx), [`MenuListItem`](../../src/components/MenuListItem.tsx), [`MenuListHeadline`](../../src/components/MenuListHeadline.tsx)) with OS list views from [Expo UI](https://docs.expo.dev/versions/latest/sdk/ui/)
- iOS: SwiftUI `Form` (grouped inset list, system large title, Liquid Glass on iOS 26)
- Android: Material 3 grouped list (Jetpack Compose `ListItem`)
- Web: Expo UI web fallback
- Keep behavior: same rows, same routes, same analytics events, same test IDs

## Building blocks

- Container: universal [`FieldGroup`](https://docs.expo.dev/versions/latest/sdk/ui/universal/fieldgroup/) inside `Host style={{ flex: 1 }}`
  - iOS: SwiftUI `Form`
  - Android: Compose `LazyColumn`, rows clipped to connected-list shape
- Section: `FieldGroup.Section` with `title`. Help text goes to `FieldGroup.SectionFooter`
- Row: `SettingsRow` ([`SettingsRow.tsx`](../../src/features/settings/screens/Settings/SettingsRow.tsx), [`SettingsRow.ios.tsx`](../../src/features/settings/screens/Settings/SettingsRow.ios.tsx))
  - iOS: SwiftUI `Button` + `Label` + chevron `Image`. Universal `ListItem` wraps accessories in `RNHostView`, which cannot host an SF Symbol
  - Android and web: universal [`ListItem`](https://docs.expo.dev/versions/latest/sdk/ui/universal/listitem/) with leading and trailing `Icon`
- Icons: universal [`Icon.select`](https://docs.expo.dev/versions/latest/sdk/ui/universal/icon/)
  - iOS: SF Symbol name
  - Android: `@expo/material-symbols/<name>.xml`
  - `babel-preset-expo` loads the `@expo/ui` Babel plugin. Plugin drops the other platform's icon from each bundle
- Toggle rows (phase 2): universal [`Switch`](https://docs.expo.dev/versions/latest/sdk/ui/universal/switch/) with `label`
- Title
  - iOS: `NavigationStack` + `navigationTitle` modifier. System large title collapses on scroll
  - Android: first section header, 32pt bold
- Mixed React Native content (support card, version): `RNHostView matchContents` inside a section footer. Give the hosted view an explicit width

## Rules

- Test IDs
  - iOS: pass `testID` to SwiftUI `Button`. Maestro sees it as accessibility identifier
  - Android: universal `ListItem` drops `testID`. Pass `testID(...)` from `@expo/ui/jetpack-compose/modifiers`. Compose exposes test tags as resource IDs
- Colors: rows follow system colors. Do not pass app color tokens to native rows, except icon tint on Android
- No haptics on row tap. Native list rows do not vibrate
- Keep feather icons only in React Native content (support card)
- Jest renders Expo UI through mocks in [`jest.setup.js`](../../jest.setup.js). Extend the mocks when a screen uses a new Expo UI view

## Phases

### Phase 1: Settings tab (done)

- [`Settings/index.tsx`](../../src/features/settings/screens/Settings/index.tsx)
- Sections: main (Data, Reminder, Colors, Tags, Steps), Feedback, About, Development
- Feedback help text moves to section footer
- Support card and version move to last section footer

### Phase 2: Settings subscreens

Each screen is one PR. Order: simple rows first, toggles next, custom rows last.

- Rows only
  - [`Data.tsx`](../../src/features/datagate/screens/Data.tsx): import, export, reset. Reset rows use `role="destructive"` on iOS
  - [`Settings/Tags.tsx`](../../src/features/settings/screens/Settings/Tags.tsx): archive link
  - [`dev/screens.tsx`](../../src/dev/screens.tsx): fixture list
- Toggle rows
  - [`Privacy.tsx`](../../src/features/settings/screens/Privacy.tsx): behavioral data switch
  - [`Steps.tsx`](../../src/features/settings/screens/Steps.tsx): one switch per step
  - [`Reminder.tsx`](../../src/features/notifications/components/Reminder.tsx): reminder switch, time picker. Time picker becomes universal `DateTimePicker` or SwiftUI `DatePicker` row
  - [`TagEdit.tsx`](../../src/features/tags/screens/TagEdit.tsx): switches. Text field stays React Native until Expo UI `TextInput` covers the keyboard flow
- Custom rows
  - [`TagListItem.tsx`](../../src/features/tags/components/TagListItem.tsx): colored tag pill. Needs `RNHostView` or native `Text` with background
  - [`DevelopmentTools.tsx`](../../src/features/settings/screens/DevelopmentTools.tsx): label plus value. Use SwiftUI `LabeledContent` on iOS, `ListItem` supporting text on Android

### Phase 3: Remaining lists, removal

- Statistics ([`Statistics/index.tsx`](../../src/features/statistics/screens/Statistics/index.tsx), [`HighlightsSection.tsx`](../../src/features/statistics/screens/Statistics/HighlightsSection.tsx)): list sits inside a React Native scroll view with charts. Keep React Native here, or host only the rows with `Host matchContents`. Decide after phase 2
- Delete `MenuList`, `MenuListItem`, `MenuListHeadline`, and `menuListItem*` color tokens when no screen imports them

## Test

- Unit: [`SettingsSupport.tsx`](../../src/__tests__/SettingsSupport.tsx) finds rows by role and name through the Jest mocks
- e2e: flows that open Settings rows ([`tags.yaml`](../../e2e/flows/tags.yaml), [`statistics.yaml`](../../e2e/flows/statistics.yaml), [`data-round-trip.yaml`](../../e2e/flows/data-round-trip.yaml), [`calendar-history.yaml`](../../e2e/flows/calendar-history.yaml)). Run on iOS and Android per phase
- Screenshots per PR: iOS light, iOS dark, Android

## Risks

- `FieldGroup` scrolls natively. React Native scroll helpers (`scrollToTop` on tab press) do not reach it
- Section footer with `RNHostView` needs an explicit width. Rotation and iPad split view can mis-size it
- Material You: Android rows take the wallpaper palette. Set `Host seedColor` if rows must match the app tint
- `@expo/ui` is new per SDK. Pin to the Expo SDK version (`~57.0.x`) and re-check the universal APIs on each SDK upgrade
