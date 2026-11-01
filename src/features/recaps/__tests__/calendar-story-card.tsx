import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/colors";
import { INITIAL_STATE } from "@/constants/settings";
import { LogsProvider, STORAGE_KEY as LOGS_KEY } from "@/features/logs";
import { PeopleProvider } from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { FeatureFlagsContext } from "@/state/feature-flags/context";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
  useSettingsLoad,
} from "@/state/settings";
import { _generateItem } from "@/testing/log-item";
import { CalendarStoryCard } from "../story/calendar-story-card";

const FLAGS = { flags: { recaps: true }, isLoading: false };

const Loaded = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSettingsLoad();
  return status === "ready" ? children : null;
};

/** Twelve check-ins in October: enough for its story. */
const seedLogs = () =>
  AsyncStorage.setItem(
    LOGS_KEY,
    JSON.stringify({
      items: ["2026-10"].flatMap((month) =>
        Array.from({ length: 12 }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, "0")}`;
          return _generateItem({
            id: date,
            date,
            dateTime: `${date}T12:00:00.000Z`,
          });
        })
      ),
    })
  );

const renderCard = async (settings: Partial<typeof INITIAL_STATE> = {}) => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...INITIAL_STATE, ...settings })
  );
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <FeatureFlagsContext.Provider value={FLAGS}>
          <LogsProvider>
            <TagsProvider>
              <PeopleProvider>
                <Loaded>
                  <CalendarStoryCard />
                </Loaded>
              </PeopleProvider>
            </TagsProvider>
          </LogsProvider>
        </FeatureFlagsContext.Provider>
      </SettingsProvider>
    </ThemeProvider>
  );
};

afterEach(async () => {
  jest.useRealTimers();
  await AsyncStorage.clear();
});

test("closing the story card hides it for its month only", async () => {
  jest.useFakeTimers({ now: new Date(2026, 10, 1, 12), advanceTimers: true });
  await seedLogs();
  // September was closed: October's card still shows.
  await renderCard({ recapStoryDismissedMonth: "2026-09-01" });

  fireEvent.press(await screen.findByTestId("recap-story-banner-close"));

  await waitFor(() =>
    expect(screen.queryByTestId("recap-story-banner")).toBeNull()
  );
});
