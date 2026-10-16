# Pixy Design System

Visual system for Pixy marketing assets: store screenshots, website pages, launch headers, social cards. Structure: **principles, tokens, primitives, components, layouts, copy, reference implementation**. This file is enough to build an asset.

- App UI rules (interaction, forms, accessibility): [docs/design.md](docs/design.md)
- App color source: [`src/constants/Colors`](src/constants/Colors/index.ts), mood scales in [`Scales.ts`](src/constants/Colors/Scales.ts)
- Facts and claims: [docs/app-facts.json](docs/app-facts.json)
- App icon: [docs/icon.png](docs/icon.png) (transparent background)

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
