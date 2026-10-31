# Pixy Design

This file has the design rules that are specific to Pixy. For all other topics, follow the [Apple HIG](https://developer.apple.com/design/human-interface-guidelines), [Material 3](https://m3.material.io), and [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/).

- Marketing assets (store screenshots, website, social cards): [docs/marketing-design.md](docs/marketing-design.md)
- Demo characters for assets and fixtures: [docs/demo-characters/](docs/demo-characters/README.md)
- Colors: [`src/constants/colors`](src/constants/colors/index.ts). Mood colors: [`scales.ts`](src/constants/colors/scales.ts).
- App facts and claims: [docs/app-facts.json](docs/app-facts.json)

## Basics

- When code can enforce a rule, code enforces it: a lint rule, a token, or a component prop.
  - To allow a component or icon only in some folders, add it to `componentScopes` in [`oxlint.config.ts`](oxlint.config.ts).
- Use the components that exist.
  - If you need a new component, ask first.
  - Or build it and name it in the PR description.
- Make every control accessible.
  - Each control has a role, a label, and a state.
  - The full row is pressable, not only its text.
  - Each gesture also has a button or an accessibility action.
- Use one text size for all body text: `FONT_SIZE.base` ([`typography.ts`](src/constants/typography.ts)).
  - Body text includes chips, names, notes, list rows, and labels.
  - A different size needs a comment next to it that gives the reason. Examples: a headline, a mood word, axis ticks.
  - Text of the same kind on one screen has the same size.
- Use `…`, not `...`. Use curly quotes.
- A menu item that opens a follow-up step ends with `…`.

## Copywriting

- Use Title Case (Chicago style) for app headings and buttons.
- A label tells what happens: "Save Tag", not "Continue".
- An error message tells the user how to fix the problem.

## Components

Each component documents its rules in its JSDoc. Lint enforces what it can.

- Use [`Button`](src/components/button.tsx) for filled buttons and [`LinkButton`](src/components/link-button.tsx) for text buttons.
- Use `showToast` ([`toast.ts`](src/lib/toast.ts)) for toasts.
- Use [`InlineAlert`](src/components/inline-alert.tsx) for errors, warnings, and notices.
- Use [`MenuListItem`](src/components/menu-list-item.tsx) in a [`MenuList`](src/components/menu-list.tsx) for menu rows.
- Use [`Bezel`](src/components/bezel.tsx) for statistics cards only.
- Use [`AddPersonTile`](src/features/logger/slides/slide-people.tsx) as the model for add actions in picker grids.
- Use [`SleepQualityMeter`](src/features/logger/slides/slide-sleep-button.tsx) for the sleep quality of one night.
- Use [`ModuleIcon`](src/components/module-icon.tsx) for Core Module icons ([GLOSSARY.md](GLOSSARY.md)).
- One icon has one meaning. For example, color themes use `Palette` and menstruation uses `Droplet`.
- A state icon has one glyph per state, at one size.
  - Show a different state with a different fill or detail. Do not change the icon count or size.
  - Selection and Day view use the same state icon.
- Modals ([HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets), [M3 full-screen dialogs](https://m3.material.io/components/dialogs/guidelines))
  - Use a route modal for a screen in `src/app`: [`getModalRouteOptions`](src/components/modal-route-options.ts) with [`RouteModalHeader`](src/components/route-modal-header.tsx). Example: [profile form](src/features/profile/screens/profile-form.tsx).
  - Use [`SheetModal`](src/components/sheet-modal.tsx) with [`ModalHeader`](src/components/modal-header.tsx) for a form or picker over the current screen.
  - Use [`getModalBarOptions`](src/components/modal-bar-options.tsx) when a screen keeps the native bar: form sheets ([feedback](src/features/feedback/screens/feedback-screen.tsx)), transparent bars (check-in, day view).
  - Use [`HeaderButton`](src/components/header-button.tsx) for every header button. Its `kind` sets the side, icon, and style.
  - A form with unsaved edits asks before it closes ([`useDiscardGuard`](src/hooks/use-discard-guard.ts)).
  - Media overlays (photo viewer, recap stories) have no header bar. They show a white close button.
  - A multi-step flow (logger) has no back button. A swipe goes back, and the step dots have a "Back" accessibility action.

## Summary tiles

- Use [`Tile`](src/features/logger/confirmation/entry-summary-tiles.tsx) for summary cards and [`getBentoRows`](src/features/logger/confirmation/entry-summary-layout.ts) for their grid.
- Use `scale[rating].border` ([`scales.ts`](src/constants/colors/scales.ts)) to outline mood pixels, marks, and bands. Lint blocks shading colors outside `src/constants/colors`.
- Fade the bottom of a scrolling tile list with a mask, not a color overlay.

## Sky

The sky shows in onboarding, in voice mode, and in the entry summary hero when the entry has no photos or place.

- Components: [`Sky`](src/components/sky.tsx), [`OnboardingSky`](src/features/onboarding/screens/onboarding/onboarding-sky.tsx), [`CloudPixy`](src/components/cloud-pixy.tsx).
- Light mode: a day sky with a drifting cloud photo.
- Dark mode: a night sky.
  - Deep navy, faint clouds.
  - Stars are small, sparse, and dim. They twinkle slowly.
  - Do not use a darker version of the day sky.
- Cloudy flies in both modes, but only in free sky.
  - Cloudy never flies over text, controls, or screenshots.
  - Slides mark free sky with [`SkyFlightZone`](src/features/onboarding/screens/onboarding/sky-flight-zone.tsx). If a slide has no zone, it shows no Pixy.
- With reduce motion on: no Pixy, and the sky does not move.

## Layout

- A swap keeps the size.
  - When you replace an implementation, keep the measured width, height, and padding.
  - Measure before and after the change.
- A spacing request for one element changes that element only. Do not change a shared component or token.
- The parent sets the spacing between children. Use flex `gap`, not margins on siblings.
  - Shared chips (`Tag`, `PersonChip`, `MiniButton`) have no outer margin.
  - Wrapping chip groups use [`CHIP_FLOW`](src/constants/chip.ts).
- Get radius values from [`RADIUS`](src/constants/radius.ts). Pick the value by role.
  - A nested radius is equal to or smaller than its parent radius.
- Do not put a horizontal scroller in a horizontal parent (pager, carousel). Android takes the swipe.
- Virtualize lists with more than approximately 20 items.
- Get safe areas from `react-native-safe-area-context`. Do not hardcode them.
- Do not use `LayoutAnimation` ([#610](https://github.com/mrzmyr/pixy-mood-tracker-app/pull/610)).
  - Use Reanimated `entering`, `exiting`, and `layout`.
  - Obey the reduce motion setting.

## Settings

- Use system settings when possible: notifications, language, appearance.
- Before you add an in-app setting, read the Apple HIG and Material guidance. Also look at 2 or 3 reference apps.
  - Cite this research in the PR.
