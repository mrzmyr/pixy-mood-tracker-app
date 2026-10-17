import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { createRef } from "react";
import type { CarouselRef } from "react-native-reanimated-carousel";
import { _generateItem } from "@/__tests__/utils";
import Colors from "@/constants/Colors";
import Alert from "@/lib/Alert";
import { SettingsProvider, useSettingsLoad } from "@/state/settings";
import { LoggerHeader } from "../components/LoggerHeader";
import type { LogDraft } from "../finalizeDraft";
import { LogDraftProvider } from "../logDraft";

const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

const pressAlertButton = (style: "cancel" | "destructive") => {
  const buttons = alertSpy.mock.lastCall?.[2] ?? [];
  buttons.find((button) => button.style === style)?.onPress?.();
};

// Mood only: no note, tags, people, emotions, photos, or sleep.
const moodOnly: LogDraft = {
  ..._generateItem({ rating: "good", message: "" }),
  sleep: { quality: null },
};

// The app mounts the logger only after settings load, like this gate.
const SettingsLoaded = ({ children }: { children: React.ReactNode }) =>
  useSettingsLoad().status === "ready" ? children : null;

const renderHeader = (onRemove: () => void) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <SettingsLoaded>
          <LogDraftProvider initialDraft={moodOnly}>
            <LoggerHeader
              carouselRef={createRef<CarouselRef>()}
              slideCount={1}
              slideIndex={0}
              isEditing
              onCancel={() => {}}
              onRemove={onRemove}
            />
          </LogDraftProvider>
        </SettingsLoaded>
      </SettingsProvider>
    </ThemeProvider>
  );

describe("LoggerHeader delete", () => {
  beforeEach(() => alertSpy.mockClear());

  test("asks before deleting a mood-only entry", async () => {
    const onRemove = jest.fn();
    await renderHeader(onRemove);

    fireEvent.press(await screen.findByTestId("logger-delete"));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();

    pressAlertButton("destructive");
    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1));
  });

  test("keeps the entry when the user cancels", async () => {
    const onRemove = jest.fn();
    await renderHeader(onRemove);

    fireEvent.press(await screen.findByTestId("logger-delete"));
    pressAlertButton("cancel");

    // Let the rejected prompt settle before checking.
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
