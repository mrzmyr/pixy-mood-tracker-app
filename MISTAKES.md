# Mistakes

Mistakes that broke the app or the build, and the rule that prevents them.

- Add one bullet per mistake: the rule first, then the cause. Link the commit or PR
- Prefer a lint rule or test. Remove the entry once a check enforces it

- Never write storage after a failed read. A read error must keep the stored data, not replace it with defaults (commits 1a1ddd8, f165aad).
- Keep all `@react-navigation/*` packages on the same major version. Mixing v6 and v7 breaks native navigation.
- React Compiler plus frozen screens (`freezeOnBlur`, `enableFreeze`) can leave FlashList headers or footers stale after the screen unfreezes. The compiled calendar screen kept a stale footer after a data reset (`e2e/flows/data-round-trip.yaml`). No screen freezes today, so no screen opts out with `"use no memo"`. Before you freeze any screen, run the e2e suite.
- Initialize Sentry once, at module load in `src/app/_layout.tsx`, before the first render.
- Never mount an `@expo/ui` picker or `Host` inside a Settings row `accessory`. The row wraps the accessory in an `RNHostView`, and the nested `Host` replaced the Android reminder time pill without showing its dialog. Open native dialogs imperatively, like `DateTimePickerAndroid.open` (PIX-44).
- Before you report a UI change done, compare simulator screenshots of every touched screen with the approved prototype: light and dark, flag on and off. Fix every difference on that screen, also one that is already on main. The tag create form showed white rows on a white page under a gray header; it was seen, called "pre-existing", and shipped in the PR proof (#1143). Lint rule `modal-page-background` now catches this color case.
