import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, userEvent, within } from "@testing-library/react-native";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import { MoodThemes } from "@/features/settings/screens/Colors/MoodThemes";
import CalendarDay from "@/features/calendar/screens/Calendar/CalendarDay";

const renderDays = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <MoodThemes />
        <CalendarDay
          dateString="2025-01-01"
          rating="good"
          isFiltered={false}
          isFiltering={false}
          onPress={jest.fn()}
        />
        <CalendarDay
          dateString="2025-01-02"
          rating="bad"
          isFiltered={false}
          isFiltering
          onPress={jest.fn()}
        />
        <CalendarDay
          dateString="2025-01-03"
          rating={null}
          isFiltered={false}
          isFiltering={false}
          onPress={jest.fn()}
        />
      </SettingsProvider>
    </ThemeProvider>
  );

describe("mood themes", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
  });

  it("updates an existing calendar immediately for every theme, then restores classic pixels", async () => {
    const screen = await renderDays();
    const user = userEvent.setup();
    const day = within(screen.getByTestId("calendar-day-2025-01-01"));
    for (const theme of ["blobs", "cats", "robots"]) {
      // oxlint-disable-next-line no-await-in-loop -- Each choice replaces the previous selection on the same mounted calendar.
      await user.press(screen.getByTestId(`mood-theme-${theme}`));
      expect(day.getByTestId(`mood-character-${theme}-good`)).toBeTruthy();
      expect(
        screen.getByTestId(`mood-theme-${theme}`).props.accessibilityState
          .selected
      ).toBe(true);
      expect(
        within(screen.getByTestId("calendar-day-2025-01-02")).queryByTestId(
          `mood-character-${theme}-bad`
        )
      ).toBeNull();
      expect(
        within(screen.getByTestId("calendar-day-2025-01-03")).queryByTestId(
          /mood-character/u
        )
      ).toBeNull();
    }
    await user.press(screen.getByTestId("mood-theme-classic"));
    expect(day.queryByTestId(/mood-character/u)).toBeNull();
    expect(
      screen.getByTestId("calendar-day-2025-01-01").props.accessibilityState
        .disabled
    ).toBe(false);
  });
});
