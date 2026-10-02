# User journey

What a new user should experience, day by day. One line per day. Code links show where each moment lives.

- Day 0: install, onboarding (4 slides, reminder opt-in, privacy), first entry on calendar ([`src/features/onboarding`](../src/features/onboarding))
- Day 1: reminder at 18:00 if enabled, second entry; logger offers reminder after the first entry when off ([`src/features/logger/Logger.tsx`](../src/features/logger/Logger.tsx))
- Day 2: two pixels on calendar, first sense of pattern; filters and day view discoverable
- Day 3: after saving the entry, widget nudge opens the Home Screen widget guide (iOS only) ([`src/features/widget/widgetNudge.ts`](../src/features/widget/widgetNudge.ts))
- Day 4: widget nudge if day 3 skipped it (for example store review fired instead); feedback question slide may appear in logger after 3 entries
- Day 5 to 6: widget shows week progress (`n/7`) on Home Screen; one tap opens calendar
- Day 7: seventh entry triggers the store review prompt (production only) ([`src/features/review/storeReview.ts`](../src/features/review/storeReview.ts)); week complete in widget
- Day 14: statistics highlights fill (mood and sleep charts over 14 days) ([`src/features/statistics`](../src/features/statistics))
- Day 30: month report, month widget fully colored
- Day 365: year in pixels, year widget fully colored

Rules

- One nudge per install for each prompt. Dismissed means done.
- Prompts never stack on one save: store review wins, widget nudge waits for the next eligible day.
- Everything above works offline; nothing needs an account.
