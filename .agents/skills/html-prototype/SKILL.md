---
name: html-prototype
description: Build a single-file HTML prototype to explore and decide a UI change before coding it. Use when asked for a prototype, mockup, concept page, design options, or "show me how X could look".
---

# Prototype

Output: one self-contained HTML file in `output/pixy-mood-tracker-<slug>/index.html`. `output/` is gitignored. Never commit prototypes or reference images.

# Steps

1. **Frame the question.** Write one sentence: what decision the prototype answers. List 2 to 5 options to compare.
2. **Read the rules.** [DESIGN.md](../../../DESIGN.md), [vision.md](../../../vision.md), [GLOSSARY.md](../../../GLOSSARY.md). Find the current screen in `src/` and copy its real copy, colors, and spacing.
3. **Research native elements first.** For each control (sheet, picker, toolbar, menu, tab bar, switch, date picker, toast):
   - iOS: [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/components)
   - Android: [Material 3 components](https://m3.material.io/components)
   - What the app ships: [Expo SDK docs](https://docs.expo.dev/versions/latest/) and `package.json` (for example `@expo/ui`, `expo-router` native tabs)
   - Note the behavior per platform: placement, dismissal, gestures, default styling
4. **Research patterns on Mobbin when the pattern is not obvious.** Use the Mobbin MCP (`search_screens`, `search_flows`). Mobbin has iOS and web only; for Android use Material 3 docs. Pick 3 to 8 references. Link each with its `mobbin_url`. Never embed or download Mobbin images into the page.
5. **Build the page.** See [Page structure](#page-structure).
6. **Set up [Agentation](https://www.agentation.com/install)** so Moritz can annotate elements on the page.
7. **Open it** and send the file path. Say your pick in one line.

# Page structure

Per option, top to bottom:

- **ID and name**: stable ID (`O1`, `O2`, ...). Never renumber after sharing
- **Mockup**: phone frame, real copy, light and dark when color matters
- **Platform toggle** when the option uses native elements: iOS and Android side by side, each built from its native pattern. Never show one platform styled as the other
- **Persona switch** when the content differs per persona: tabs for the relevant personas from [docs/personas.md](../../../docs/personas.md). Each tab renders that persona's typical data (Lea: mood only, Nina: max load). Always include Nina when layout can overflow
- **Pros and cons**: 2 to 4 bullets each, concrete ("1 tap less for Lea", "truncates Jonas's notes")
- **References**: Mobbin and guideline links that informed it
- **Decision controls**: Accept, Decline, note field

Top of page:

- The decision question
- **My pick**: option ID, why in 2 to 3 sentences, and which persona or platform it serves worst
- Research summary: native element behavior per platform, Mobbin patterns seen, with links

# Decision export

- Every option has Accept / Decline toggles and an optional note. State persists in `localStorage`, keyed by slug
- A sticky **Copy decisions** button copies plain text to paste back in chat:

```text
Prototype: <slug>
ACCEPT
- O2 Inline chips: <note>
DECLINE
- O1 Bottom sheet: <note>
OPEN
- O3 Full screen
```

- After Moritz pastes decisions, implement only the accepted options. Ask about open ones.

# Rules

- Use unique class names (`.decision-accept`, not `.a`). Short names collide with mockup styles
- Fake data only. No real user data, no analytics numbers
- No bouncy animations. Eased timing only
- Prefer content on the background over cards
