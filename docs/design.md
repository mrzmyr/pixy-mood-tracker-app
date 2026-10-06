# Design

- Use defined components, if you think a custom component is needed, ask the user to create a new component or create it right away but flag it

## Close Button

- Page close (modal, sheet, full-screen page): top right, use [`CloseButton`](../src/components/CloseButton.tsx)
- Never build own close icon. Need other color on media: pass `color`
- Push-stack pages keep back arrow top left. Back is not close
- Form modals with Save keep text Cancel top left
- Card and toast dismiss icons are not page close

## Menu Rows

- Row component: [`MenuListItem`](../src/components/MenuListItem.tsx)
- Title: short noun in Title Case, for example `Backup`. No sentence, no status in title
- Status (`On`, `Off`, last backup date) goes in value slot (`iconRight`). Empty value slot is fine
- Warnings and alerts are [`TextInfo`](../src/components/TextInfo.tsx) under list, never a menu row
- One text color per row. No colored title or value for emphasis
- Title and value fit one line. Text too long: shorten text, never wrap or shrink font

## Surfaces

- Cards, list groups, calendar days, and mood buttons sit in a bezel: shell, gap, inner surface. Component: [`Bezel`](../src/components/Bezel.tsx)
- Gaps and shell radius: [`src/constants/Bezel.ts`](../src/constants/Bezel.ts). Shell radius comes from `getBezelRadius`, never picked by hand
- Colors: `bezelBackground`, `bezelBorder`, `bezelInnerBorder`, `bezelShadow`
- Calendar days build the shell in [`CalendarDay`](../src/features/calendar/screens/Calendar/CalendarDay/index.tsx). Future and filtered-out days have no shell
- Mood buttons build the shell in [`SlideMoodButton`](../src/features/logger/components/SlideMoodButton.tsx). Colored inner surfaces get `getBezelEdgeColor`
- Person tiles build a round shell in [`PersonChip`](../src/features/people/components/PersonChip.tsx). Selected tile: tint shell border

## Sheets and Modals

- Native presentation first: `Modal` with `presentationStyle="pageSheet"` and `animationType="slide"`. Pattern: [`useFeedbackModal`](../src/features/feedback/hooks/useFeedbackModal.tsx)
- Never build custom slide-in sheet with Reanimated or `Animated`
- Never track keyboard by hand to move sheet. Inside sheet, `KeyboardAvoidingView` wraps content only
- Input fields sit at top of sheet, so keyboard never covers them

## Settings

- Prefer system settings over in-app setting, for example notifications, language, appearance
- Before adding in-app setting: check [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/settings), [Material](https://m3.material.io/) and 2-3 reference apps
- Cite this research (links, screenshots) in PR

# Copywriting

- Headings & buttons use Title Case (Chicago)
- Action-oriented language.
- **Error messages guide the exit.** Don’t just state what went wrong—tell the user how to fix it.
  - Instead of _“Invalid API key,”_ say _“Your API key is incorrect or expired. Generate a new key in your account settings.”_ The copy & buttons/links should educate & give a clear action.
- **Avoid ambiguity.** Labels are clear & specific.
  - Instead of the button label _“Continue”_ say _“Save API Key”_.

## Core Modules

- Term defined in [GLOSSARY.md](../GLOSSARY.md). Each Core Module uses its icon everywhere: Steps settings, Check-in, filters, statistics
- Icons: `react-native-feather`, 20 px in lists, stroke `colors.text`
- Mood: `Sun` ([Steps settings](../src/features/settings/screens/Steps.tsx))
- Emotions: `Heart`
- Tags: `Tag`
- People: `Users`
- Photos: `Image`
- Note: `FileText`
- Labels: Mood, Emotions, Tags, People, Photos, Note. Single noun, no verb ("Note", not "Write About Your Day")

## Interactions

- **Screen reader + keyboard work everywhere.** All flows operable with VoiceOver/TalkBack and hardware keyboards (iPad, Android w/ keyboard). Every interactive element has `accessibilityRole`, `accessibilityLabel`, `accessibilityState`. Use `Pressable`, never bare `View` + `onTouchEnd`.
- **Clear focus.** Hardware-keyboard focus visible: style via `onFocus`/`onBlur` state or `focusable` + a ring. On tvOS/Android TV, focus is the primary navigation; never hide it. Sticky headers, tab bars, bottom sheets, toasts never cover the focused element.
- **Manage focus.** After modal/sheet open: `AccessibilityInfo.setAccessibilityFocus(reactTag)` (or `findNodeHandle`) onto the first meaningful element; on close, return focus to the trigger. Use `accessibilityViewIsModal` (iOS) / `importantForAccessibility="no-hide-descendants"` (Android) to trap screen-reader focus inside modals.
- **Match visual & hit targets.** Minimum 44×44 pt (iOS HIG) / 48×48 dp (Material). Visual smaller than that → expand via `hitSlop`. Never leave a tappable icon at 24 pt with no `hitSlop`.
- **Respect font scaling.** Don't set `allowFontScaling={false}` except where layout truly breaks; use `maxFontSizeMultiplier` instead of disabling. Test at 200% Dynamic Type / Android largest font.
- **No state loss on remount.** Inputs keep focus & value across navigation, keyboard show/hide, and Fast Refresh. Hoist state out of components that unmount (e.g. tab screens with `unmountOnBlur`).
- **Don't block paste.** Never set `contextMenuHidden` on `TextInput` without a security reason. Allow paste of OTP codes.
- **Loading buttons.** Show `ActivityIndicator` inline & keep the label; set `accessibilityState={{busy: true}}`; disable only the in-flight action.
- **Minimum loading-state duration.** Delay spinner/skeleton ~150–300 ms & keep visible ≥300–500 ms. `<Suspense>` doesn't guarantee this in RN — implement with a timer or a `useDelayedLoading` hook.
- **Navigation state as URL.** Every screen has a deep link (`linking` config in React Navigation / file routes in Expo Router). Filters, tabs, selected item, expanded panel live in route params, not local `useState`, so share / universal links / state restoration work.
- **Optimistic updates.** Mutate UI immediately when success is likely; reconcile on response. On failure: error toast + rollback or Undo.
- **Ellipsis for further input & loading states.** "Rename…", "Saving…", "Generating…" — menu items that open a follow-up and in-flight states end with `…`.
- **Confirm destructive actions.** `Alert.alert` with destructive style (iOS `style: 'destructive'`) or an Undo snackbar with a safe window (~5 s).
- **Press feedback follows design.** Set `android_ripple` on `Pressable` (or `android_disableSound` when silent); on iOS style the pressed state via the `({pressed})` style function. Don't leave default `TouchableOpacity` fade where the design calls for something else.
- **Design forgiving interactions.** Generous hit targets, clear affordances, predictable results. Swipe-to-dismiss & pan gestures use velocity + distance thresholds, not just distance.
- **Tooltip equivalent.** RN has no native tooltip; use long-press hints only as a last resort, prefer inline help. If using a popover, delay the first, no delay for subsequent peers.
- **Overscroll behavior.** `bounces={false}` / `overScrollMode="never"` only when intentional (e.g. nested scroll inside a bottom sheet). Keep native bounce on primary lists — users expect it.
- **Scroll positions persist.** Going Back restores list offset: keep screens mounted in stacks, or persist `contentOffset` and restore via `scrollToOffset` on focus.
- **Autofocus for speed.** `autoFocus` on a screen with a single primary input (search, OTP, compose). Watch keyboard-driven layout shift; pair with `KeyboardAvoidingView` / `react-native-keyboard-controller`. In sheets, follow [Sheets and Modals](#sheets-and-modals).
- **No dead zones.** If a card/row looks tappable, the whole row is the `Pressable`, not just the text.
- **Deep-link everything.** Any `useState` that represents navigable state belongs in route params or a URL-backed store.
- **Clean drag interactions.** During drag (Reanimated + Gesture Handler): disable text selection (`selectable={false}`), set `pointerEvents="none"` on siblings, raise `zIndex`/`elevation`, and run the animation on the UI thread.
- **Gestures have alternatives.** Every swipe, drag, pinch, or long-press has a visible button / menu / accessibility action (`accessibilityActions` + `onAccessibilityAction`) equivalent unless the gesture is essential.
- **Links are links.** Navigation uses `Link` (Expo Router / React Navigation) or `Linking.openURL`; set `accessibilityRole="link"` for external, `"button"` for in-app actions. On web target (RN Web) that renders a real `<a>` so Cmd-click works.
- **Announce async updates.** `AccessibilityInfo.announceForAccessibility()` for toasts & inline validation; `accessibilityLiveRegion="polite"` on Android containers.
- **Platform-aware shortcuts.** Hardware-keyboard shortcuts via `react-native-key-command` / UIKeyCommand; show ⌘ on iOS/macOS, Ctrl on Android/Windows; respect non-QWERTY layouts.
- **Haptics with intent.** Use `expo-haptics` / `react-native-haptic-feedback` for confirmations, errors, selection changes; never on every tap; respect system haptic settings.

## Animations

- **Honor reduce motion.** Read `AccessibilityInfo.isReduceMotionEnabled()` / `useReducedMotion()` (Reanimated) and provide a reduced variant: cross-fade instead of slide, no parallax, no autoplay loops.
- **Implementation preference.** UI-thread only. Preference: Reanimated (worklets) > `Animated` with `useNativeDriver: true` > JS-thread animation (`useNativeDriver: false`, `setInterval`, `requestAnimationFrame` loops). Never animate on the JS thread when the bridge/JSI is busy — frames drop with every state update.
- **Compositor-friendly.** Animate `transform` & `opacity`. Width/height/margin/padding/`top`/`left` trigger layout (Yoga) each frame — avoid, or use Reanimated layout transitions / shared element transitions that handle it natively.
- **Necessity check.** Animate only to clarify cause & effect (where did the sheet come from, what moved) or for deliberate delight. Default RN screen transitions already cover most cases.
- **Easing fits the subject.** Springs (`withSpring`) for gestures & physical motion; `withTiming` + ease-out for enter, ease-in for exit; match platform (iOS springs, Material emphasized curves).
- **Interruptible.** Gesture-driven animations are cancelable & redirectable mid-flight (`cancelAnimation`, gesture + `withDecay`); user input always wins over a running animation.
- **Input-driven.** No autoplay except muted, non-essential loops. Auto-playing motion > 5 s alongside other content gets pause/stop/hide controls (WCAG 2.2.2 applies on mobile too).
- **Correct transform origin.** RN transforms originate at center; for scale-from-corner or anchor-at-touch-point, translate before/after scaling or use Reanimated's `transformOrigin` (0.72+ / RN 0.74 style prop).
- **Never animate everything.** Only pass the properties you intend to animate to `useAnimatedStyle` / `Animated.View`; don't spread whole style objects into animated values.
- **Cross-platform SVG transforms.** With `react-native-svg`, animate a wrapping `<G>` via `AnimatedProps` (Reanimated `createAnimatedComponent`) and set `origin` / `originX` explicitly; Android and iOS disagree on default origin.
- **No `LayoutAnimation`.** `configureNext` is global: it animates every pending layout change, including screen teardown, and crashed Fabric on close ([#610](https://github.com/mrzmyr/pixy-mood-tracker-app/pull/610)). Use Reanimated `entering`/`exiting`/`layout` props. Lint rule `pixy-standards/no-layout-animation` blocks it in `src/**`.
- **60/120 fps aware.** Test on ProMotion & high-refresh Android; durations in ms, not frames. Profile with the Perf Monitor & Reanimated's `useFrameCallback` only when needed.

## Layout

- **Optical alignment.** Adjust ±1 pt when perception beats geometry (icon next to text, badge on avatar). Use `StyleSheet.hairlineWidth` for 1-px lines across densities.
- **Swap keeps size.** Replacing a component's implementation keeps its measured width, height, and padding. Measure before and after.
- **Narrowest spacing scope.** Spacing request for one element changes that element only, not shared component or theme token.
- **Deliberate alignment.** Every element aligns to a grid, baseline, edge, or optical center. No accidental positioning; no magic numbers without a token.
- **Corner radius from scale.** Use `RADIUS` from [`src/constants/Radius.ts`](../src/constants/Radius.ts). Pick step by role, not size. Nested surface radius never exceeds parent radius.
- **Balance contrast in lockups.** When icon & text sit together, match stroke weight to font weight; `lucide-react-native` / `expo-symbols` stroke width adjusted, not default.
- **Responsive coverage.** Verify on small phone (iPhone SE / 360 dp Android), large phone, tablet (split view & multitasking), foldables (`useWindowDimensions`, not `Dimensions.get` at module scope), landscape, and RN Web if targeted. Breakpoints by width, not by `Platform.isPad`.
- **Respect safe areas.** `react-native-safe-area-context` (`SafeAreaView` or `useSafeAreaInsets`) for notch, Dynamic Island, home indicator, Android gesture nav & status bar. Never hardcode 44/20 pt. Account for `edge-to-edge` on Android 15+ (`react-native-edge-to-edge`).
- **Keyboard is layout.** Content above the keyboard stays reachable: `KeyboardAvoidingView` (behavior per platform) or `react-native-keyboard-controller`; scroll the focused input into view; `keyboardShouldPersistTaps="handled"` so taps on buttons don't require a keyboard dismiss first. Never move views by hand from keyboard events.
- **No excessive scroll indicators.** Show indicators only on real scroll areas; fix overflow (unbounded `ScrollView` inside `ScrollView`, `flex: 1` missing) instead of hiding with `showsVerticalScrollIndicator={false}`.
- **Let Yoga size things.** Prefer flex, `gap`, `aspectRatio`, percentage & intrinsic sizing over `onLayout` measuring. Measure in JS only when truly needed (anchored popovers), and never in a render loop.
- **Lists are virtualized.** Any list > ~20 items uses `FlatList` / `FlashList` / `LegendList` with stable `keyExtractor`, `getItemLayout` or `estimatedItemSize`, and memoized rows. Never map a long array inside `ScrollView`.
- **Status bar is part of layout.** Set `StatusBar` style per screen (light/dark content) and translucency explicitly on Android; header colors must meet contrast with status-bar icons.
- **Tab bar & header heights are not constants.** Read from `useBottomTabBarHeight()` / `useHeaderHeight()` when positioning floating elements (FAB, snackbars).

## Content

- **Inline help first.** Prefer inline explanations & helper text under fields; no native tooltip exists, so popovers/long-press hints are a last resort.
- **Stable skeletons.** Skeletons mirror final content exactly (same heights, same row count) to avoid layout jump when data lands; use `estimatedItemSize` that matches real rows.
- **Accurate screen titles.** Navigation header title reflects current context; on RN Web also set `document.title` via `Head` / navigation `title` option.
- **No dead ends.** Every screen offers a next step or recovery path: empty states with a CTA, error states with Retry, offline state with cached content.
- **All states designed.** Empty, sparse, dense, error, offline, loading, permission-denied (camera, location, notifications).
- **Typographic quotes.** Curly quotes (“ ”) over straight (" "). Apostrophes `’` not `'`.
- **Avoid widows/orphans.** Tidy line breaks; use `numberOfLines` + `ellipsizeMode` deliberately; `adjustsFontSizeToFit` only for single-line labels.
- **Tabular numbers for comparisons.** `fontVariant: ['tabular-nums']` on prices, timers, counters, tables, or a mono font (SF Mono, Roboto Mono, Geist Mono).
- **Redundant status cues.** Never color alone; pair with text/icon (`accessibilityLabel` includes the status word).
- **Icons have labels.** Every meaningful icon carries text or an `accessibilityLabel`; decorative icons get `accessibilityElementsHidden` / `importantForAccessibility="no"`.
- **Don’t ship the schema.** Visual layouts may omit labels; accessibility tree still has names: group rows with `accessible={true}` so a list item reads as one element, not five.
- **Use the ellipsis character.** `…` over `...`.
- **Anchored sections.** For in-screen jump links, use `scrollTo` with an offset that clears sticky headers; on RN Web set `scroll-margin-top`.
- **Resilient to user-generated content.** Layouts handle short, average & very long content; test with long names, RTL (`I18nManager.isRTL`), and emoji-only strings.
- **Locale-aware formats.** `Intl.NumberFormat` / `Intl.DateTimeFormat` (Hermes supports Intl since 0.70+) or `date-fns` with the device locale; never hand-format dates or currencies.
- **Prefer language settings over location.** Use `expo-localization` / `react-native-localize` `getLocales()`; never infer language from GPS/IP. Respect per-app language settings (iOS 13+, Android 13+).
- **Shield verbatim content from translation.** Brand & product names, code tokens, IDs are excluded from i18n keys and never passed through machine translation.
- **Accessible content.** Set `accessibilityLabel`, `accessibilityHint`, `accessibilityRole`; hide decoration; verify with Accessibility Inspector (Xcode) and TalkBack / Accessibility Scanner (Android).
- **Icon-only buttons are named.** Descriptive `accessibilityLabel` (“Close”, “Add to cart”), not “button” or the icon name.
- **Semantics before ARIA.** Native components first (`Pressable`, `Switch`, `TextInput`, `Text` with `role`); RN 0.73+ supports `role` and `aria-*` props — use them where they map cleanly, `accessibility*` props where they don’t.
- **Headings & skip.** Mark screen titles & section headers with `accessibilityRole="header"` so screen-reader users can jump by heading (rotor / TalkBack headings navigation).
- **Accessible media.** Captions for video (`expo-video` / `react-native-video` text tracks), transcripts for audio, `accessibilityLabel` on images conveying meaning; decorative media hidden; controls keyboard & screen-reader operable.
- **Non-breaking spaces for glued terms.** `\u00A0` to keep units, shortcuts & names together: `10\u00A0MB`, `⌘\u00A0+\u00A0K`, `Expo\u00A0SDK`. `\u2060` for no space.
- **Dark mode is a first-class state.** Every color from `useColorScheme()`-aware tokens; test images, shadows & borders in both schemes; set `userInterfaceStyle` in app config.
- **Dynamic Type & bold text.** Test at largest accessibility sizes and with iOS Bold Text / Android bold font; layouts reflow, never clip.

## Forms

- **Return key submits or advances.** `returnKeyType="next"` + `onSubmitEditing` focusing the next field (`ref.focus()`), `blurOnSubmit={false}` (or `submitBehavior="submit"` on 0.76+) between fields; last field `returnKeyType="done"` / `"go"` / `"search"` and submits.
- **Multiline behavior.** In `multiline` `TextInput`, Return inserts a newline; submit via an explicit button. On hardware keyboards ⌘/⌃+Return submits.
- **Labels everywhere.** Visible `Text` label above each field + `accessibilityLabel` on the input (placeholders are not labels). Use `nativeID` + `accessibilityLabelledBy` (Android) to link label and field.
- **Label activation.** Tapping the label focuses the input: wrap label + input in one `Pressable` that calls `inputRef.focus()`.
- **Submission rule.** Keep submit enabled until submission starts; then disable, show `ActivityIndicator` with label kept, send an idempotency key, and re-enable on error.
- **Don’t block typing.** Allow any input even in numeric fields; validate and show feedback. Don’t filter keystrokes in `onChangeText` silently.
- **Don’t pre-disable submit.** Submitting an incomplete form surfaces validation; a greyed-out button with no explanation is a dead end.
- **No dead zones on controls.** Checkbox/radio/switch row: whole row (label + control) is one `Pressable` with the role & state on the row.
- **Error placement.** Errors inline under their field, `accessibilityLiveRegion="polite"` / `announceForAccessibility`; on submit, scroll to & focus the first error.
- **Autofill & names.** Set `autoComplete` (`"email"`, `"tel"`, `"password"`, `"one-time-code"`, `"cc-number"`, `"postal-code"`…) and iOS `textContentType` so iCloud Keychain / Google autofill work.
- **Spellcheck & autocorrect selectively.** `autoCorrect={false}`, `spellCheck={false}`, `autoCapitalize="none"` for emails, codes, usernames, URLs.
- **Correct keyboard types & input modes.** `keyboardType` (`email-address`, `phone-pad`, `number-pad`, `decimal-pad`, `url`) and `inputMode`; `secureTextEntry` for passwords; `enablesReturnKeyAutomatically` where it helps.
- **Placeholders signal emptiness.** End with an ellipsis; set `placeholderTextColor` explicitly (defaults differ per platform & scheme).
- **Placeholder value.** Example value or pattern, e.g. `+49 40 123456…`, `sk-012345679…`.
- **Unsaved changes.** Warn before leaving: `usePreventRemove` / `beforeRemove` listener (React Navigation) with a confirm alert; also handle Android hardware back.
- **Password managers & 2FA.** `textContentType="oneTimeCode"` + `autoComplete="sms-otp"` for OTP so codes auto-fill from SMS; never block paste; support `newPassword` / `password` content types for keychain save.
- **Don’t trigger password managers for non-auth fields.** Search fields get `autoComplete="off"`, `textContentType="none"`, never `secureTextEntry` for non-passwords.
- **Text replacements & expansions.** Dictation and keyboard shortcuts can add trailing whitespace; trim on validate/submit so the error isn’t confusing.
- **Keyboard dismissal.** Tapping outside dismisses (`keyboardShouldPersistTaps="handled"` + `Keyboard.dismiss()` on background press); `keyboardDismissMode="interactive"` (iOS) / `"on-drag"` on scrolling forms.
- **Native pickers.** Dates, times, selects use platform pickers (`@react-native-community/datetimepicker`, `ActionSheetIOS` / bottom sheet, `Picker`) rather than custom lists; style their background & text explicitly in dark mode on Android.
- **Input font size.** Keep inputs ≥ 16 on RN Web to avoid iOS Safari zoom; native has no zoom issue but respect Dynamic Type.
