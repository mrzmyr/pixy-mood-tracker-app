import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  useLocalSearchParams,
} from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import Alert from "@/lib/Alert";
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

const Editor = ({ kind }: { kind: string }) => {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>{`Editing ${kind} ${id}`}</Text>;
};

let slide: "tags" | "people" = "tags";

const Slides = () => {
  const tagsLoad = useTagsLoad();
  const peopleLoad = usePeopleLoad();
  if (tagsLoad.status !== "ready" || peopleLoad.status !== "ready") {
    return null;
  }
  return (
    <LogDraftProvider initialDraft={_generateItem({ tags: [], people: [] })}>
      {slide === "tags" ? (
        <SlideTags showDisable={false} />
      ) : (
        <SlidePeople showDisable={false} />
      )}
    </LogDraftProvider>
  );
};

const menuItems = (
  result: Awaited<ReturnType<typeof renderLogger>>,
  name: string
) => result.findAllByRole("menuitem", { name });

const confirmAlert = async () => {
  const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2] ?? [];
  await act(() => {
    buttons.find((button) => button.style === "destructive")?.onPress?.();
  });
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
                    <Stack />
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

describe("Logger tag and people menus (iOS context menu)", () => {
  beforeEach(async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      TAGS_KEY,
      JSON.stringify({
        tags: [
          { id: "tag-work", title: "Work", color: "slate" },
          { id: "tag-gym", title: "Gym", color: "slate" },
        ],
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
          {
            id: "person-bo",
            name: "Bo",
            avatar: null,
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        ],
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("tags", () => {
    beforeEach(() => {
      slide = "tags";
    });

    test("Edit opens the tag editor", async () => {
      const result = await renderLogger();
      const [edit] = await menuItems(result, "Edit");
      await userEvent.press(edit);
      expect(await result.findByText("Editing tag tag-work")).toBeOnTheScreen();
    });

    test("Archive hides the tag from the check-in", async () => {
      const result = await renderLogger();
      const [archive] = await menuItems(result, "Archive");
      await userEvent.press(archive);
      await waitFor(() => expect(result.queryByText("Work")).toBeNull());
      expect(result.getByText("Gym")).toBeOnTheScreen();
    });

    test("Delete removes the tag after confirmation", async () => {
      const result = await renderLogger();
      const [remove] = await menuItems(result, "Delete");
      await userEvent.press(remove);
      expect(result.getByText("Work")).toBeOnTheScreen();
      await confirmAlert();
      await waitFor(() => expect(result.queryByText("Work")).toBeNull());
    });

    test("screen reader actions include archive", async () => {
      const result = await renderLogger();
      const tag = await result.findByText("Work");
      await act(() =>
        fireEvent(tag, "accessibilityAction", {
          nativeEvent: { actionName: "archive" },
        })
      );
      await waitFor(() => expect(result.queryByText("Work")).toBeNull());
    });
  });

  describe("people", () => {
    beforeEach(() => {
      slide = "people";
    });

    test("Edit opens the person editor", async () => {
      const result = await renderLogger();
      const [edit] = await menuItems(result, "Edit");
      await userEvent.press(edit);
      expect(
        await result.findByText(/Editing person person-/u)
      ).toBeOnTheScreen();
    });

    test("Archive hides the person from the check-in", async () => {
      const result = await renderLogger();
      expect(
        await result.findAllByRole("menuitem", { name: "Archive" })
      ).toHaveLength(2);
      const [archive] = await menuItems(result, "Archive");
      await userEvent.press(archive);
      await waitFor(async () =>
        expect(await menuItems(result, "Archive")).toHaveLength(1)
      );
    });

    test("Delete removes the person after confirmation", async () => {
      const result = await renderLogger();
      const [remove] = await menuItems(result, "Delete");
      await userEvent.press(remove);
      expect(Alert.alert).toHaveBeenCalledTimes(1);
      await confirmAlert();
      await waitFor(async () =>
        expect(await menuItems(result, "Delete")).toHaveLength(1)
      );
    });

    test("screen reader edit action opens the person editor", async () => {
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
});
