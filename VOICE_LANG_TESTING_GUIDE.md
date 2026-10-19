# Voice Language Support Testing Guide

## Overview
This guide describes how to test German language support in voice mode, as part of PIX-24.

## Code Changes Summary

### 1. Translation Keys Added
Added 5 new translation keys for error fix messages:
- `voice_fix_permission_denied`
- `voice_fix_recognizer_unavailable`
- `voice_fix_siri_disabled`
- `voice_fix_on_device_unavailable`
- `voice_fix_transcription_failed`

These keys now exist in:
- English (en.json) - original translations
- German (de.json) - proper German translations
- All other locales - English fallback

### 2. Code Updates
- `src/features/voice/use-voice-transcription.ts`:
  - Imported `t` function from `@/lib/translation`
  - Replaced hardcoded English `FIXES` object with `getFix()` function
  - `getFix()` returns translated error fix messages based on error status

### 3. German Transcript Tests
Added comprehensive test cases in `src/features/voice/__tests__/match-transcript.ts`:
- Umlauts (ü, ö, ä, ß) matching
- Compound words (Arbeitsstress, Familienleben)
- Plural vs singular forms (Freund vs Freunde)
- Case insensitivity with German characters
- Partial word rejection (non-matches)

## Manual Testing on Device

### Prerequisites
- iOS device with iOS 13+ or Android 13+ device
- Pixy app installed with this branch
- German language configured (see setup below)

### Setup Steps

#### Option A: Test with Device in German
1. Go to iOS Settings > General > Language & Region
2. Add German (Deutsch) if not present
3. Set German as the primary language
4. Restart the device
5. Open Pixy app (it should now be in German)

#### Option B: Test with App in German (Device in English)
1. In Pixy settings, change app language to German
2. Ensure dictation is set up:
   - iOS Settings > General > Keyboard > Dictation Languages
   - Add "Deutsch (Deutschland)" if not present
   - Download the language model when prompted

### Test Cases

#### Test 1: Basic German Transcription
1. Open voice mode in Pixy
2. Grant microphone permissions when prompted
3. Speak in German: "Ich bin müde" (I am tired)
4. Verify "Müde" emotion is detected and shown

#### Test 2: German Umlauts
1. Create tags/emotions with umlauts:
   - Tag: "Übung" (exercise)
   - Person: "Jürgen"
2. In voice mode, say: "Heute Übung mit Jürgen gemacht"
3. Verify both are detected correctly

#### Test 3: Compound Words
1. Create tag: "Arbeitsstress" (work stress)
2. In voice mode, say: "Viel Arbeitsstress heute"
3. Verify "Arbeitsstress" tag is detected

#### Test 4: Error Messages in German
1. Test permission denied:
   - Deny microphone permission
   - Open voice mode
   - Verify error message and fix text are in German
   
2. Test language not available:
   - Remove German from dictation languages
   - Try to use voice mode
   - Verify error shows German message suggesting to add language

#### Test 5: Case Insensitivity
1. Create emotion: "Glücklich" (happy)
2. Say in various cases:
   - "ich bin GLÜCKLICH"
   - "Ich bin glücklich"
   - "Ich bin GlÜcKlIcH"
3. All should detect the emotion

#### Test 6: Plural Forms
1. Create tag "Freunde" (friends)
2. Create person "Freund" (friend)
3. Say: "Mit Freund unterwegs" - should detect person
4. Say: "Mit Freunden unterwegs" - should detect tag
5. Say: "Freund und andere Freunde" - should detect both

### Expected Results

#### Success Criteria
- ✅ Voice mode understands German speech
- ✅ Terms with umlauts (ü, ö, ä, ß) are matched correctly
- ✅ Compound German words are recognized
- ✅ Case variations are handled
- ✅ Error messages appear in German
- ✅ Error fix instructions are in German
- ✅ All existing English functionality still works

#### Known Limitations
- The app must have the German dictation language downloaded
- Recognition quality depends on iOS/Android speech recognition
- Background noise may affect recognition in any language

## Automated Testing

### Unit Tests
Run the German transcript tests:
```bash
npm test src/features/voice/__tests__/match-transcript.ts
```

Expected: All German language tests pass, including:
- `matches German terms with umlauts`
- `matches German compound words`
- `matches German plural and singular forms independently`
- `ignores case for German terms with umlauts`
- `matches German terms with ß (eszett)`
- `does not match partial German words`

## Locale Testing

### Verify All Locales Have Keys
```bash
node -e "
const fs = require('fs');
const keys = ['voice_fix_permission_denied', 'voice_fix_recognizer_unavailable', 'voice_fix_siri_disabled', 'voice_fix_on_device_unavailable', 'voice_fix_transcription_failed'];
const locales = fs.readdirSync('./assets/locales').filter(f => f.endsWith('.json'));
for (const locale of locales) {
  const json = JSON.parse(fs.readFileSync(\`./assets/locales/\${locale}\`, 'utf8'));
  const missing = keys.filter(k => !json[k]);
  if (missing.length > 0) {
    console.log(\`\${locale}: Missing keys:\`, missing);
  } else {
    console.log(\`\${locale}: ✓ All keys present\`);
  }
}
"
```

## PR Requirements Checklist

Per PIX-24 requirements:

### Screenshots Required
- [ ] BEFORE: Voice mode error message in English
- [ ] AFTER: Voice mode error message in German
- [ ] AFTER: German term detection working (show detected tags/emotions)

### Videos Required
- [ ] BEFORE: Voice mode session in English showing error
- [ ] AFTER: Voice mode session in German showing:
  - German speech recognition working
  - German terms being detected (umlauts, compounds)
  - German error messages (if triggered)
  - Successful check-in creation with German transcript

### Testing Verification
- [ ] Tested on real iOS device with German
- [ ] Tested on real Android device with German (if available)
- [ ] All unit tests pass
- [ ] Existing English voice mode still works
- [ ] Error messages are properly translated

## Troubleshooting

### "Language not available" Error
- Ensure German dictation is downloaded in iOS Settings
- Try toggling Siri language to German and back
- Restart the device

### Recognition Not Working
- Check microphone permissions
- Verify dictation language is German in device settings
- Try speaking more clearly or slowly
- Check background noise levels

### Terms Not Detected
- Verify terms exist in the app (tags/people/emotions)
- Check spelling matches exactly (including umlauts)
- Ensure terms are not archived
- Try speaking the full word clearly

## Additional Languages

The same approach can be extended to other languages:
1. Add language-specific tests in `match-transcript.ts`
2. Verify locale exists in `translation.ts`
3. Ensure dictation language is commonly available on devices
4. Test with native speakers when possible
