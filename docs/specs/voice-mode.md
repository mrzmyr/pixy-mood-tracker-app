# Voice mode

Status: spec, 2026-10-15. Branch `feat/voice-mode`.

Speak about your day. Pixy transcribes on device, finds known people, tags, and emotions, then opens the logger prefilled for review.

## Decisions

- One voice note makes one entry for now (`dateTime` = now)
- Behind PostHog flag `voice-mode`. Flag off hides the mic button. Dev override in Settings > Development > Feature flags
- Platforms: iOS, Android 13+ (API 33). Older Android hides the mic button
- Transcription: [`expo-speech-transcriber`](https://github.com/DaveyEke/expo-speech-transcriber), patched with `bun patch` (see [Library patch](#library-patch))
- Transcription stays on device. Locale = app language ([`getSpeechLocales`](../../src/features/voice/speech-locale.ts))
- iOS 26+: Apple `SpeechAnalyzer` (`SpeechTranscriber`). Works with Siri off. Downloads the language model from Apple once
- iOS < 26: `SFSpeechRecognizer` on-device mode. Needs Siri on (`kLSRErrorDomain 201` "Siri and Dictation are disabled", found on device 2026-10-15). Siri off: state "voice mode needs Siri"
- Matching: on-device keyword match (option a). Swappable matcher for Apple Foundation Models later (option c, out of scope)
- Match only existing, non-archived tags, people, and enabled emotions. Unknown names are ignored. Nothing is auto-created
- People match only when flag `people` is on
- Rating is never inferred. User picks rating in the logger ([hard days](../design.md))
- Transcript goes into the entry note, editable
- Check button opens the normal logger at the rating slide, prefilled. Never saves directly
- Empty transcript: check button disabled. No matches: logger opens with note only
- Permission denied: explanation plus "Open Settings" button
- Pause stops listening. Resume appends new text to the transcript
- Waveform shows real input levels from the same mic tap. One mic owner, no `expo-audio`. The library needs a patch anyway (on-device, locale), so the patch also emits levels
- Analytics: counts and duration only. Never transcript text, names, or emotion keys

## UI

Reference: screen recording 2026-10-15 (task app voice capture). Same layout, Pixy theme colors, light and dark.

- Home: round mic button left of the "+" bubble. Same size, tertiary style. Shows only when "+" is in add state and flag `voice-mode` is on
- Voice screen: modal, route `/logs/voice`
  - Top right: [`CloseButton`](../../src/components/CloseButton.tsx). Video shows top left; [design rule](../design.md#close-button) wins
  - Top: detected items as cards, in order of first mention. Card shows person avatar, tag color dot, or emotion dot plus label and kind
  - Background: soft blob tinted with `primaryButtonBackground`, pulses with input level. Reduced motion: static
  - Bottom: "Listening…" title plus hint "Talk about your day: who you connected with, what you did, how you feel." Paused: "Paused"
  - Bottom row: pause/resume button, live waveform, check button (primary)
- Close with transcript asks to discard ([`useDiscardGuard`](../../src/hooks/useDiscardGuard.ts))
- Native module missing (web, Jest, old dev client): screen shows the failed state, never throws on import ([`speech-module.ts`](../../src/features/voice/speech-module.ts))

## Feedback

- After saving a voice check-in, a sheet asks "How was checking in by voice?" over the saved confirmation ([`VoiceFeedbackSheet`](../../src/features/feedback/components/voice-feedback-sheet.tsx))
- First 3 voice check-ins only. Each shown sheet adds `voice_feedback_1` to `_3` to `actionsDone`. Skips count
- Cancelled voice sessions get no sheet
- 3 faces: Not Great, Okay, Great. One tap sends `voice:feedback_submitted` with rating, counts, and duration
- Optional comment after a face, sent to the feedback webhook with source `voice_mode`. Never to analytics
- Skip, close, or swipe down without a face: `voice:feedback_skipped`

## Data flow

```
Calendar mic button
  -> /logs/voice (VoiceMode screen)
     useVoiceTranscription(): start/pause/resume/stop, transcript, level, status
     matchTranscript(transcript, vocabulary) -> { tags, people, emotions }
  -> check: router.replace /logs/create/[dateTime]?prefill=<json>
     LogCreate parses prefill (zod), LoggerCreate builds initial draft
     LogDraftProvider starts dirty: close asks to discard
```

- `prefill` param: `{ message: string; tags: string[]; people: string[]; emotions: string[] }` as JSON. Invalid JSON or schema: ignored, empty logger
- Prefill ids are filtered against current stores again on create

## Matcher

File: `src/features/voice/match-transcript.ts`. Pure function, unit tested.

- Normalize both sides: lowercase, strip diacritics, collapse punctuation to spaces
- Whole word match, multi word terms allowed ("left out"). Scripts without spaces (zh, ja, th): substring match
- Longest term wins on overlap
- Returns ids and keys in order of first mention, no duplicates

## Library patch

`patches/expo-speech-transcriber@0.1.9.patch`

- `recordRealTimeAndTranscribe(locale?: string)`: recognizer for given locale. Unsupported locale: error event, no crash (removes `SFSpeechRecognizer()!`)
- iOS 26+: `LiveAnalyzer.swift` runs `SpeechAnalyzer` with volatile results. Progress events carry `endsSession: false`, so JavaScript does not restart
- iOS < 26: `requiresOnDeviceRecognition = true`. Not supported for locale: `on_device_unavailable`. `kLSRErrorDomain 201`: `siri_disabled`. No server fallback
- Stale task callbacks are ignored. No speech (`1110`) and cancel (`216`, `301`) map to `no_speech`, JavaScript restarts (max 5 in a row)
- Locale problems: JavaScript tries device region, system recognizer, then main region ("en-US"), then shows the language state
- iOS: configure `AVAudioSession` (`.record`, `.measurement`) on start, deactivate on stop
- iOS: tap computes RMS per buffer, emits `onAudioLevel { level: 0...1 }` (throttled ~20 Hz)
- Android: `EXTRA_LANGUAGE` from locale param, `EXTRA_PREFER_OFFLINE = true`, `onRmsChanged` emits `onAudioLevel`
- Final result ends one segment. JavaScript commits the segment and restarts while not paused (Android stops after silence, iOS caps one task at ~1 min)
- iOS 18+ restarts partial text after a pause in one task. A partial that does not continue the previous one commits the previous one ([`transcript.ts`](../../src/features/voice/transcript.ts))

## Errors

Every error has `status`, `message`, `why`, `fix` ([AGENTS.md](../../AGENTS.md#errors)).

- `voice_permission_denied`, `voice_recognizer_unavailable`, `voice_on_device_unavailable`, `voice_siri_disabled`, `voice_transcription_failed`
- Failures go to `console.error` and Sentry. `why` holds the native message and locale, never speech

## Analytics

- `voice:flow_started`
- `voice:flow_cancelled` `{ duration_ms, transcript_length }`
- `voice:flow_finished` `{ duration_ms, transcript_length, tags_count, people_count, emotions_count }`
- `voice:permission_denied` `{ kind: "microphone" | "speech" }`
- `voice:failed` `{ status }`
- `voice:feedback_submitted` `{ rating, prompt_index, duration_ms, tags_count, people_count, emotions_count }`
- `voice:feedback_skipped` `{ prompt_index }`

## Out of scope

- Apple Foundation Models matcher (option c)
- Rating inference, multi day split, auto-create people or tags
- Storing audio

## Verification

Result 2026-10-15: preview Release builds (EAS local), iPhone 16e (iOS 26, Siri off) records, iPhone 14 Pro plays TTS clips from Safari. Fixture `people`, flags `people` and `voice-mode` on.

### Automated

- [x] `matchTranscript` unit tests: case, diacritics, whole words, multi word, overlap, order, duplicates, unknown names, no-space scripts
- [x] Prefill parsing tests: valid, invalid JSON, unknown and duplicate ids dropped
- [x] Transcript tests: partials replace, finals commit, resume appends, restart after pause keeps text
- [x] Speech locale order tests
- [x] `bun run check` passes (lint, format, types, locales)
- [x] `bun run test:ci` passes

### Real device (two iPhones)

Clip 1: "Today was a long day at work. In the morning I did some sport. Then I called Mia and talked to Sam. I met Lisa for coffee. Honestly, I felt stressed, but also grateful, and a bit tired." Clip 2: "In the evening I had dinner with my family and felt calm."

- [x] Mic button shows left of "+", hidden with flag off
- [x] First tap asks speech recognition, then microphone permission. Purpose strings show
- [x] Waveform moves with clip audio, flat in silence
- [x] Cards appear live in order of mention: Work, Sport, Sam, Stressed, Grateful, Tired
- [x] Unknown name (Lisa) and archived person (Mia): no card
- [x] Pause keeps cards. Resume plus clip 2 appends Family, Calm
- [x] 6 min of silence: still listening, no text, no error
- [x] Check opens logger at rating slide. Note holds both clips. Tags, emotions, person preselected
- [x] Save: day view shows Sam, Work, Sport, Family, 5 emotions, full note
- [x] Close logger without saving: discard prompt
- [x] iOS 26 with Siri off works (SpeechAnalyzer). Legacy path with Siri off fails with `kLSRErrorDomain 201`, now shows the Siri state
- [ ] Airplane mode: not tested. Both engines run on device by API contract (`requiresOnDeviceRecognition`, SpeechAnalyzer)
- [ ] Deny permission: not tested on device
- [ ] iOS < 26 legacy path with Siri on: tested on build 3 before SpeechAnalyzer, not on the final build
- [ ] Android: not tested
- [x] Proof: screenshots plus screen recording in PR
- [x] Feedback sheet shows ~1 s after save, over the confirmation. Face tap shows comment field and Done. Done shows "Thanks for your feedback!" toast
- [ ] Feedback comment keyboard autofocus: fixed after the device run, not rebuilt
- [ ] Feedback sheet on voice check-ins 2 to 4: unit test only (`voiceFeedbackPrompt`)
