import { requireOptionalNativeModule } from "expo";
import type { ExpoSpeechTranscriberModule } from "expo-speech-transcriber";

/**
 * Native speech module, or `null` where it is missing: web, Jest, and dev
 * clients built before voice mode. Loaded lazily, so importing voice mode
 * never throws.
 */
export const getSpeechModule = () =>
  requireOptionalNativeModule<typeof ExpoSpeechTranscriberModule>(
    "ExpoSpeechTranscriber"
  );
