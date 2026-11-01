import { act, renderHook } from "@testing-library/react-native";
import { NativeModule } from "expo-modules-core";
import type {
  ExpoSpeechTranscriberModuleEvents,
  MicrophonePermissionTypes,
  PermissionTypes,
} from "expo-speech-transcriber";
import * as speechModule from "../speech-module";
import {
  PREPARE_TIMEOUT_MS,
  useVoiceTranscription,
} from "../use-voice-transcription";

type Events = ExpoSpeechTranscriberModuleEvents;

class FakeSpeech extends NativeModule<Events> {
  recordRealTimeAndTranscribe = jest.fn(() => Promise.resolve());
  stopListening = jest.fn();
  transcribeAudioWithSFRecognizer = jest.fn(() => Promise.resolve(""));
  transcribeAudioWithAnalyzer = jest.fn(() => Promise.resolve(""));
  requestPermissions = jest.fn(() =>
    Promise.resolve<PermissionTypes>("authorized")
  );
  requestMicrophonePermissions = jest.fn(() =>
    Promise.resolve<MicrophonePermissionTypes>("granted")
  );
  isRecording = jest.fn(() => false);
  isAnalyzerAvailable = jest.fn(() => true);
}

const fakeSpeech = () => {
  const speech = new FakeSpeech();
  jest.spyOn(speechModule, "getSpeechModule").mockReturnValue(speech);
  const emit = <Name extends keyof Events>(
    name: Name,
    ...payload: Parameters<Events[Name]>
  ) => act(() => speech.emit(name, ...payload));
  return { speech, emit };
};

describe("useVoiceTranscription", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("stays preparing until the microphone sends a level", async () => {
    const { emit } = fakeSpeech();
    const { result } = await renderHook(() => useVoiceTranscription());

    await act(() => result.current.start());
    expect(result.current.status).toBe("preparing");

    await emit("onAudioLevel", { level: 0.2 });
    expect(result.current.status).toBe("listening");
  });

  it("pauses during setup and ignores a late microphone start", async () => {
    const { speech, emit } = fakeSpeech();
    const { result } = await renderHook(() => useVoiceTranscription());

    await act(() => result.current.start());
    await act(() => result.current.pause());
    expect(result.current.status).toBe("paused");
    expect(speech.stopListening).toHaveBeenCalled();

    await emit("onAudioLevel", { level: 0.2 });
    expect(result.current.status).toBe("paused");
  });

  it("fails when the microphone does not start in time", async () => {
    const { speech } = fakeSpeech();
    const onFailed = jest.fn();
    const { result } = await renderHook(() =>
      useVoiceTranscription({ onFailed })
    );

    await act(() => result.current.start());
    await act(() => jest.advanceTimersByTime(PREPARE_TIMEOUT_MS));

    expect(result.current.status).toBe("failed");
    expect(speech.stopListening).toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalledWith(
      expect.objectContaining({ status: "voice_transcription_failed" })
    );
  });

  it("reports a locale error that arrives during setup", async () => {
    const { speech, emit } = fakeSpeech();
    const { result } = await renderHook(() => useVoiceTranscription());

    await act(() => result.current.start());
    await emit("onTranscriptionError", {
      message: "no model",
      code: "recognizer_unavailable",
    });

    // Moves to the next locale instead of failing.
    expect(speech.recordRealTimeAndTranscribe).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("preparing");
  });
});
