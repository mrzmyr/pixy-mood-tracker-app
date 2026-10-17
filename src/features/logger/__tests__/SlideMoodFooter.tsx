import { fireEvent, render, screen } from "@testing-library/react-native";
import dayjs from "dayjs";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { _generateItem } from "@/__tests__/utils";
import Colors from "@/constants/Colors";
import { getShortItemDateTitle } from "@/lib/utils";
import type { LogItem } from "@/features/logs";
import type { LogLocation } from "@/types";
import { LogDraftProvider } from "../logDraft";
import { SlideMoodFooter } from "../components/SlideMoodFooter";

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderFooter = ({
  location,
  dateTime,
  isLocating = false,
}: {
  location?: LogLocation;
  dateTime?: LogItem["dateTime"];
  isLocating?: boolean;
}) =>
  render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <ThemeProvider
        value={{
          ...DefaultTheme,
          dark: false,
          colors: { ...DefaultTheme.colors, ...Colors.light },
        }}
      >
        <LogDraftProvider initialDraft={_generateItem({ location, dateTime })}>
          <SlideMoodFooter
            isLocationVisible
            isLocating={isLocating}
            isActionVisible={false}
          />
        </LogDraftProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );

describe("SlideMoodFooter location button", () => {
  test("names the place for screen readers without showing text", async () => {
    await renderFooter({
      location: { latitude: 53.55, longitude: 10, name: "Hamburg" },
    });

    expect(await screen.findByTestId("logger-location")).toHaveProp(
      "accessibilityLabel",
      "Hamburg"
    );
    expect(screen.queryByText("Hamburg")).toBeNull();
  });

  test("offers adding a location when the entry has none", async () => {
    await renderFooter({});

    expect(await screen.findByTestId("logger-location")).toHaveProp(
      "accessibilityLabel",
      "Add Location"
    );
    expect(screen.queryByText("Add Location")).toBeNull();
  });

  test("says it is locating while the position loads", async () => {
    await renderFooter({ isLocating: true });

    expect(await screen.findByTestId("logger-location")).toHaveProp(
      "accessibilityLabel",
      "Locating…"
    );
    expect(screen.queryByText("Locating…")).toBeNull();
  });
});

describe("SlideMoodFooter time menu", () => {
  test("Evening moves a past entry to 20:00 on its own day", async () => {
    const day = dayjs().subtract(3, "day").hour(9).minute(37);
    await renderFooter({ dateTime: day.toISOString() });

    await fireEvent.press(
      await screen.findByRole("menuitem", { name: "Evening" })
    );

    expect(
      screen.getByText(
        getShortItemDateTitle(day.hour(20).startOf("hour").toISOString()),
        { includeHiddenElements: true }
      )
    ).toBeTruthy();
  });
});
