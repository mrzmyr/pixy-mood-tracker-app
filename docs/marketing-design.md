# Marketing Design

These rules apply to store screenshots, the website, launch headers, and social cards.

- Inside a phone screen, the app source is the reference. Copy the radius, colors, and strings exactly.
- The rules below apply outside the phone.
- App UI rules: [DESIGN.md](../DESIGN.md)
- Positioning and messaging: [vision.md](../vision.md)
- Facts and claims: [app-facts.json](app-facts.json)
- People and photos: [demo characters](demo-characters/README.md)

## Principles

- Pixy is a mood journal for self-care.
  - The pitch is "See what shapes how you feel".
  - The year in pixels is the signature visual. It is not the category.
- Each asset makes one claim.
  - The headline states the claim.
  - The phone or the pixel grid proves it.
- Use a dark canvas, light type, and a mint accent.
  - Color shows mood. Do not use color as decoration.
- Keep it calm: big type, much space, one pop-out group per screen or fewer.
  - No emoji, no gradient text, no decorative icons.
- Hard days stay kind.
  - No sad faces.
  - Legends say "Good days" and "Hard days".

## Canvases

| Asset                | Size (px)                               |
| -------------------- | --------------------------------------- |
| App Store            | `1290×2796`                             |
| Play                 | `1080×1920`                             |
| Play feature graphic | `1024×500`, content in center `924×400` |
| OG                   | `1200×630`                              |
| X header             | `1500×500`                              |
| LinkedIn             | `1584×396`                              |
| Web                  | `1440` and `390` wide                   |

- The margin is 6% of the width.
- The web content is 1200 px wide or less.

## Themes

| Theme                | Canvas    | Headline  | Sub, body | Eyebrow   |
| -------------------- | --------- | --------- | --------- | --------- |
| Night (default)      | `#0A0A0A` | `#FFFFFF` | `#A3A3A3` | `#34D399` |
| Forest               | `#05392D` | `#FFF7ED` | `#34D399` | `#34D399` |
| Paper                | `#FAFAFA` | `#0A0A0A` | `#6B6B70` | `#047857` |
| Black (privacy only) | `#000000` | `#FFFFFF` | `#A3A3A3` | `#34D399` |

- A store set uses one theme. The privacy screen uses Black.
- Dark surface: `#1C1C1E`, with a 1 px border `#3A3A3C`.
- Icon: [icon.png](icon.png).
  - It is transparent. Do not recolor it.
  - The icon is 32 px or larger.
- Use system blue `#007AFF` only inside the app UI.

## Mood pixels

- Inside the phone: use the app scale from `scales.ts`.
- Outside the phone, on a dark canvas:
  - `neutral`: `#737373`
  - `bad`: `#FED7AA`
  - `empty`: `#1F1F1F`. On Forest: `#0B4A3B`.
  - All other ratings use the app colors.
- A calendar pixel is a rounded square with a 15% radius. A year pixel is a circle.
- Year grid direction:
  - Portrait canvas: months are columns.
  - Landscape canvas: months are rows.
- Demo data
  - 60% or more good days.
  - 15% or fewer "very bad" and "extremely bad" days together.
  - Some hard stretches.
  - 2 to 5% missed days.
  - Use the current year. Future days are empty.
  - Use a fixed seed.

## Type

- Marketing text uses Geist 400, 600, 700, and 800.
- Phone UI uses the system font: SF Pro on iOS, Roboto on Android. Pop-outs count as phone UI.
- Headline: weight 800, tracking −0.03em.
- Eyebrow: weight 700, uppercase, tracking +0.08em.
- Headline and sub sizes (px):

| Asset      | Headline | Sub |
| ---------- | -------- | --- |
| App Store  | 136      | 54  |
| Play       | 112      | 44  |
| OG and X   | 72       | 28  |
| LinkedIn   | 60       | 24  |
| Web        | 72       | 22  |
| Web mobile | 44       | 18  |

## Phone and pop-outs

- Logical screen size: iOS 440×956 pt, Android 412×915 dp. Scale it to the frame.
- Frame
  - Flat color `#2C2C2E`.
  - The bezel is 2.2% of the width.
  - The radius is 14% on iOS and 11% on Android.
  - The status bar shows 9:41 and a full battery.
- Phones go past the bottom edge of the canvas.
- With two phones, the second phone is lower. The lower phone is in front.
- Show the app in light mode on the dark canvas.
- Pop-out
  - Use a real app component at 1.6× the phone scale.
  - Tilt it by 4° or less, in either direction.
  - It covers 25% of the screen or less, and only full cells.
- Use shadows only on phones and pop-outs.
- A mint glow behind the phone is optional. Its opacity is 12% or less.

## Layouts

Store screens stack from top to bottom: eyebrow, headline, sub, then the phone. The phone starts 140 px below the text.

- Store hero: the eyebrow "Mood journal", the pitch, a calendar phone.
- Store feature: one feature, a phone, and a pop-out.
- Store duo: two related views, for example logger + calendar, or light + dark.
- Store privacy
  - Black theme, a surface box, a checklist with mint checks.
  - No phone, no lock icon.
- Feature graphic
  - Left: icon, name, and 6 words or fewer.
  - Right: the year grid.
- Launch header
  - Left: the headline, 50% of the width or less.
  - Right: a tilted phone.
  - Keep text away from the profile photo:
    - X: the bottom-left 420×210 px.
    - LinkedIn: the left 560 px, below y 200.
- Social card
  - The title is 2 lines or fewer.
  - The icon is at the bottom left.
  - The year grid goes past the right edge.
- Web
  - A hero with title, lead, store badges, and a phone.
  - 6 feature cards or fewer.
  - A privacy section in the Black theme.
  - A footer with the links from app-facts.

## Copy

- Claim only features with `status: available` in app-facts.
  - Before you claim free, no ads, no account, local storage, or open source, read `claims`.
- Verify every number in the source code.
  - Emotions: 72 are enabled.
  - If the source and app-facts do not agree, do not show the number.
- Do not show ratings, downloads, or review quotes unless they have a public source and the maintainer approves them.
- The app has anonymous analytics.
  - Never say "no tracking".
  - The web privacy section tells users about the analytics.
- If a version is only on GitHub, say "Out now on GitHub". Do not show store badges.
- Headline
  - Sentence case.
  - 28 characters per line or fewer, and 3 lines or fewer.
- Sub: one sentence, 60 characters or fewer.
- App strings inside the phone come exactly from `assets/locales/en.json`.
- People: say "connected". Do not say "together".
- Store badges: use only the official Apple and Google artwork.

## Feature assets

These rules apply to changelog, launch, and store feature assets.

- Each asset shows one unreleased feature.
  - Turn off the flags of all other unreleased features.
- Entries have no data from other unreleased features.
  - People assets have no photos.
  - Timeline assets have no places.
- Released modules (mood, emotions, tags, note) can show in all assets.

## Render

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --window-size=1290,2796 --virtual-time-budget=5000 --screenshot=out.png file://$PWD/asset.html
```

- The minimum width of headless Chrome is 500 px.
- To render the 390 px web layout, use an iframe wrapper.
