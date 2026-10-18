# Pixy Design

Pixy-specific design rules only. Platform guidelines (Apple HIG, Material 3, WCAG) apply everywhere else.

- [App UI](#app-ui): components and rules for screens in the app
- [Marketing assets](#marketing-assets): store screenshots, website, launch headers, social cards
- Colors: [`src/constants/colors`](src/constants/colors/index.ts), mood scales in [`scales.ts`](src/constants/colors/scales.ts)
- Facts and claims: [docs/app-facts.json](docs/app-facts.json)

# App UI

- Use existing components. Need new component: ask, or build it and flag it in PR.
- Accessibility is required: every control has role, label, state. Whole row is pressable. Every gesture has button or accessibility action.
- `…` not `...`. Curly quotes. Menu items that open follow-up end with `…`.

## Components

- Page close: top right [`CloseButton`](src/components/close-button.tsx). Android full-screen dialog: close top left. Modal title and close go in native stack header ([Day view `Header`](src/features/calendar/screens/log-list/header.tsx)). Back arrow is not close. Form modal with Save keeps text Cancel top left.
- Buttons: [`Button`](src/components/button.tsx) (filled), [`LinkButton`](src/components/link-button.tsx) (text). Label is plain string, or compose `ButtonIcon` + `ButtonText` ([`ButtonContent`](src/components/button-content.tsx)). Never own `Text` or icon color inside button: disabled color comes from button.
- Toasts: `showToast` ([`src/lib/toast.ts`](src/lib/toast.ts)). iOS top card, Android M3 snackbar. Optional Undo `action`, never only way to do something.
- Inline errors, warnings, notices: [`InlineAlert`](src/components/inline-alert.tsx) next to the content they are about. Stays until state changes. Never plain colored text.
- Menu rows: [`MenuListItem`](src/components/menu-list-item.tsx). Title = short Title Case noun. Status in value slot. One text color per row, except destructive rows (`colors.danger`). Never wrap or shrink: shorten text. Warnings use [`TextInfo`](src/components/text-info.tsx) under list.
- Bezel ([`Bezel`](src/components/bezel.tsx), radius from `getBezelRadius`): statistics cards and person tiles only. Calendar days, mood buttons, entry cards, list groups have no bezel.
- Android list groups: M3 full-width list, no chevron, no dividers, 56dp rows ([`MenuList`](src/components/menu-list.tsx)).
- Tag colors: fixed palette inline in grouped card ([`ColorPicker`](src/features/tags/components/color-picker.tsx)). 48 × 48 targets, never shrink. Selection shown by check + color name, never hue alone.
- Core Modules ([GLOSSARY.md](GLOSSARY.md)) use same Lucide icon everywhere, 20 px: Mood `Sun`, Emotions `Heart`, Tags `Tag`, People `Users`, Photos `Image`, Note `FileText`. Labels are single nouns.

## Sheets and Modals

- `Modal` with `presentationStyle="pageSheet"`, `animationType="slide"` ([`SheetModal`](src/components/sheet-modal.tsx)).
- Router form with native header: iOS `formSheet`, Android full-screen `modal`, header items via `Stack.Toolbar` ([Feedback](src/features/feedback/screens/feedback-screen.tsx)).
- Never custom slide-in sheet. Never move views from keyboard events. Inputs sit at sheet top.
- Route modal header: [`RouteModalHeader`](src/components/route-modal-header.tsx). iOS native sheet bar, Android Material top app bar.

## Settings

- Prefer system settings (notifications, language, appearance).
- New in-app setting: check Apple HIG, Material, 2-3 reference apps. Cite research in PR.

## Layout

- Swap keeps size: replacing implementation keeps measured width, height, padding. Measure before and after.
- Spacing request for one element changes that element only, not shared component or token.
- Parent owns spacing between children: flex `gap`, not sibling margins. Shared chips (`Tag`, `PersonChip`, `MiniButton`) carry no outer margin. Wrapping chip groups use [`CHIP_FLOW`](src/constants/chip.ts).
- Radius from [`RADIUS`](src/constants/radius.ts), picked by role. Nested radius ≤ parent radius.
- No sideways scroller inside sideways parent (pager, carousel): Android steals swipe.
- Lists > ~20 items virtualized. Safe areas from `react-native-safe-area-context`, never hardcoded.
- No `LayoutAnimation` ([#610](https://github.com/mrzmyr/pixy-mood-tracker-app/pull/610)). Use Reanimated `entering`/`exiting`/`layout`. Honor reduce motion.

## Copywriting

- App headings and buttons: Title Case (Chicago). Labels specific: "Save Tag", not "Continue".
- Errors say how to fix.

# Marketing assets

Inside phone screens, app source wins: copy radius, colors, strings exactly. Rules below apply outside phone.

## Principles

- Pixy = mood journal for self-care. Pitch: "See what shapes how you feel". Year in pixels = signature visual, not category.
- One claim per asset. Headline states it, phone or pixel grid proves it.
- Dark canvas, light type, mint accent. Color shows mood, never decoration.
- Calm: big type, space, max one pop-out group per screen. No emoji, no gradient text, no decorative icons.
- Hard days stay kind: no sad faces, legends say "Good days" and "Hard days".

## Tokens

Canvases (px): App Store `1290×2796`, Play `1080×1920`, Play feature graphic `1024×500` (content in center 924×400), OG `1200×630`, X header `1500×500`, LinkedIn `1584×396`, web `1440` and `390`. Margin = 6% of width. Web max width 1200.

| Theme                | Canvas    | Headline  | Sub, body | Eyebrow   |
| -------------------- | --------- | --------- | --------- | --------- |
| Night (default)      | `#0A0A0A` | `#FFFFFF` | `#A3A3A3` | `#34D399` |
| Forest               | `#05392D` | `#FFF7ED` | `#34D399` | `#34D399` |
| Paper                | `#FAFAFA` | `#0A0A0A` | `#6B6B70` | `#047857` |
| Black (privacy only) | `#000000` | `#FFFFFF` | `#A3A3A3` | `#34D399` |

- Store set: one theme. Privacy screen: Black.
- Dark surface `#1C1C1E`, 1px border `#3A3A3C`.
- Icon: [docs/icon.png](docs/icon.png), transparent, never recolor, min 32px.
- System blue `#007AFF` only inside app UI.

Mood pixels:

- Inside phone: app scale from `Scales.ts`.
- Outside phone on dark canvas: `neutral` `#737373`, `bad` `#FED7AA`, `empty` `#1F1F1F` (Forest `#0B4A3B`). Other ratings as app.
- Calendar pixel = rounded square, 15% radius. Year pixel = circle.
- Year grid: portrait canvas = months as columns, landscape = months as rows.
- Data: ≥ 60% good, ≤ 15% very bad + extremely bad, a few hard stretches, 2-5% missed. Current year, future days empty. Fixed seed.

Type:

- Marketing: Geist 400/600/700/800. Inside phone: system font (SF Pro, Roboto). Pop-outs count as phone UI.
- Headline 800, tracking −0.03em. Eyebrow 700 uppercase, +0.08em.
- Headline / sub (px): App Store 136 / 54, Play 112 / 44, OG and X 72 / 28, LinkedIn 60 / 24, web 72 / 22 (mobile 44 / 18).

## Phone and pop-outs

- Logical screen: iOS 440×956 pt, Android 412×915 dp. Scale to frame.
- Flat frame `#2C2C2E`, bezel 2.2% of width, radius 14% (Android 11%). Status bar 9:41, full battery.
- Phones bleed off canvas bottom. Two phones: second lower, lower one in front.
- Light mode app on dark canvas.
- Pop-out: real app component at 1.6× phone scale, tilt ±4°, covers ≤ 25% of screen and whole cells only.
- Shadow only on phone and pop-outs. Optional mint glow behind phone, ≤ 12% opacity.

## Layouts

Store screens stack top to bottom, positions follow content: eyebrow, headline, sub, then phone 140px below text.

- **Store hero:** eyebrow "Mood journal", pitch, calendar phone.
- **Store feature:** one feature, phone + pop-out.
- **Store duo:** two related views (logger + calendar, light + dark).
- **Store privacy:** Black, surface box, checklist with mint checks. No phone, no lock icon.
- **Feature graphic:** icon + name + ≤ 6 words left, year grid right.
- **Launch header:** headline left (≤ 50% width), tilted phone right. Keep text clear of profile photo (X: bottom left 420×210; LinkedIn: left 560px below y 200).
- **Social card:** title ≤ 2 lines, icon bottom left, year grid bleeding right.
- **Web:** hero (title, lead, store badges, phone), ≤ 6 feature cards, Black privacy section, footer with app-facts links.

## Copy

- Claim only features with `status: available` in app-facts. Free, no ads, no account, local, open source: check `claims`.
- Verify every number in source. Emotions: 72 enabled. Source and app-facts disagree: omit number.
- No ratings, downloads, or review quotes without public source and maintainer approval.
- App has anonymous analytics: never "no tracking". Web privacy section discloses it.
- Release: version only on GitHub = "Out now on GitHub", no store badges.
- Headline sentence case, ≤ 28 characters per line, ≤ 3 lines. Sub one sentence, ≤ 60 characters.
- App strings inside phone: exact from `assets/locales/en.json`.
- People: "connected", never "together".
- Store badges: official Apple and Google artwork only.

## Demo characters

Use in every asset, fixture, and copy example. Photos: [docs/demo-characters/](docs/demo-characters/). Never real user data, never stock photos.

**Klara** (user): 36, physiotherapist, part-time, Hamburg-Eimsbüttel. Single parent of Ada since separation last year, shares care with Tobi. Tracks mood to learn what keeps her steady: swimming, Ada, walks with Chuky, Jen. Story: first year rebuilding her routine. Good weeks have swimming and play. Hard days cluster around handovers and Oma Hilde's health.

Klara's people (each connection can feel good, bad, or mixed):

- **Ada**: daughter, 8. Loves Kaifu-Bad and playgrounds. Mostly joyful, some tired evenings. Avatar: [ada.jpg](docs/demo-characters/ada.jpg)
- **Chuky**: golden retriever puppy since spring. Joy and chaos. Avatar: dog in [klara-chuky.jpg](docs/demo-characters/klara-chuky.jpg)
- **Jen**: best friend since university. Nights out, long calls. Avatar: Jen in [klara-jen.jpg](docs/demo-characters/klara-jen.jpg)
- **Oma Hilde**: grandmother, 91, Lübeck, writes letters. Love and worry. Initials avatar
- **Tobi**: Ada's father. Handovers feel mixed or bad. Initials avatar

Klara's moments:

- **Swim day**: Saturday at Kaifu-Bad with Ada. Very good, happy, proud. Ada, tag Sport, place Kaifu-Bad. Photos: [klara-ada-kaifu-bad.jpg](docs/demo-characters/klara-ada-kaifu-bad.jpg), [klara-ada-swimming.jpg](docs/demo-characters/klara-ada-swimming.jpg), [klara-underwater.jpg](docs/demo-characters/klara-underwater.jpg)
- **Chuky's first week**: good, loved, tired. Chuky. Photo: [klara-chuky.jpg](docs/demo-characters/klara-chuky.jpg)
- **Jen's birthday**: very good, silly, energized. Jen. Photo: [klara-jen.jpg](docs/demo-characters/klara-jen.jpg)
- **Letter from Oma Hilde**: neutral, moved, grateful, sad. Oma Hilde. Photo: [klara-letter.jpg](docs/demo-characters/klara-letter.jpg)
- **Handover day**: bad, drained, irritated. Tobi. No photo

Feature assets (changelog, launch, store feature):

- One unreleased feature per asset. Turn off flags of all other unreleased features.
- Entries carry no data from other unreleased features: no photos in People assets, no places in Timeline assets.
- Released modules (mood, emotions, tags, note) may appear everywhere.

## Render

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --window-size=1290,2796 --virtual-time-budget=5000 --screenshot=out.png file://$PWD/asset.html
```

- Headless Chrome minimum width is 500. Render 390 web through iframe wrapper.
