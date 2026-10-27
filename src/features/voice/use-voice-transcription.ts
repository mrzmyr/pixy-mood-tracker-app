import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { reportError } from "@/lib/report-error";
import { useSharedValue, withTiming } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { createStructuredError } from "@/lib/errors";
import type { StructuredError } from "@/lib/errors";
import {
  applyResult,
  commitPartial,
  EMPTY_TRANSCRIPT,
  transcriptText,
} from "./transcript";
import type { TranscriptState } from "./transcript";
import { getSpeechLocales } from "./speech-locale";
import { getSpeechModule } from "./speech-module";

/** Lifecycle of voice mode listening. `denied` and `failed` need user action. */
export type VoiceStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "paused"
  | "denied"
  | "failed";

/** `status` of voice mode errors. */
export type VoiceErrorStatus =
  | "voice_permission_denied"
  | "voice_recognizer_unavailable"
  | "voice_on_device_unavailable"
  | "voice_siri_disabled"
  | "voice_transcription_failed";

// Native level is linear over -50..0 dB (iOS) or -2..10 dB (Android). Speech
// near the mic sits in the lower half, so room noise maps to 0 and normal
// speech fills most of the range.
const LEVEL_FLOOR = 0.15;
const LEVEL_CEILING = 0.6;
const toDisplayLevel = (raw: number) => {
  const value = (raw - LEVEL_FLOOR) / (LEVEL_CEILING - LEVEL_FLOOR);
  return Math.sqrt(Math.min(1, Math.max(0, value)));
};

// Maps native error codes of the patched library.
const toErrorStatus = (code: string | undefined): VoiceErrorStatus => {
  switch (code) {
    case "permission_denied": {
      return "voice_permission_denied";
    }
    case "recognizer_unavailable": {
      return "voice_recognizer_unavailable";
    }
    case "on_device_unavailable": {
      return "voice_on_device_unavailable";
    }
    case "siri_disabled": {
      return "voice_siri_disabled";
    }
    default: {
      return "voice_transcription_failed";
    }
  }
};

const MAX_EMPTY_RESTARTS = 5;

const FIXES: Record<VoiceErrorStatus, string> = {
  voice_permission_denied:
    "Allow microphone and speech recognition in Settings",
  voice_recognizer_unavailable:
    "Add the dictation language in iOS Settings > General > Keyboard, or switch the app language",
  voice_siri_disabled: "Turn on Siri in iOS Settings, or update to iOS 26",
  voice_on_device_unavailable:
    "Add the dictation language in iOS Settings > General > Keyboard, or switch the app language",
  voice_transcription_failed: "Close voice mode and try again",
};

const voiceError = (
  status: VoiceErrorStatus,
  why: string
): StructuredError<VoiceErrorStatus> =>
  createStructuredError({
    status,
    message: "Voice transcription failed",
    why,
    fix: FIXES[status],
  });

/** Report a voice failure. `why` holds the native message, never speech. */
const reportFailure = (failure: StructuredError<VoiceErrorStatus>) => {
  console.error(failure);
  reportError(failure);
};

/**
 * Live, on-device transcription for voice mode.
 *
 * Restarts the recognizer after each final result while listening, so long
 * notes and Android silence timeouts keep going. `level` is the live input
 * level, 0 to 1, for the waveform.
 */
export const useVoiceTranscription = ({
  onPermissionDenied,
  onFailed,
}: {
  onPermissionDenied?: (kind: "microphone" | "speech") => void;
  onFailed?: (error: StructuredError<VoiceErrorStatus>) => void;
} = {}) => {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<StructuredError<VoiceErrorStatus>>();
  const [transcript, setTranscript] =
    useState<TranscriptState>(EMPTY_TRANSCRIPT);
  // Mirror for `stop`, which returns the text in the same event.
  const transcriptRef = useRef<TranscriptState>(EMPTY_TRANSCRIPT);
  const level: SharedValue<number> = useSharedValue(0);
  const latestLevel = useRef(0);
  // Restarts without any text in between. Stops a restart loop.
  const emptyRestarts = useRef(0);
  // Index into `getSpeechLocales()`. Moves on when a locale has no model.
  const localeIndex = useRef(0);
  const statusRef = useRef<VoiceStatus>("idle");
  const callbacks = useRef({ onPermissionDenied, onFailed });
  useEffect(() => {
    callbacks.current = { onPermissionDenied, onFailed };
  }, [onPermissionDenied, onFailed]);

  const setStatusBoth = useCallback((next: VoiceStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const updateTranscript = useCallback(
    (change: (current: TranscriptState) => TranscriptState) => {
      transcriptRef.current = change(transcriptRef.current);
      setTranscript(transcriptRef.current);
    },
    []
  );

  const startSegment = useCallback(async () => {
    try {
      await getSpeechModule()?.recordRealTimeAndTranscribe(
        getSpeechLocales()[localeIndex.current] ?? null
      );
    } catch (cause) {
      const failure = voiceError(
        "voice_transcription_failed",
        cause instanceof Error ? cause.message : "Recognizer did not start"
      );
      setError(failure);
      setStatusBoth("failed");
      reportFailure(failure);
      callbacks.current.onFailed?.(failure);
    }
  }, [setStatusBoth]);

  useEffect(() => {
    const speech = getSpeechModule();
    if (!speech) {
      return;
    }
    const progress = speech.addListener(
      "onTranscriptionProgress",
      (payload) => {
        if (statusRef.current !== "listening") {
          return;
        }
        emptyRestarts.current = 0;
        updateTranscript((current) => applyResult(current, payload));
        // Legacy recognizers stop after a final result. SpeechAnalyzer keeps
        // running (`endsSession: false`).
        if (payload.isFinal && payload.endsSession !== false) {
          // The recognizer stopped itself. Keep listening in a new segment.
          startSegment();
        }
      }
    );
    const levels = speech.addListener("onAudioLevel", ({ level: raw }) => {
      const next = toDisplayLevel(raw);
      latestLevel.current = next;
      level.set(withTiming(next, { duration: 80 }));
    });
    const errors = speech.addListener(
      "onTranscriptionError",
      ({ message, code }) => {
        if (statusRef.current !== "listening") {
          return;
        }
        // Android: silence ends a segment with "no speech". Keep listening.
        if (
          code === "no_speech" &&
          emptyRestarts.current < MAX_EMPTY_RESTARTS
        ) {
          emptyRestarts.current += 1;
          updateTranscript(commitPartial);
          startSegment();
          return;
        }
        const errorStatus = toErrorStatus(code);
        const isLocaleProblem =
          errorStatus === "voice_on_device_unavailable" ||
          errorStatus === "voice_recognizer_unavailable";
        if (
          isLocaleProblem &&
          localeIndex.current < getSpeechLocales().length - 1
        ) {
          localeIndex.current += 1;
          startSegment();
          return;
        }
        const failure = voiceError(errorStatus, message);
        updateTranscript(commitPartial);
        setError(failure);
        setStatusBoth(
          failure.status === "voice_permission_denied" ? "denied" : "failed"
        );
        reportFailure(failure);
        callbacks.current.onFailed?.(failure);
      }
    );
    return () => {
      progress.remove();
      levels.remove();
      errors.remove();
      speech.stopListening();
    };
  }, [level, setStatusBoth, startSegment, updateTranscript]);

  /** Ask for permissions, then listen. */
  const start = useCallback(async () => {
    const speech = getSpeechModule();
    if (!speech) {
      const failure = voiceError(
        "voice_recognizer_unavailable",
        "Speech module is missing from this build"
      );
      setError(failure);
      setStatusBoth("failed");
      reportFailure(failure);
      callbacks.current.onFailed?.(failure);
      return;
    }
    setStatusBoth("requesting");
    if (Platform.OS === "ios") {
      const permission = await speech.requestPermissions();
      if (permission !== "authorized") {
        setStatusBoth("denied");
        callbacks.current.onPermissionDenied?.("speech");
        return;
      }
    }
    const microphone = await speech.requestMicrophonePermissions();
    if (microphone !== "granted") {
      setStatusBoth("denied");
      callbacks.current.onPermissionDenied?.("microphone");
      return;
    }
    setError(undefined);
    emptyRestarts.current = 0;
    setStatusBoth("listening");
    startSegment();
  }, [setStatusBoth, startSegment]);

  const pause = useCallback(() => {
    setStatusBoth("paused");
    getSpeechModule()?.stopListening();
    updateTranscript(commitPartial);
    level.set(withTiming(0, { duration: 150 }));
  }, [level, setStatusBoth, updateTranscript]);

  const resume = useCallback(() => {
    emptyRestarts.current = 0;
    setStatusBoth("listening");
    startSegment();
  }, [setStatusBoth, startSegment]);

  /** Stop listening and return the full transcript. */
  const stop = useCallback(() => {
    setStatusBoth("paused");
    getSpeechModule()?.stopListening();
    updateTranscript(commitPartial);
    return transcriptText(transcriptRef.current);
  }, [setStatusBoth, updateTranscript]);

  return {
    status,
    error,
    text: transcriptText(transcript),
    level,
    /** Latest level for JavaScript readers, such as the waveform. */
    getLevel: useCallback(() => latestLevel.current, []),
    start,
    pause,
    resume,
    stop,
  };
};
