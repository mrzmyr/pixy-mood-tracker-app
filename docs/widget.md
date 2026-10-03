# Home Screen widgets

iOS only. Built with [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/).

- Widget kinds: `PixyWeek`, `PixyMonth`, `PixyYear` ([`app.config.ts`](../app.config.ts) `WIDGETS`)
- Layouts: [`src/features/widget/widgets`](../src/features/widget/widgets). Each file starts with `"widget"` and runs in the widget runtime: no hooks, no imports besides `@expo/ui`, no module-scope values
- Data: [`widgetData.ts`](../src/features/widget/widgetData.ts) turns entries plus the color scale into props. Both color schemes come as props; the widget picks one from `environment.colorScheme`
- Sync: [`WidgetSync.tsx`](../src/features/widget/WidgetSync.tsx) pushes a 7 day timeline on every entry or scale change and on foreground. Each timeline entry moves the today marker at local midnight. Year gets 1 entry: WidgetKit renders every entry at timeline build, and 7 renders of 372 cells crash the 30 MB extension
- Reloads from the app are throttled by chronod and flushed when the app goes to background. Expect the Home Screen to update a few seconds after leaving Pixy, not while it is open
- Tap: every widget opens `<scheme>://calendar`
- Bundle ids: `<app id>.widgets`, app group `group.<app id>`, per variant. Xcode automatic signing registers the group on first phone build
- Nudge: [`widgetNudge.ts`](../src/features/widget/widgetNudge.ts), day 3 or 4, once per install, stored as `widget_nudge` in `actionsDone`. Reset in Settings > Development tools
- Guide: [`screens/WidgetGuide`](../src/features/widget/screens/WidgetGuide), route `/widget?source=nudge|settings`
- Android: no widget. Nudge, guide, and Settings item hidden (`IS_WIDGET_SUPPORTED`)

## Screenshots in the guide

Path: `assets/images/widget/{intro,step-1,step-2,step-3}.jpg`

Real screenshots from an iPhone. Replace after a widget design change:

1. `bun app install --target=<iphone>`, `bun app seed --target=<iphone> --fixture=year`
2. Add the Pixy widgets to the Home Screen
3. Screenshot: Home Screen with widgets (`intro`), jiggle mode (`step-1`), Edit menu with Add Widget (`step-2`), widget gallery searched for Pixy (`step-3`)
4. Crop to the top 1600 px of the 1170 px wide screenshot, resize to 600x820, save as JPEG quality 82

## Test

- Unit: `bunx jest src/features/widget`
- Fixture `two-days`: next entry is the 3rd logged day and opens the nudge
- Device: widget gallery lists Week, Month, Year under Pixy; colors follow Settings > Colors

## Build for an iPhone

- `bun app install --target=<iphone>` fails when Xcode has no Apple account: the widget target needs the App Groups capability and its own profile
- Working path: `EXPO_PUBLIC_APP_VARIANT=preview bunx eas-cli build -p ios --local --profile preview --output <ipa>` (interactive; EAS syncs capabilities and creates the extension profile), then `xcrun devicectl device install app --device <id> <ipa>`

## Debug

- Settings > Development tools > Widgets shows the last sync result (`ok` or `failed: <why>`)
- `null` anywhere in props makes `updateTimeline` throw (`NSUserDefaults` rejects it) and leaves the widget blank. Test in [`__tests__/widgetData.ts`](../src/features/widget/__tests__/widgetData.ts) guards it
- Extension logs on a phone: `brew install libimobiledevice`, `idevicesyslog -u <udid> | grep -E "ExpoWidgets|PixyPreview\(React\)"`
