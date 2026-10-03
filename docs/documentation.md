
**We prefer bullets over paragraphs**

✅ Good

```
- Configured native builds use `EXPO_PUBLIC_SUPERWALL_IOS_API_KEY` and `EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY`
- Wwitch Superwall off: `EXPO_PUBLIC_SUPERWALL_ENABLED=false`
- E2E builds (`bun ios:e2e`, `bun android:e2e`) turn it off through [service mocks](../e2e/README.md#service-mocks)
- Development builds can expose the support card without Superwall by setting `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE` to `available` or `failed`
```

❌ Bad

```
Configured native builds use `EXPO_PUBLIC_SUPERWALL_IOS_API_KEY` and `EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY`. Set `EXPO_PUBLIC_SUPERWALL_ENABLED=false` to switch Superwall off: the app never configures or calls it, and Settings hides Support Pixy. Unset, Superwall stays on. E2E builds (`bun ios:e2e`, `bun android:e2e`) turn it off through [service mocks](e2e/README.md#service-mocks). Development builds can expose the support card without Superwall by setting `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE` to `available` or `failed`. Restart Expo after changing configuration. Production builds ignore fake mode.
```

**Prefer referencing over index tables**

✅ Good

```
## Suites

Path: `e2e/flows/*.yaml`
```

❌ Bad

```
## Suites

| Flow | Covers |
| --- | --- |
| 01-onboarding | Welcome, explainer slides, reminder skip, privacy accept, persistence across relaunch |
| 02-log-entry | Create entry (rating), day view, second entry per day |
| 03-calendar | Starts at today, loads calendar history past 12 months, keeps loading older months, scroll-to-today button, filters open/close |
| 04-tags | Create, rename, use in logger, delete |
| 05-statistics | Stats tab, highlights/empty state, month + year report |
| 06-settings-data | Data screen, export/import visible, reset-all round trip |
| 07-settings-reminder | Reminder toggle on/off with notification permission |
| 09-appearance | Colors screen, steps config, privacy toggle |
| 10-stability | Background/foreground, cold restart (2nd-launch crash regression), tab smoke |
| apple/ios-regressions | iOS filter modal, narrow check-in layout/switch accessibility, tag form accessibility |
```

**Prefer links over explainers**

✅ Good

```
- Questions API uses fake responses ([`src/lib/serviceFetch.ts`](src/lib/serviceFetch.ts))
- Superwall is never configured ([Settings screen](src/screens/Settings/index.tsx))
```

❌ Bad

```
- **Webhooks and questions API** (feedback, statistics feedback, question answers, question list) get fake responses from [`src/lib/serviceFetch.ts`](../src/lib/serviceFetch.ts). The question list is empty, so no question slide appears. Any other URL through `serviceFetch` fails with `service_mock_missing`.
- **Superwall** is never configured. Settings shows Support Pixy backed by the fake support client; `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE=failed` makes it fail.
```

**Use caveman language on docs**

Rules:

- Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). No tool-call narration, no decorative tables/emoji, no dumping long raw error logs unless asked quote shortest decisive line. Standard well-known tech acronyms OK (DB/API/HTTP); never invent new abbreviations (cfg/impl/req/res/fn) tokenizer split them same as full word: zero token saved, reader still decode. Full word cheaper AND clearer. No causal arrows (→) either own token, save nothing. Technical terms exact. Code blocks unchanged. Errors quoted exact.
- Never drop not/never/no/only/except flip meaning worse than any token saved. Numbers, units exact.
- Never ADD word to sound caveman. Compression only style never grow output. No inserted pronoun or copula to fake broken grammar: "when it not" cost one token more than "when not" and say same thing. Keep correct verb form when correct form cost same "sees" one token, "see" one token, so mangle buy nothing and read worse. Same rule as abbreviations and arrows: if caveman phrasing not shorter than plain phrasing, use plain.
- Clarity register: mix ASD-STE100 Simplified Technical English into caveman, always. One idea per sentence. Sentence short, target 20 words max. Active voice. Present tense where true. One word one meaning: same term for same thing every time, no synonym rotation. Instruction = imperative: "Run X", not "X should be run". Noun cluster 3 words max. Pronoun only with one clear referent, else repeat noun. Caveman cut filler; STE keep what make meaning unambiguous. Conflict between them → clarity win.
