import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { _generateItem } from "@/__tests__/utils";
import Colors from "@/constants/Colors";
import { EMOTIONS } from "@/features/logger";
import { PeopleProvider } from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { SettingsProvider, useSettingsLoad } from "@/state/settings";
import type { LogItem } from "@/features/logs";
import { TimelineEntry } from "../screens/Calendar/Timeline/TimelineEntry";

const Loaded = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSettingsLoad();
  return status === "ready" ? children : null;
};

const renderEntry = async (item: LogItem, onPress = jest.fn()) => {
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <TagsProvider>
          <PeopleProvider>
            <Loaded>
              <TimelineEntry item={item} onPress={onPress} />
            </Loaded>
          </PeopleProvider>
        </TagsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
  await waitFor(() => {
    expect(screen.getByTestId(`timeline-entry-${item.id}`)).toBeTruthy();
  });
  return onPress;
};

describe("timeline entry card", () => {
  test("shows the place on a map tile and names it for screen readers", async () => {
    const item = _generateItem({
      message: "",
      location: { latitude: 52.52, longitude: 13.405, name: "Mitte, Berlin" },
    });

    await renderEntry(item);

    expect(screen.getByTestId("place-preview")).toBeTruthy();
    expect(screen.getByText("Mitte, Berlin")).toBeTruthy();
    expect(
      screen.getByTestId(`timeline-entry-${item.id}`).props.accessibilityLabel
    ).toContain("Mitte, Berlin");
  });

  test("labels a place without a name by its coordinates", async () => {
    await renderEntry(
      _generateItem({
        location: { latitude: 52.52, longitude: 13.405, name: null },
      })
    );

    expect(screen.getByText("52.520, 13.405")).toBeTruthy();
  });

  test("renders no map tile without a place", async () => {
    await renderEntry(_generateItem({}));

    expect(screen.queryByTestId("place-preview")).toBeNull();
  });

  test("collapses emotions past the first 12 into a +N chip", async () => {
    const item = _generateItem({
      emotions: EMOTIONS.slice(0, 15).map((emotion) => emotion.key),
    });

    await renderEntry(item);

    expect(screen.getByTestId("timeline-entry-emotions")).toBeTruthy();
    expect(screen.getByText("+3")).toBeTruthy();
  });

  test("skips unknown emotions", async () => {
    await renderEntry(
      _generateItem({
        // Key from a newer app version.
        emotions: ["not-an-emotion"],
      })
    );

    expect(screen.queryByTestId("timeline-entry-emotions")).toBeNull();
  });

  test("opens the entry on press", async () => {
    const item = _generateItem({});

    const onPress = await renderEntry(item);
    fireEvent.press(screen.getByTestId(`timeline-entry-${item.id}`));

    expect(onPress).toHaveBeenCalledWith(item);
  });
});
