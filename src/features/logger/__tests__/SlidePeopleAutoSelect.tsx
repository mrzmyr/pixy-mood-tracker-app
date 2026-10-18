import AsyncStorage from "@react-native-async-storage/async-storage";
import { userEvent } from "@testing-library/react-native";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Pressable, Text } from "react-native";
import { _generateItem } from "@/testing/logItem";
import Colors from "@/constants/Colors";
import { LogsProvider } from "@/features/logs";
import {
  PeopleProvider,
  STORAGE_KEY as PEOPLE_KEY,
  usePeopleLoad,
  usePeopleUpdater,
} from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { SlidePeople } from "../slides/SlidePeople";
import { LogDraftProvider } from "../logDraft";

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

/** Stands in for the add-person form, which creates people while the slide stays mounted. */
const CreatePersonButton = () => {
  const peopleUpdater = usePeopleUpdater();
  return (
    <Pressable
      testID="create-person"
      onPress={() =>
        peopleUpdater.createPerson({
          id: "person-new",
          name: "Newcomer",
          avatar: null,
          createdAt: "2026-10-02T00:00:00.000Z",
          updatedAt: "2026-10-02T00:00:00.000Z",
        })
      }
    >
      <Text>Create</Text>
    </Pressable>
  );
};

const Slides = () => {
  const peopleLoad = usePeopleLoad();
  if (peopleLoad.status !== "ready") {
    return null;
  }
  return (
    <LogDraftProvider initialDraft={_generateItem({ tags: [], people: [] })}>
      <SlidePeople showDisable={false} />
      <CreatePersonButton />
    </LogDraftProvider>
  );
};

const renderSlide = async () => {
  const result = await renderRouter(
    {
      _layout: () => (
        <ThemeProvider
          value={{
            ...DefaultTheme,
            colors: { ...DefaultTheme.colors, ...Colors.light },
          }}
        >
          <SettingsProvider>
            <AnalyticsProvider>
              <LogsProvider>
                <TagsProvider>
                  <PeopleProvider>
                    <Stack />
                  </PeopleProvider>
                </TagsProvider>
              </LogsProvider>
            </AnalyticsProvider>
          </SettingsProvider>
        </ThemeProvider>
      ),
      log: Slides,
    },
    { initialUrl: "/log" }
  );
  jest.useRealTimers();
  return result;
};

describe("SlidePeople auto-select", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      PEOPLE_KEY,
      JSON.stringify({
        people: [
          {
            id: "person-ada",
            name: "Ada",
            avatar: null,
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        ],
      })
    );
  });

  test("selects a person created while the slide is open", async () => {
    const result = await renderSlide();
    await result.findByTestId("log-person-person-ada");
    await userEvent.press(result.getByTestId("create-person"));
    expect(await result.findByTestId("log-person-person-new")).toBeSelected();
  });

  test("leaves existing people unselected", async () => {
    const result = await renderSlide();
    await userEvent.press(await result.findByTestId("create-person"));
    await result.findByTestId("log-person-person-new");
    expect(result.getByTestId("log-person-person-ada")).not.toBeSelected();
  });

  test("selects nobody when the slide opens", async () => {
    const result = await renderSlide();
    expect(
      await result.findByTestId("log-person-person-ada")
    ).not.toBeSelected();
  });
});
