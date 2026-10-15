# Voice mode

Status: spec, 2026-10-15. Branch `feat/voice-mode`.

Speak about your day. Pixy transcribes on device, finds known people, tags, and emotions, then opens the logger prefilled for review.

## Decisions

- One voice note makes one entry for now (`dateTime` = now)
- Behind PostHog flag `voice-mode`. Flag off hides the mic button. Dev override in Settings > Development > Feature flags
- Platforms: iOS, Android 13+ (API 33). Older Android hides the mic button
- Transcription: [`expo-speech-transcriber`](https://github.com/DaveyEke/expo-speech-transcriber), patched with `bun patch` (see [Library patch](#library-patch))
- Transcription stays on device. Locale = app language (`getLocale()`)
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
- Native module missing (web, Jest, old dev client): screen shows the failed state, never throws on import ([`speechModule.ts`](../../src/features/voice/speechModule.ts))

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

File: `src/features/voice/matchTranscript.ts`. Pure function, unit tested.

- Normalize both sides: lowercase, strip diacritics, collapse punctuation to spaces
- Whole word match, multi word terms allowed ("left out"). Scripts without spaces (zh, ja, th): substring match
- Longest term wins on overlap
- Returns ids and keys in order of first mention, no duplicates

## Library patch

`patches/expo-speech-transcriber@0.1.9.patch`

- `recordRealTimeAndTranscribe(locale?: string)`: recognizer for given locale. Unsupported locale: error event, no crash (removes `SFSpeechRecognizer()!`)
- iOS: `requiresOnDeviceRecognition = true` when supported. Not supported for locale, or `kLSRErrorDomain 201`: error `on_device_unavailable`, no server fallback
- JavaScript retries once with the system recognizer (no locale = Siri and Dictation language), then shows the language state
- iOS: configure `AVAudioSession` (`.record`, `.measurement`) on start, deactivate on stop
- iOS: tap computes RMS per buffer, emits `onAudioLevel { level: 0...1 }` (throttled ~20 Hz)
- Android: `EXTRA_LANGUAGE` from locale param, `EXTRA_PREFER_OFFLINE = true`, `onRmsChanged` emits `onAudioLevel`
- Final result ends one segment. JavaScript commits the segment and restarts while not paused (Android stops after silence, iOS caps one task at ~1 min)

## Errors

Every error has `status`, `message`, `why`, `fix` ([AGENTS.md](../../AGENTS.md#errors)).

- `voice_permission_denied`, `voice_recognizer_unavailable`, `voice_on_device_unavailable`, `voice_transcription_failed`

## Analytics

- `voice:flow_started`
- `voice:flow_cancelled` `{ duration_ms, transcript_length }`
- `voice:flow_finished` `{ duration_ms, transcript_length, tags_count, people_count, emotions_count }`
- `voice:permission_denied` `{ kind: "microphone" | "speech" }`
- `voice:failed` `{ status }`

## Out of scope

- Apple Foundation Models matcher (option c)
- Rating inference, multi day split, auto-create people or tags
- Storing audio

## Verification

### Automated

- [ ] `matchTranscript` unit tests: case, diacritics, multi word, overlap, order, duplicates, archived excluded, disabled emotions excluded, people off, no-space scripts
- [ ] Prefill parsing tests: valid, invalid JSON, unknown ids dropped
- [ ] Transcript segment logic tests: partials replace, finals commit, resume appends
- [ ] `bun run check` passes (lint, format, types, locales)
- [ ] `bun run test:ci` passes

### Real device (two iPhones)

Setup: iPhone A runs dev build with flag `voice-mode` and `people` on. iPhone B plays TTS clip on speaker, ~20 cm from iPhone A.

Clip text uses names from iPhone A data: one person, one tag, two emotions, one unknown name.

- [ ] Mic button shows left of "+", hidden with flag off
- [ ] First tap asks microphone and speech permission
- [ ] Waveform moves with clip audio, flat in silence
- [ ] Transcript cards appear live in order: person, tag, emotions
- [ ] Unknown name: no card
- [ ] Pause stops cards and waveform. Resume plus second clip appends
- [ ] Airplane mode: transcription still works (on device)
- [ ] Check opens logger at rating slide. Note holds transcript. Tags, people, emotions preselected
- [ ] Pick rating, save: entry in calendar with all items
- [ ] Close logger without saving: discard prompt
- [ ] Deny permission (Settings reset): explanation plus Open Settings button
- [ ] Proof: screenshots plus screen recording from iPhone A in PR
