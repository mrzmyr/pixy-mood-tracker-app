import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { NativeModule } from "expo-modules-core";
import type {
  ExpoSpeechTranscriberModuleEvents,
  MicrophonePermissionTypes,
  PermissionTypes,
} from "expo-speech-transcriber";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/colors";
import Providers from "@/shell/providers";
import * as speechModule from "../speech-module";
import {
  VOICE_NOTE_BUTTON_TEST_ID,
  VoiceNoteButton,
} from "../components/voice-note-button";

type Events = ExpoSpeechTranscriberModuleEvents;

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-superwall is a native module imported transitively by Providers
jest.mock(
  "expo-superwall",
  () => ({
    SuperwallExpoModule: { consume: jest.fn() },
    SuperwallProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    usePlacement: () => ({
      registerPlacement: jest.fn(),
      state: { status: "idle" },
    }),
    useSuperwall: <T,>(
      selector: (state: {
        isConfigured: boolean;
        setEventTrackingBehavior: jest.Mock;
      }) => T
    ) =>
      selector({
        isConfigured: false,
        setEventTrackingBehavior: jest.fn(),
      }),
    useSuperwallEvents: jest.fn(),
  }),
  { virtual: true }
);

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

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

const renderButton = async () => {
  const speech = new FakeSpeech();
  jest.spyOn(speechModule, "getSpeechModule").mockReturnValue(speech);
  const emit = <Name extends keyof Events>(
    name: Name,
    ...payload: Parameters<Events[Name]>
  ) => act(() => speech.emit(name, ...payload));

  // Plays the note slide: the shown text is the note at the next start.
  let note = "Tired.";
  const onText = jest.fn((text: string) => {
    note = text;
  });
  const onStop = jest.fn((text: string) => {
    note = text;
  });
  const screen = await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Providers
        supportClient={{ enabled: false, openSupport: () => Promise.resolve() }}
      >
        <VoiceNoteButton
          getNote={() => note}
          onStart={jest.fn()}
          onText={onText}
          onStop={onStop}
        />
      </Providers>
    </ThemeProvider>
  );
  return { screen, emit, onText, onStop };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("VoiceNoteButton", () => {
  test("appends spoken words to the note, live and on stop", async () => {
    const { screen, emit, onText, onStop } = await renderButton();
    const button = await screen.findByTestId(VOICE_NOTE_BUTTON_TEST_ID);

    await fireEvent.press(button);
    await waitFor(() =>
      expect(button).toHaveProp("accessibilityLabel", "Pause")
    );
    await emit("onAudioLevel", { level: 0.3 });
    await emit("onTranscriptionProgress", {
      text: "Swam with Ada",
      isFinal: false,
    });
    expect(onText).toHaveBeenLastCalledWith("Tired. Swam with Ada");

    await fireEvent.press(button);
    expect(onStop).toHaveBeenLastCalledWith("Tired. Swam with Ada");
  });

  test("a second session adds only its own words", async () => {
    const { screen, emit, onStop } = await renderButton();
    const button = await screen.findByTestId(VOICE_NOTE_BUTTON_TEST_ID);

    await fireEvent.press(button);
    await emit("onAudioLevel", { level: 0.3 });
    await emit("onTranscriptionProgress", {
      text: "Swam with Ada.",
      isFinal: true,
    });
    await fireEvent.press(button);

    await fireEvent.press(button);
    await emit("onAudioLevel", { level: 0.3 });
    await emit("onTranscriptionProgress", {
      text: "Walk with Chuky.",
      isFinal: false,
    });
    await fireEvent.press(button);

    expect(onStop).toHaveBeenLastCalledWith(
      "Tired. Swam with Ada. Walk with Chuky."
    );
  });
});
