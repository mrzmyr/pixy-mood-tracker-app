# Pixy Design

One file for all Pixy design rules. Two parts:

- [App UI](#app-ui): components, copywriting, interactions, animations, layout, content, forms
- [Marketing assets](#marketing-assets): visual system for store screenshots, website pages, launch headers, social cards. Enough to build an asset.

Sources:

- App color source: [`src/constants/Colors`](src/constants/Colors/index.ts), mood scales in [`Scales.ts`](src/constants/Colors/Scales.ts)
- Facts and claims: [docs/app-facts.json](docs/app-facts.json)
- App icon: [docs/icon.png](docs/icon.png) (transparent background)

# App UI

- Use defined components, if you think a custom component is needed, ask the user to create a new component or create it right away but flag it

## Tag Color Selection

- Fixed palette: show swatches inline. One tap selects one color. Save commits changes; Cancel discards changes.
- This layout applies platform selection and accessibility guidance to Pixy's fixed palette. Neither platform mandates this exact grid.
- Apple: [color wells](https://developer.apple.com/design/human-interface-guidelines/color-wells) support color selection. [UI design tips](https://developer.apple.com/design/tips/) require targets at least 44 × 44 points.
- Android: [Material radio buttons](https://m3.material.io/components/radio-button/overview) represent one choice. [Accessibility defaults](https://developer.android.com/develop/ui/compose/accessibility/api-defaults) require targets at least 48 × 48 dp. Avoid overlapping targets.
- Layout follows native fixed-palette pickers (iOS Reminders list color, Google Keep note color): label outside (same style as Name label), swatches inside grouped card like settings rows.
- Grid columns spread across card width. 48 × 48 targets, 30-point dots. Targets never shrink; narrow screens get fewer columns.
- Selected color: check on dot, tinted with tag text shade (`colors.tags[color].text`), plus color name in label. Check and label carry selection, so selection never depends on hue alone.
- Keyboard focus: ring in text color.
- Screen readers receive localized color names, radio roles, checked state.
- Color names use English fallback when locale lacks translation. Palette values stay unchanged in storage.
- Create and Edit share [`ColorPicker`](src/features/tags/components/ColorPicker.tsx). Forms scroll when keyboard or larger text reduces space.

## Close Button

- Page close (modal, sheet, full-screen page): top right, use [`CloseButton`](src/components/CloseButton.tsx)
- Android full-screen dialogs: close top left, title after it (Material 3). Day view does this ([`Header`](src/features/calendar/screens/LogList/Header.tsx))
- Never build own close icon. Need other color on media: pass `color`
- Push-stack pages keep back arrow top left. Back is not close
- Form modals with Save keep text Cancel top left
- Card and toast dismiss icons are not page close

## Nested Scrolling

- Never put a sideways scroller inside a parent that scrolls sideways (pager, carousel). Android parent steals the swipe
- Day view is one vertical list of cards. Chip and photo rows inside cards scroll sideways ([`LogList`](src/features/calendar/screens/LogList/index.tsx))

## Toasts

- Call `showToast` ([`src/lib/toast.ts`](src/lib/toast.ts)), rendered by [`ToastHost`](src/components/Toast.tsx)
- iOS: card at top, swipe up dismisses
- Android: Material 3 snackbar at bottom above system bar, inverse surface, 4dp corners, 4s (8s with action), swipe down dismisses
- Optional `action` ({ label, onPress }) for Undo. Never the only way to do something
- Both platforms announce the message to screen readers

## Menu Rows

- Row component: [`MenuListItem`](src/components/MenuListItem.tsx)
- Title: short noun in Title Case, for example `Backup`. No sentence, no status in title
- Status (`On`, `Off`, last backup date) goes in value slot (`iconRight`). Empty value slot is fine
- Warnings and alerts are [`TextInfo`](src/components/TextInfo.tsx) under list, never a menu row
- One text color per row. No colored title or value for emphasis
- Exception: destructive rows use `colors.danger` for icon and title
- Title and value fit one line. Text too long: shorten text, never wrap or shrink font

## Surfaces

- Statistics cards and person tiles sit in a bezel: shell, gap, inner surface. Component: [`Bezel`](src/components/Bezel.tsx)
- Calendar days, mood buttons, day view and timeline cards, and list groups have no bezel
- Android list groups: Material 3 full-width list. No chevron, no dividers. Rows 56dp ([`MenuList`](src/components/MenuList.tsx), [`MenuListItem`](src/components/MenuListItem.tsx))
- Gaps and shell radius: [`src/constants/Bezel.ts`](src/constants/Bezel.ts). Shell radius comes from `getBezelRadius`, never picked by hand
- Colors: `bezelBackground`, `bezelBorder`, `bezelInnerBorder`, `bezelShadow`
- Person tiles build a round shell in [`PersonChip`](src/features/people/components/PersonChip.tsx). Selected tile: tint shell border

## Sheets and Modals

- Native presentation first: `Modal` with `presentationStyle="pageSheet"` and `animationType="slide"`. Pattern: [`useFeedbackModal`](src/features/feedback/hooks/useFeedbackModal.tsx)
- Never build custom slide-in sheet with Reanimated or `Animated`
- Never track keyboard by hand to move sheet. Inside sheet, `KeyboardAvoidingView` wraps content only
- Input fields sit at top of sheet, so keyboard never covers them

## Settings

- Prefer system settings over in-app setting, for example notifications, language, appearance
- Before adding in-app setting: check [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/settings), [Material](https://m3.material.io/) and 2-3 reference apps
- Cite this research (links, screenshots) in PR

## Copywriting

- Headings & buttons use Title Case (Chicago)
- Action-oriented language.
- **Error messages guide the exit.** Don’t just state what went wrong—tell the user how to fix it.
  - Instead of _“Invalid API key,”_ say _“Your API key is incorrect or expired. Generate a new key in your account settings.”_ The copy & buttons/links should educate & give a clear action.
- **Avoid ambiguity.** Labels are clear & specific.
  - Instead of the button label _“Continue”_ say _“Save API Key”_.

## Core Modules

- Term defined in [GLOSSARY.md](GLOSSARY.md). Each Core Module uses its icon everywhere: Steps settings, Check-in, filters, statistics
- Icons: `react-native-feather`, 20 px in lists, stroke `colors.text`
- Mood: `Sun` ([Steps settings](src/features/settings/screens/Steps.tsx))
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
- **Corner radius from scale.** Use `RADIUS` from [`src/constants/Radius.ts`](src/constants/Radius.ts). Pick step by role, not size. Nested surface radius never exceeds parent radius.
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

# Marketing assets

Structure: **principles, tokens, primitives, components, layouts, copy, reference implementation**. Inside phone screens, [App UI](#app-ui) rules and app source win.

## 1. Principles

- **Pixels are signature, not category.** Pixy is mood journal for self-care. Year in pixels is the visual proof inside that pitch.
- **Dark canvas, light type, mood colors carry meaning.** Color shows mood, never decoration. Brand accent is mint.
- **One claim per asset.** Headline states it. Phone or pixel grid proves it.
- **Real app wins inside phone.** Phone screens copy app source exactly: radius, colors, strings, gradients. Rules in this file apply outside phone.
- **Calm, not loud.** Big type, lots of space, one pop-out group per screen. No confetti, no gradient text, no emoji.
- **Rounded and soft.** Pixels, cards, pills rounded. Only phone and pop-outs cast shadow.
- **Hard days stay kind.** Never show sad faces. Never mirror bad rating in copy. Legends say "Good days" and "Hard days", not app labels like "Terrible".

## 2. Tokens

### Canvas

| Token             | Size (px) | Use                                |
| ----------------- | --------- | ---------------------------------- |
| `store-ios`       | 1290×2796 | App Store iPhone 6.9" screenshot   |
| `store-android`   | 1080×1920 | Google Play phone screenshot       |
| `feature-graphic` | 1024×500  | Google Play feature graphic        |
| `og`              | 1200×630  | Website link preview, social card  |
| `header-x`        | 1500×500  | X profile header                   |
| `header-linkedin` | 1584×396  | LinkedIn banner                    |
| `gallery`         | 1270×760  | Product Hunt gallery, launch posts |
| `web-desktop`     | 1440 wide | Website page                       |
| `web-mobile`      | 390 wide  | Website page, mobile check         |

- Image canvases: `margin = round(width × 0.06)` (store-ios 77, store-android 65, og 72, header-x 90).
- Web: content max width 1200, side padding `max(24px, (100vw − 1200px) / 2)`. Breakpoint 900.

### Color

Brand

| Token | Hex | Role |
| --- | --- | --- |
| `night` | `#0A0A0A` | default dark canvas |
| `night-2` | `#1C1C1E` | dark card, quote, surface box |
| `night-line` | `#3A3A3C` | 1px border on dark |
| `forest` | `#05392D` | alternative dark canvas |
| `paper` | `#FAFAFA` | light canvas |
| `paper-2` | `#F0F0F0` | light panel behind visuals |
| `white` | `#FFFFFF` | light card, pop-out |
| `ink` | `#0A0A0A` | text on light |
| `ink-2` | `#6B6B70` | body on light |
| `ink-3` | `#8A8A8E` | eyebrow, caption on light |
| `cream` | `#FFF7ED` | headline on forest |
| `fog` | `#A3A3A3` | body on night |
| `line` | `#E5E5E5` | 1px border on light |
| `mint` | `#34D399` | brand accent on dark: eyebrow, sub on forest, checks |
| `mint-deep` | `#059669` | mint fill on light (pixels, icon dot). Never text. |
| `mint-text` | `#047857` | mint text on light (≥ 4.5:1 on white) |
| `peach` | `#FDBA74` | icon dot, warm highlight |
| `peach-soft` | `#FFEDD5` | icon dot, warm surface |
| `tint` | `#007AFF` | app UI only (iOS system blue). Never marketing type. |

- Icon = 2×2 dots: `peach` top left, `mint` top right, `peach-soft` bottom left, `mint-deep` bottom right. Never recolor.
- Icon on dark canvas: dots directly on canvas, no tile. Icon on Paper: same. Clear space = 25% of icon size. Min size 32px.
- Tag dots: tag color name at shade 500 (Tailwind), list in [`Config.ts`](src/constants/Config.ts) `TAG_COLOR_NAMES`.

### Mood scale

Default scale `ColorBrew-RdYlGn`. Order best to worst.

| Rating           | App light | App dark  | Marketing on dark canvas          |
| ---------------- | --------- | --------- | --------------------------------- |
| `extremely_good` | `#059669` | `#059669` | `#059669`                         |
| `very_good`      | `#34D399` | `#34D399` | `#34D399`                         |
| `good`           | `#A7F3D0` | `#A7F3D0` | `#A7F3D0`                         |
| `neutral`        | `#E5E5E5` | `#F5F5F5` | `#737373`                         |
| `bad`            | `#FFEDD5` | `#FFEDD5` | `#FED7AA`                         |
| `very_bad`       | `#FDBA74` | `#FDBA74` | `#FDBA74`                         |
| `extremely_bad`  | `#EF4444` | `#EF4444` | `#EF4444`                         |
| `empty`          | `#F5F5F5` | `#262626` | Night `#1F1F1F`, Forest `#0B4A3B` |

- Inside phone: app light or app dark column. Outside phone on dark canvas: marketing column. Outside phone on Paper: app light, `empty` = `#EBEBEB`.
- Day number color inside phone: compute like [`Scales.ts`](src/constants/Colors/Scales.ts) `getScaleMood` (chroma luminance > 0.45: darken 2.5, else brighten 4).
- Other scales (`ColorBrew-PuOr`, `ColorBrew-BrBG`): copy hex values from `Scales.ts`. `neutral` differs per scale.
- `extremely_good` on `forest` has low contrast. Add 1px `rgba(255,247,237,.15)` inner ring on Forest pixels.

Mood data in marketing grids:

- ≥ 60% good side. ≤ 15% `very_bad` + `extremely_bad`. Some hard stretches of 2-4 days.
- Good weeks come in streaks. Weekends slightly better.
- 2-5% days missed (`empty`).
- Current year. Days after today = `empty`. Days that do not exist (Feb 30) = no cell.
- Use fixed seed so renders repeat.

### Themes

| Theme           | Canvas    | Headline | Sub     | Eyebrow     |
| --------------- | --------- | -------- | ------- | ----------- |
| Night (default) | `night`   | `white`  | `fog`   | `mint`      |
| Forest          | `forest`  | `cream`  | `mint`  | `mint`      |
| Paper           | `paper`   | `ink`    | `ink-2` | `mint-text` |
| Black (privacy) | `#000000` | `white`  | `fog`   | `mint`      |

- Store screenshot set: one theme for all screens, except privacy screen uses Black.
- Website page: one base theme. Privacy section may switch to Black.
- OG cards, headers: theme per page or campaign. Variants may differ.

### Type

- Marketing: **Geist** (fallback Inter, system-ui). Weights 400, 600, 700, 800. Mono: Geist Mono.
- App UI inside phone: system font. iOS `-apple-system` (SF Pro). Android Roboto. Never Geist inside phone.
- Pop-out = enlarged app UI = system font.
- Tracking: −0.03em at ≥ 64px, −0.01em at 32-63px, +0.08em on eyebrows.

Per canvas (size / line height, px):

| Style | Weight | store-ios | store-android | feature-graphic | og | header-x | header-linkedin | web desktop | web mobile |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `display` | 800 | 136/140 | 112/116 |  |  |  |  |  |  |
| `title` | 800 |  |  | 76/80 | 72/76 | 72/76 | 60/64 | 72/76 | 44/48 |
| `title-s` | 800 |  |  |  |  |  |  | 48/54 | 32/38 |
| `sub` | 400 | 54/68 | 44/56 | 38/48 | 28/36 | 28/36 | 24/32 |  |  |
| `lead` | 400 |  |  |  |  |  |  | 22/32 | 18/28 |
| `body` | 400 | 44/58 | 36/48 |  |  |  |  | 18/28 | 17/26 |
| `eyebrow` | 700 | 36/44 | 30/38 | 18/24 | 24/30 | 22/28 | 20/26 | 13/18 | 12/16 |
| `caption` | 400 | 30/40 | 26/34 |  | 18/24 | 18/24 | 16/22 | 14/20 | 13/18 |

- Store `body` = checklist items, surface box text.
- App `ui` inside phone: 17pt iOS, 16dp Android, at phone scale.

### Shape + space

| Token | Value |
| --- | --- |
| `r-xs / sm / md / lg / xl / full` | 6 / 8 / 12 / 16 / 22 / 999 |
| `r-pixel` | 15% of pixel size (app: 8pt on ~53pt cell) |
| `gap-pixel` | 12% of pixel size |
| `space` | 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 |
| `border` | 1px `line` (light), 1px `night-line` (dark) |
| `shadow-phone` | dark canvas `0 40px 80px rgba(0,0,0,.45)`, Paper `0 24px 48px rgba(0,0,0,.18)` |
| `shadow-pop` | `0 0 0 1px rgba(0,0,0,.06), 0 24px 44px rgba(0,0,0,.45)` |
| `glow` | radial ellipse, 1.1× phone width, centered at phone top third, `mint` 10-12% to transparent. Dark canvas only. |

## 3. Primitives

| Primitive | Props | Rule |
| --- | --- | --- |
| **Surface** | tone night-2 · paper-2 · white · black; radius; pad | Flat fill. Border only on white and night-2. |
| **Pixel** | rating, size, shape | Calendar pixel: rounded square, `r-pixel`. Year pixel: circle (matches app year in pixels). |
| **Phone** | platform ios · android, screen, tilt 0 · ±6° | See phone spec below. |
| **Text** | style, color from theme | See theme table. |

### Phone spec

| Part | iOS | Android |
| --- | --- | --- |
| Logical screen | 440×956 pt | 412×915 dp |
| Scale | `(phone width − 2 × bezel) / 440` | `(phone width − 2 × bezel) / 412` |
| Bezel | 2.2% of phone width | 2.2% of phone width |
| Outer radius | 14% of phone width | 11% of phone width |
| Frame | flat `#2C2C2E`, 1px outer ring `#48484A`, 1px inner ring `rgba(255,255,255,.18)` | same |
| Cutout | Dynamic Island 126×37 pt, top 11 pt, black | punch hole Ø 12 dp, top 12 dp, centered |
| Status bar | 9:41, full signal, Wi-Fi, full battery | 9:41, full signal, Wi-Fi, full battery |
| Home bar | 134×5 pt, bottom 8 pt | gesture bar 108×4 dp |

- Flat frame. No gradient, no reflections.
- Two phones overlapping: lower phone in front.
- Phone may show dark mode app on Night only with frame rings visible. Prefer light mode app on dark canvas.
- Real UI with emoji (calendar footnote): crop or omit that element.

## 4. Components

Rank emphasis: **pop-out > phone > pixel grid > text**. Max one pop-out group per screen.

| Component | Props | Spec |
| --- | --- | --- |
| **Eyebrow** | text | `eyebrow`, uppercase. 1-3 words. Optional on every layout. |
| **Headline** | text | `display` (store) or `title`. Left aligned. ≤ 3 lines. |
| **Sub** | text | `sub`, theme sub color, 24 below headline (store-ios 32). ≤ 2 lines. |
| **Pixel grid** | data, orientation | Year: 12 months × 31 days. Portrait canvas: months = columns. Landscape canvas: months = rows (31 columns). Month calendar: 7 columns. Min pixel 14px on og, 10px on feature-graphic. |
| **Grid labels** | months, weekdays | Optional. Month initials `caption` at 60% opacity, Geist 600. |
| **Pop-out** | kind pill · chips · card | Real app component, enlarged 1.6× phone scale. Ring and border scale too. Tilt exactly −4° or +4°, alternate. Covers ≤ 25% of phone screen. Covers whole cells, never half a label. `shadow-pop`. |
| **Emotion (app)** | label, mood | App basic emotion button: full cell width, radius 8, 8pt dot (very_good, neutral or very_bad scale color), selected = 2px `tint` border. No icons. Source: `src/features/logger`. |
| **Tag chip (app)** | label, color | App chip: 17pt, radius 8, tag dot. Source: `src/features/tags`. |
| **Surface box** | heading, body, visual? | `night-2`, 1px `night-line`, `r-xl`, pad 64 (store) or 32 (web). Heading `body` 600 white, body `caption` `fog`. |
| **Checklist** | items | Mint check SVG, 1em, stroke 2.5, round caps. Text `body`. Gap 24 (store) or 16 (web). Item ≤ 32 characters, sentence case, no period. |
| **Quote** | text, source | `night-2`, `r-xl`, pad 32. Real public review only, see copy rules. |
| **Listed on** | names | "Listed on" + names as text, 65% opacity, 1px dividers. No logos. |
| **Store badges** | ios, android | Official artwork only: Apple Marketing Resources, Google Play badge generator. Black. Height 56 desktop, 48 mobile. Prototypes may use labelled placeholder, mark it. |
| **Feature card** | eyebrow, title, body, visual | Web. `night-2` on Night, `white` + 1px `line` on Paper. `r-xl`, pad 32. Visual panel top, 220 high, `night` or `paper-2`. |
| **Button** | label | Web CTA. `white` fill on dark, `ink` on Paper. `r-full`, pad 16×28, Geist 600. Label = action. |
| **Nav** | icon, name, links | Web. 72 high. Icon 32, name Geist 600 18. 3-4 links `fog` (dark) or `ink-2` (Paper). One Button right. |
| **Link** | text | Web. Underline on hover. Focus = 2px `mint` outline, offset 2. |

## 5. Layouts

Layouts define regions. Any component fits any content region.

| Layout | Canvas | Regions | Constraints |
| --- | --- | --- | --- |
| **Store hero** | store-* | eyebrow · headline · sub? · phone bleeding off bottom | First screen. Eyebrow = positioning ("Mood journal"). |
| **Store feature** | store-* | eyebrow? · headline · sub · phone · pop-out over phone edge | One feature per screen. Pop-out never covers headline. |
| **Store duo** | store-* | eyebrow? · headline · sub · 2 phones | Two related views. Second phone starts 220 lower (store-ios). |
| **Store privacy** | store-* | Black · eyebrow? · headline · surface box · checklist · caption? | No phone, no lock icon. Box may hold month pixel grid. |
| **Feature graphic** | feature-graphic | icon + name + line left · landscape year grid right | Line ≤ 6 words, name not counted. Content inside center 924×400. Group may be centered. |
| **Launch header** | header-x, header-linkedin, gallery | eyebrow · headline · sub left · tilted phone or grid right · pop-out? | See header safe zones. |
| **Social card** | og | eyebrow · title ≤ 2 lines · icon + name bottom left · visual right 30-35% width | Visual may bleed top, right, bottom. Readable at 400 wide. |
| **Web hero** | web-desktop | nav · eyebrow · title · lead · badges (left 6 cols) · phone or grid (right 6 cols) | 12 col grid, gutter 24. Mobile: stack, visual below. |
| **Web feature** | web-desktop | title-s · 3×2 feature cards, or alternating text/visual rows | ≤ 6 features per section. Mobile: 1 column. |
| **Web privacy** | web-desktop | Black section · title-s · checklist · source link · analytics caption | Claims from `claims` only. |
| **Web footer** | web-desktop | icon + name · links · "Open source, MIT" · badges | Links from app-facts `identity.links`. |

Web section padding: 128 top and bottom desktop, 80 mobile.

### Store flow (store-ios, 1290×2796)

Regions stack top to bottom. Positions follow content height, not fixed y.

| Region | left | top | width |
| --- | --- | --- | --- |
| eyebrow | 77 | 190 | 1136 |
| headline | 77 | eyebrow bottom + 16 (no eyebrow: 190) | 1136 |
| sub | 77 | headline bottom + 32 | 1136 |
| phone single | 195 | text bottom + 140 | 900 |
| phone duo | 50 and 610 | text bottom + 140, second + 220 | 630 each |
| surface box (privacy) | 77 | text bottom + 96 | 1136 |
| checklist (privacy) | 77 | box bottom + 96 | 1136 |

- Phones always bleed bottom. Phone height = width × 2.07. Raise phone or widen it until bottom edge passes y 2796.
- Text bottom = sub bottom, or headline bottom when no sub.

### Store flow (store-android, 1080×1920)

| Region       | left       | top                                   | width    |
| ------------ | ---------- | ------------------------------------- | -------- |
| eyebrow      | 65         | 120                                   | 950      |
| headline     | 65         | eyebrow bottom + 12 (no eyebrow: 120) | 950      |
| sub          | 65         | headline bottom + 24                  | 950      |
| phone single | 190        | text bottom + 100                     | 700      |
| phone duo    | 40 and 560 | text bottom + 100, second + 160       | 480 each |

Android phone height = width × 2.22. Bleed rule same as iOS.

### Header safe zones

- X: profile photo covers bottom left, x 0-420, y 290-500 (desktop). Mobile crops ~60px top and bottom. Text inside x 90-1410, y 60-300.
- LinkedIn: profile photo covers left, x 0-560, y 200-396. Text inside x 600-1500 or above y 200. Prefer text right of 600.
- Gallery: no overlay. Margin 76.
- Headline ≤ 50% of width. If headline does not fit 2 lines, shorten copy. Do not shrink below table size.

## 6. Copy rules

- **Claim only what ships.** Features need `status: available` in app-facts. Free, no ads, no account, local, open source: `claims`.
- **Counts from source.** Verify every number in source before use. Emotions: 72 enabled of 161 defined, claim 72. Source and app-facts disagree: omit number, report mismatch.
- **No proof numbers without source.** Ratings, downloads, review quotes need public store source and maintainer approval.
- **Analytics disclosure.** App has anonymous usage analytics and crash reports. Never write "no tracking" or "no data collected". Privacy assets on web add caption disclosing analytics. Store privacy screen may add it.
- **Release copy.** Format "Pixy 1.88.0". Version in stores (`releases.store`): "Now on App Store and Google Play" + badges. Version only in source: "Out now on GitHub", no badges, no store names.
- Headline sentence case, ≤ 28 characters per line, ≤ 3 lines. Period allowed on statements ("Name what you feel.").
- Sub: one sentence, ≤ 60 characters.
- App strings inside phone: exact from `assets/locales/en.json`. Never recase.
- Pitch: "See what shapes how you feel". Eyebrow on hero: "Mood journal".
- People: "connected", never "together" or "spent time with".
- Use `…` not `...`, curly quotes, no em dashes.
- Brand names exact: "Pixy", "Pixy Mood Tracker", "App Store", "Google Play", "GitHub".

## 7. Choosing a layout

| Asset must… | Layout | Typical content |
| --- | --- | --- |
| open store set | Store hero | "Mood journal" + pitch + calendar phone |
| show one feature | Store feature | logger step phone + emotion pop-out |
| compare two views | Store duo | logger + calendar, light + dark scale |
| state privacy | Store privacy | surface box + checklist |
| headline store page | Feature graphic | icon + name + landscape year grid |
| announce release | Launch header | release headline + tilted phone + entry pop-out |
| preview link | Social card | page title + bleeding year grid |
| land web visitor | Web hero | title + badges + phone |

**Do**

- Real dates in current year inside app UI. Today = render date.
- Scroll app screens to show complete months. Hide half-cut buttons at phone bottom.
- Pick selected emotions from enabled list in `src/features/logger/config.ts`.
- Use light mode app on dark canvas.

**Don't**

- No shadows on text, canvas cards, or pixels.
- No gradients outside phone, except `glow`.
- No stock photos of sad people. No brain or heart illustrations.
- No decorative icons. Allowed: brand icon, checklist checks, store badges, app icons inside phone.
- No Geist inside phone. No `tint` on marketing type.
- No features with status `unavailable`, `removed`, `legacy`: no AI, widgets, watch, cloud sync, streaks, app lock, sleep tracking.

## 8. Reference implementation

Font:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700;800&family=Geist+Mono:wght@400&family=Roboto:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

CSS tokens and primitives:

```css
:root {
  --night: #0a0a0a;
  --night-2: #1c1c1e;
  --night-line: #3a3a3c;
  --forest: #05392d;
  --paper: #fafafa;
  --paper-2: #f0f0f0;
  --white: #fff;
  --ink: #0a0a0a;
  --ink-2: #6b6b70;
  --ink-3: #8a8a8e;
  --cream: #fff7ed;
  --fog: #a3a3a3;
  --line: #e5e5e5;
  --mint: #34d399;
  --mint-deep: #059669;
  --mint-text: #047857;
  --peach: #fdba74;
  --peach-soft: #ffedd5;
  --tint: #007aff;
  /* mood scale, app light */
  --m6: #059669;
  --m5: #34d399;
  --m4: #a7f3d0;
  --m3: #e5e5e5;
  --m2: #ffedd5;
  --m1: #fdba74;
  --m0: #ef4444;
  --m-empty: #f5f5f5;
  --font: "Geist", Inter, system-ui, sans-serif;
  --mono: "Geist Mono", ui-monospace, Menlo, monospace;
  --ui: -apple-system, "SF Pro Text", system-ui, sans-serif;
  --ui-android: Roboto, system-ui, sans-serif;
  --shadow-phone: 0 40px 80px rgba(0, 0, 0, 0.45);
  --shadow-pop: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 24px 44px rgba(0, 0, 0, 0.45);
}
/* marketing pixels outside phone on dark canvas */
.on-dark {
  --m3: #737373;
  --m2: #fed7aa;
  --m-empty: #1f1f1f;
}
.theme-forest.on-dark,
.theme-forest .on-dark {
  --m-empty: #0b4a3b;
}
.theme-paper {
  --m-empty: #ebebeb;
  --shadow-phone: 0 24px 48px rgba(0, 0, 0, 0.18);
}

.theme-night {
  background: var(--night);
  color: var(--white);
}
.theme-night .sub {
  color: var(--fog);
}
.theme-night .eyebrow {
  color: var(--mint);
}
.theme-forest {
  background: var(--forest);
  color: var(--cream);
}
.theme-forest .sub,
.theme-forest .eyebrow {
  color: var(--mint);
}
.theme-paper {
  background: var(--paper);
  color: var(--ink);
}
.theme-paper .sub {
  color: var(--ink-2);
}
.theme-paper .eyebrow {
  color: var(--mint-text);
}
.theme-black {
  background: #000;
  color: var(--white);
}
.theme-black .sub {
  color: var(--fog);
}
.theme-black .eyebrow {
  color: var(--mint);
}

/* store-ios sizes */
.eyebrow {
  font: 700 36px/44px var(--font);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.display {
  font: 800 136px/140px var(--font);
  letter-spacing: -0.03em;
}
.sub {
  font: 400 54px/68px var(--font);
  letter-spacing: -0.01em;
}

/* pixels: set --s for size */
.px {
  width: var(--s);
  height: var(--s);
  border-radius: calc(var(--s) * 0.15);
  background: var(--m-empty);
}
.px.year {
  border-radius: 50%;
}
.px-grid {
  display: grid;
  gap: calc(var(--s) * 0.12);
}
.r6 {
  background: var(--m6);
}
.r5 {
  background: var(--m5);
}
.r4 {
  background: var(--m4);
}
.r3 {
  background: var(--m3);
}
.r2 {
  background: var(--m2);
}
.r1 {
  background: var(--m1);
}
.r0 {
  background: var(--m0);
}

/* phone: set --w for phone width */
.phone {
  width: var(--w);
  aspect-ratio: 1/2.07;
  padding: calc(var(--w) * 0.022);
  border-radius: calc(var(--w) * 0.14);
  background: #2c2c2e;
  box-shadow:
    0 0 0 1px #48484a,
    inset 0 0 0 1px rgba(255, 255, 255, 0.18),
    var(--shadow-phone);
}
.phone .screen {
  width: 440px;
  height: 956px;
  transform-origin: 0 0;
  transform: scale(calc((var(--w) * 0.956) / 440px));
  border-radius: calc(var(--w) * 0.12);
  overflow: hidden;
}
/* calc() division by length is not supported in all browsers: compute scale in JS if needed */

.glow {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    rgba(52, 211, 153, 0.12),
    transparent
  );
}
.pop {
  background: #fff;
  border-radius: 22px;
  box-shadow: var(--shadow-pop);
  color: #111;
  font-family: var(--ui);
}
```

Render PNG at exact canvas size with headless Chrome:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --window-size=1290,2796 --virtual-time-budget=5000 --screenshot=out.png file://$PWD/asset.html
```

- Headless Chrome minimum viewport is 500 wide. Render `web-mobile` through 390-wide iframe wrapper plus `--allow-file-access-from-files`.
- Check size: `sips -g pixelWidth -g pixelHeight out.png`.
