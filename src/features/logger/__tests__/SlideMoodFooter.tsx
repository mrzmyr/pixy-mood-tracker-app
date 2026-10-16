import { render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { _generateItem } from "@/__tests__/utils";
import Colors from "@/constants/Colors";
import type { LogLocation } from "@/types";
import { LogDraftProvider } from "../logDraft";
import { SlideMoodFooter } from "../components/SlideMoodFooter";

const renderFooter = ({
  location,
  isLocating = false,
}: {
  location?: LogLocation;
  isLocating?: boolean;
}) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <LogDraftProvider initialDraft={_generateItem({ location })}>
        <SlideMoodFooter
          isLocationVisible
          isLocating={isLocating}
          isActionVisible={false}
        />
      </LogDraftProvider>
    </ThemeProvider>
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
