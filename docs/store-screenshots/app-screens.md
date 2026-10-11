# App screens

Human-owned spec. Agents never edit this file. Agents propose changes as before/after and wait for confirmation.

Implementation: `screens-final.html` (built by `build_screens_v3.py`, app UI in `appscreens.js`).

## Style

- bg: #05392D
- title text: #FFF7ED
- subtitles: #34D399
- for screens it uses a phone frame (CSS titanium frame, screen at 57% scale)
- titles: Geist ExtraBold; app UI: SF system font
- canvas: App Store ratio (preview 300x650, export 1290x2796)
- pop-out styles:
  - emotions: white pill, tilted, blue ring when selected
  - tags: straight gray card with chips
  - cards: white app card with shadow
- emotion icons: app Hugeicons, two-tone fill (35% tint); green good, gray neutral, orange bad

## 1. screen: proof

- subtitle: "mood journal"
- "Understand what makes you feel that way."
- 10,000+ downloads + laurel wreath
- 4.9 ★★★★★ (App Store; Google Play is 4.7)
- “I am a mental health counselor and I love suggesting to my clients to use this for reflection.” - Google Play (review id 6e6443f5; avatar = initial "J", no name shown)
- Listed on: AlternativeTo, moodtrackers.org, MEDevel
- Listed on logos: no badges, blended into the bg
- phone screen from bottom

## 2. mood

- Mood in Pixels, Your days turn into colors.
- 1. screen: mood tracking (first logger slide)
- 2. screen: calendar (like calendar in app)
- slightly offset vertical offset, so you can see the calendar better than the mood tracking

## 3. timeline

- "Go back in Time"
- "View past entries in timeline."
- screen: shows timeline view from app
- day 2 (pop-out): `photos/oma-hug.png`, `photos/d1-letter.png`; "Oma gave me the letter Opa wrote her in 1962. Happy tears."; Loved, Grateful, Happy; Family
- day 1: `photos/munich.png`, `photos/d1-puppy.png`; "Marienplatz in the sun, then we picked up our puppy."; Excited, Happy, Content; Travel, Family; Marienplatz, München
- popout day 2
- photos of the second day stay visible (not covered by the pop-out)

## 4. emotions

- Name what\nyou feel.
- 161 emotions, each explained.
- screen of emotions slide in logger + pop out of most important ones: Calm, Hopeful, Grateful, Anxious (incl icon)
- grid: happy, calm, grateful, hopeful, loved, proud, excited, content, relieved, focused, tired, anxious, stressed, overwhelmed, sad, lonely, frustrated, inspired
- selected: Calm, Hopeful; tooltip shows Hopeful: "You feel optimistic that something good will happen"

## 5. tags

- "Tag what matters"
- "Track what fills your days."
- Tags (no tag categories: not built yet)
- pop out popular tags in gray cards (no headings); pop-out style differs from emotions
- logger bg: gray, no map
- tags must not repeat concepts Pixy already has (people, places, sleep, emotions)
- tags: Sport, Long walk, Yoga, Gaming, Meditation, Reading, Therapy, Deep work, Meetings, Overtime, Coffee, Alcohol, Social media
- pop-outs: Sport, Long walk, Yoga · Meditation, Reading

## 6. people

- "Who makes your day?"
- "Add the people in your life."
- screen: people step in logger ("Who played a part?"), 3-column avatar grid + "Add Person" tile
- people: Ada, Jonas (selected), Priya, Yasmin, Mom (no photo), Sam, Lena, Kai
- photos: `photos/p-ada.jpg`, `photos/p-jonas.jpg`, `photos/p-priya.jpg`, `photos/p-yasmin.jpg`
- pop out: "Add Person" card (Ada photo + name, "Pick From Contacts…")

## 7. Places

- "See where you feel good"
- "Track where you have been with locations"
  - use map view screen with one entry: "Ada had her first 3m jump, I'm so proud." (location: Bäderland Kaifubad)
  - emotions Proud, Happy, Loved; tags Family, Sport; people Mia, Sam
  - map: real Apple Maps capture `photos/map-kaifubad.png`
  - photos: the swim at Bäderland Kaifubad: `photos/d2-kaifubad.png`, `photos/d2-underwater.png`, `photos/d2-poollaugh.png`

## 8. themes

- "Make it your own"
- "Beautiful colors in light and dark mode."
- screen: 2 alternative themes of the calendar side by side, no original theme: purple (PuOr, light) left, teal-brown (BrBG, dark) right
- same layout on iOS and Android
- widgets screen removed

## 9. privacy

- black bg, serious look, no lock icon
- "Private by design"
- box above list: "Stored on your device only"; "Most journal apps keep your entries on their servers. Pixy doesn't."
- list of features: Face ID lock (+ icon), checklist: No account, no sign-up, No ads, no tracking of entries, Export your data anytime, Open source

## Paused: Impact

- "See what lifts you, and what weighs."
- screen showing most important analysis:
  - best combinations: "Your best combinations"
- pop out: "How you feel with people" (formerly "Days connected with...")
- data: best combinations Sport + Jonas +1.5, Friends + Kemal +1.4, Relax + Jonas +1.3; people Jonas +1.4, Lena +0.7, Noah +0.5, Kai −0.7
- people copy says "connected", never "together"
- paused for now: impact analysis is not built yet; removed from the screens until it ships

## Before publishing

- Features behind flags (people, places, timeline, Face ID): release + update `app-facts.json` first
- Model releases for people photos
