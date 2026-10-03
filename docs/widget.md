# Home Screen widgets

iOS only. Built with [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/).

- Widget kinds: `PixyWeek`, `PixyMonth`, `PixyYear` ([`app.config.ts`](../app.config.ts) `WIDGETS`)
- Layouts: [`src/features/widget/widgets`](../src/features/widget/widgets). Each file starts with `"widget"` and runs in the widget runtime: no hooks, no imports besides `@expo/ui`, no module-scope values
- Data: [`widgetData.ts`](../src/features/widget/widgetData.ts) turns entries plus the color scale into props. Both color schemes come as props; the widget picks one from `environment.colorScheme`
- Sync: [`WidgetSync.tsx`](../src/features/widget/WidgetSync.tsx) pushes a 7 day timeline on every entry or scale change and on foreground. Each timeline entry moves the today marker at local midnight
- Layout: title top left, logged count top right, grid of rounded squares below. Week shows the last 4 weeks (current week last, today ringed in the tint color). Month shows the calendar grid. Year medium shows the trailing 22 weeks as columns of seven; Year large shows 12 mini month calendars
- Year widget shows images: 372 SwiftUI cells exceed the widget extension limit of 30 MB (`memorystatus: ExpoWidgetsTarget exceeded mem limit`). The app renders [`YearPixelsCanvas.tsx`](../src/features/widget/YearPixelsCanvas.tsx) off screen and captures one PNG per row (7 weekday rows for medium, 3 month rows for large, light and dark) into `widgetsDirectory` with react-native-view-shot. Year gets 1 timeline entry
- Year layout: rows span the full width, zero-minimum spacers between rows fill the height. One image cannot fill a box of another aspect ratio without a gap or crop; flexible row gaps keep cells square and the grid flush on all four sides
- Reloads from the app are throttled by chronod and flushed when the app goes to background. Expect the Home Screen to update a few seconds after leaving Pixy, not while it is open
- Tap: every widget opens `<scheme>://calendar`
- Bundle ids: `<app id>.widgets`, app group `group.<app id>`, per variant. Xcode automatic signing registers the group on first phone build
- Guide: [`screens/WidgetGuide`](../src/features/widget/screens/WidgetGuide), route `/widget`, opened from Settings > Widgets. No automatic prompt
- Feature flag: `home-screen-widget` ([feature flags](development.md#feature-flags), [`useIsWidgetEnabled.ts`](../src/features/widget/useIsWidgetEnabled.ts)). Override in dev and preview: Settings > Development > Feature flags
- Flag off: Settings entry and guide hidden, every widget shows "Not available". iOS still lists the widgets in the gallery; a flag cannot hide a native widget
- While flags load, sync waits, so widgets never flash "Not available"
- Before the first sync a widget shows "Open Pixy to see your pixels."
- Android: no widget. Guide and Settings item hidden (`IS_WIDGET_SUPPORTED`)

## Screenshots in the guide

Path: `assets/images/widget/{intro,step-1,step-2,step-3}.jpg`

Real screenshots from an iPhone. Replace after a widget design change:

1. `bun app install --target=<iphone>`, `bun app seed --target=<iphone> --fixture=year`
2. Add the Pixy widgets to the Home Screen
3. Screenshot: Home Screen with widgets (`intro`), jiggle mode (`step-1`), Edit menu with Add Widget (`step-2`), widget gallery searched for Pixy (`step-3`)
4. Crop to the top 1600 px of the 1170 px wide screenshot, resize to 600x820, save as JPEG quality 82

## Test

- Unit: `bunx jest src/features/widget`
- Device: widget gallery lists Week, Month, Year under Pixy; colors follow Settings > Colors

## Build for an iPhone

- `bun app install --target=<iphone>` fails when Xcode has no Apple account: the widget target needs the App Groups capability and its own profile
- Working path: `EXPO_PUBLIC_APP_VARIANT=preview bunx eas-cli build -p ios --local --profile preview --output <ipa>` (interactive; EAS syncs capabilities and creates the extension profile), then `xcrun devicectl device install app --device <id> <ipa>`

## Debug

- Settings > Development tools > Widgets shows the last sync result (`ok` or `failed: <why>`)
- `null` anywhere in props makes `updateTimeline` throw (`NSUserDefaults` rejects it) and leaves the widget blank. Test in [`__tests__/widgetData.ts`](../src/features/widget/__tests__/widgetData.ts) guards it
- Extension logs on a phone: `brew install libimobiledevice`, `idevicesyslog -u <udid> | grep -E "ExpoWidgets|PixyPreview\(React\)"`
