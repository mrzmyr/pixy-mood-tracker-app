import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { render, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import Colors from "@/constants/Colors";
import { AnalyticsProvider } from "@/hooks/useAnalytics";
import {
  CalendarFiltersProvider,
  useCalendarFilters,
} from "@/hooks/useCalendarFilters";
import { LogsProvider } from "@/hooks/useLogs";
import { SettingsProvider } from "@/hooks/useSettings";
import type { TagsDistributionData } from "@/hooks/useStatistics/TagsDistribution";
import { TagDistributionContent } from "@/screens/Statistics/TagsDistributionCard";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual("react-native");
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: View,
    SafeAreaInsetsContext: jest.requireActual("react").createContext(insets),
    SafeAreaFrameContext: jest.requireActual("react").createContext(frame),
    initialWindowMetrics: { insets, frame },
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
  };
});

const data: TagsDistributionData = {
  tags: [
    {
      id: "tag-work",
      details: {
        id: "tag-work",
        title: "Work",
        color: "slate",
        isArchived: false,
      },
      count: 3,
    },
  ],
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const StatisticsTab = () => <Text>Statistics tab</Text>;

const CalendarTab = () => {
  const calendarFilters = useCalendarFilters();

  return (
    <Text>{`Calendar tab filtered by ${calendarFilters.data.tagIds.join(",")}`}</Text>
  );
};

const Tabs = () => (
  <Tab.Navigator initialRouteName="Statistics">
    <Tab.Screen name="Statistics" component={StatisticsTab} />
    <Tab.Screen name="Calendar" component={CalendarTab} />
  </Tab.Navigator>
);

const Highlights = () => <TagDistributionContent data={data} />;

const renderApp = () =>
  render(
    <NavigationContainer
      initialState={{
        routes: [
          {
            name: "tabs",
            state: { index: 0, routes: [{ name: "Statistics" }] },
          },
          { name: "StatisticsHighlights" },
        ],
      }}
      theme={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider>
          <LogsProvider>
            <CalendarFiltersProvider>
              <Stack.Navigator>
                <Stack.Screen name="tabs" component={Tabs} />
                <Stack.Screen
                  name="StatisticsHighlights"
                  component={Highlights}
                />
              </Stack.Navigator>
            </CalendarFiltersProvider>
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </NavigationContainer>
  );

describe("Tags distribution in Statistics Highlights", () => {
  test("user taps a tag and lands on the Calendar filtered by that tag", async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.press(await screen.findByText("3x Work"));

    expect(
      await screen.findByText("Calendar tab filtered by tag-work")
    ).toBeOnTheScreen();
    expect(screen.queryByText("3x Work")).not.toBeOnTheScreen();
  });
});
