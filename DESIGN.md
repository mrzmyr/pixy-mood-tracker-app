# Pixy Design

Pixy-specific design decisions that a model cannot read from the code. For everything else, follow the [Apple HIG](https://developer.apple.com/design/human-interface-guidelines), [Material 3](https://m3.material.io), and [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/).

- Marketing assets (store screenshots, website, social cards): [docs/marketing-design.md](docs/marketing-design.md)
- Demo characters for assets and fixtures: [docs/demo-characters/](docs/demo-characters/README.md)
- App facts and claims: [docs/app-facts.json](docs/app-facts.json)

## What goes where

- A rule that code can check goes into code: a lint rule, a type, a token, or a check script. Its error message teaches the rule.
  - To allow a component or icon only in some folders, add it to `componentScopes` in [`oxlint.config.ts`](oxlint.config.ts).
- How a component behaves goes into its JSDoc.
- This file keeps only what a model reading the code gets wrong:
  - a choice between similar options,
  - a rule that existing code breaks, so copying it spreads the mistake,
  - taste that no file states,
  - a process step outside the code.

## Basics

- Use the components that exist. If you need a new one, ask first, or build it and name it in the PR description.
- Make every control accessible: role, label, and state. The full row is pressable. Each gesture also has a button or an accessibility action.
- Text: `Label` for one line, `Copy` when it can wrap ([`typography.tsx`](src/components/typography.tsx), [Geist type scale](https://vercel.com/geist/typography)).

## Copywriting

- A label tells what happens: "Save Tag", not "Continue".
- An error tells the user how to fix the problem.

## Components

- Errors, warnings, and notices: [`InlineAlert`](src/components/inline-alert.tsx), not colored text or `TextInfo`.
- Add action in a picker grid: copy [`AddPersonTile`](src/features/logger/slides/slide-people.tsx).
- Sleep quality of one night: [`SleepQualityMeter`](src/features/logger/slides/slide-sleep-button.tsx), never own bars or dots.
- One icon has one meaning. Color themes use `Palette`, menstruation uses `Droplet`.
- A state icon has one glyph per state, at one size. A different state changes the fill or detail, not the icon count or size. Selection and Day view use the same state icon.
- Modals
  - Screen in `src/app`: route modal, [`getModalRouteOptions`](src/components/modal-route-options.ts) + [`RouteModalHeader`](src/components/route-modal-header.tsx).
  - Form or picker over the current screen: [`SheetModal`](src/components/sheet-modal.tsx) + [`ModalHeader`](src/components/modal-header.tsx).
  - Screen that keeps the native bar: [`getModalBarOptions`](src/components/modal-bar-options.tsx).
  - A form with unsaved edits uses [`useDiscardGuard`](src/hooks/use-discard-guard.ts).
- Mood outlines (pixels, marks, bands): `scale[rating].border` ([`scales.ts`](src/constants/colors/scales.ts)), never a fixed white or black.

## Layout

- The parent sets space between children with flex `gap`, not margins on siblings.
- Do not put a horizontal scroller in a horizontal parent (pager, carousel). Android takes the swipe.
- A swap keeps the size. Measure width, height, and padding before and after.
- A spacing request for one element changes that element only, not a shared component or token.

## Settings

- Use system settings when possible: notifications, language, appearance.
- Before you add an in-app setting, read the Apple HIG and Material guidance and look at 2 or 3 reference apps. Cite this research in the PR.
