import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, userEvent } from "@testing-library/react-native";
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  useLocalSearchParams,
} from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import { _generateItem } from "@/__tests__/utils";
import Colors from "@/constants/Colors";
import { LogsProvider } from "@/features/logs";
import {
  PeopleProvider,
  STORAGE_KEY as PEOPLE_KEY,
  usePeopleLoad,
} from "@/features/people";
import {
  TagsProvider,
  STORAGE_KEY as TAGS_KEY,
  useTagsLoad,
} from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { SlidePeople } from "../slides/SlidePeople";
import { SlideTags } from "../slides/SlideTags";
import { TemporaryLogProvider, useTemporaryLog } from "../temporaryLog";

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

const Editor = ({ kind }: { kind: string }) => {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>{`Editing ${kind} ${id}`}</Text>;
};

const Slides = () => {
  const tempLog = useTemporaryLog(_generateItem({ tags: [], people: [] }));
  const tagsLoad = useTagsLoad();
  const peopleLoad = usePeopleLoad();
  if (
    !tempLog.isInitialized ||
    tagsLoad.status !== "ready" ||
    peopleLoad.status !== "ready"
  ) {
    return null;
  }
  return (
    <>
      <SlideTags
        onChange={(tags) => tempLog.update({ tags })}
        showDisable={false}
      />
      <SlidePeople
        onChange={(people) => tempLog.update({ people })}
        showDisable={false}
      />
    </>
  );
};

const renderLogger = async () => {
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
                    <TemporaryLogProvider>
                      <Stack />
                    </TemporaryLogProvider>
                  </PeopleProvider>
                </TagsProvider>
              </LogsProvider>
            </AnalyticsProvider>
          </SettingsProvider>
        </ThemeProvider>
      ),
      log: Slides,
      "tags/[id]": () => <Editor kind="tag" />,
      "people/[id]": () => <Editor kind="person" />,
    },
    { initialUrl: "/log" }
  );
  jest.useRealTimers();
  return result;
};

describe("Logger tag and people slides", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      TAGS_KEY,
      JSON.stringify({
        tags: [{ id: "tag-work", title: "Work", color: "slate" }],
      })
    );
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

  test("long press on a tag opens its editor", async () => {
    const result = await renderLogger();
    await userEvent.longPress(await result.findByText("Work"));
    expect(await result.findByText("Editing tag tag-work")).toBeOnTheScreen();
  });

  test("long press on a person opens their editor", async () => {
    const result = await renderLogger();
    await userEvent.longPress(
      await result.findByTestId("log-person-person-ada")
    );
    expect(
      await result.findByText("Editing person person-ada")
    ).toBeOnTheScreen();
  });

  test("screen reader edit action on a person opens their editor", async () => {
    const result = await renderLogger();
    const person = await result.findByRole("button", { name: "Ada" });
    await act(() =>
      fireEvent(person, "accessibilityAction", {
        nativeEvent: { actionName: "edit" },
      })
    );
    expect(
      await result.findByText("Editing person person-ada")
    ).toBeOnTheScreen();
  });
});
