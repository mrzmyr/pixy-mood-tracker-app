import { setTimeout as sleep } from "node:timers/promises";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, router, Stack, ThemeProvider } from "expo-router";
import { View } from "react-native";
import { renderRouter } from "expo-router/testing-library";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { AnalyticsProvider } from "@/state/analytics";
import { LogsProvider } from "@/features/logs";
import { SettingsProvider } from "@/state/settings";
import Colors from "@/constants/colors";
import {
  STORAGE_KEY as STORAGE_KEY_TAGS,
  TagsProvider,
} from "../tags-provider";
import type { Tag } from "../tags-provider";
import type { TagIconPickerRow } from "../tag-icon-picker-rows";
import { TagCreate } from "../screens/tag-create";
import { TagIconPicker } from "../screens/tag-icon-picker";
import { SUGGESTION_DEBOUNCE_MS } from "../use-tag-icon-suggestions";

let mockHasTagIcons = true;

// oxlint-disable-next-line anti-slop/no-module-mocking -- flag `tag-icons` on or off per test, without PostHog
jest.mock("@/state/feature-flags", () => ({
  useFeatureFlag: (flag: string) => flag === "tag-icons" && mockHasTagIcons,
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- jest.setup.js stubs flash-list with null; render every row so the picker grid is tappable
jest.mock("@shopify/flash-list", () => {
  const { Fragment } = jest.requireActual("react");
  return {
    FlashList: ({
      data,
      renderItem,
      keyExtractor,
    }: {
      data: TagIconPickerRow[];
      renderItem: (info: { item: TagIconPickerRow }) => React.ReactNode;
      keyExtractor: (item: TagIconPickerRow) => string;
    }) =>
      data.map((item) => (
        <Fragment key={keyExtractor(item)}>{renderItem({ item })}</Fragment>
      )),
  };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- Jest loads reanimated as an empty mock; press feedback is not under test
jest.mock("@/components/pressable-scale", () => {
  const { Pressable } = jest.requireActual("react-native");
  return { PressableScale: Pressable };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- the discard guard needs a native navigator; this suite tests the icon field
jest.mock("@/hooks/use-discard-guard", () => ({
  __esModule: true,
  useDiscardGuard: () => ({ allowLeave: jest.fn() }),
}));

const theme = {
  ...DefaultTheme,
  dark: false,
  colors: { ...DefaultTheme.colors, ...Colors.light },
};

const renderForm = async () => {
  jest.useFakeTimers();
  const screen = await renderRouter(
    {
      _layout: () => (
        <ThemeProvider value={theme}>
          <SettingsProvider>
            <AnalyticsProvider>
              <LogsProvider>
                <TagsProvider>
                  <Stack screenOptions={{ headerShown: true }} />
                </TagsProvider>
              </LogsProvider>
            </AnalyticsProvider>
          </SettingsProvider>
        </ThemeProvider>
      ),
      index: () => <View />,
      "tags/create": TagCreate,
      "tags/icon": TagIconPicker,
    },
    { initialUrl: "/" }
  );
  jest.useRealTimers();
  // Opened from a screen below, so Save can go back.
  await act(() => {
    router.push("/tags/create");
  });
  return screen;
};

const typeName = async (
  screen: Awaited<ReturnType<typeof renderForm>>,
  name: string
) => {
  await fireEvent.changeText(screen.getByTestId("tag-name"), name);
  // Wait out the suggestion debounce.
  await act(() => sleep(SUGGESTION_DEBOUNCE_MS + 50));
};

const storedTags = async (): Promise<Tag[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_TAGS);
  const parsed: { tags: Tag[] } = JSON.parse(raw ?? '{"tags":[]}');
  return parsed.tags;
};

beforeEach(async () => {
  mockHasTagIcons = true;
  await AsyncStorage.clear();
});

describe("tag icon field", () => {
  test("typing a name suggests an icon and color, Save stores them", async () => {
    const screen = await renderForm();

    await typeName(screen, "Gym");

    expect(screen.getByTestId("tag-icon")).toHaveProp(
      "accessibilityLabel",
      "Change icon: gym"
    );

    await fireEvent.press(screen.getByTestId("tag-save"));
    await waitFor(async () => {
      expect(await storedTags()).toContainEqual(
        expect.objectContaining({ title: "Gym", icon: "gym", color: "orange" })
      );
    });
  });

  test("the first color guess stays when the name changes", async () => {
    const screen = await renderForm();

    await typeName(screen, "Gym");
    await typeName(screen, "Coffee");
    await fireEvent.press(screen.getByTestId("tag-save"));

    await waitFor(async () => {
      expect(await storedTags()).toContainEqual(
        expect.objectContaining({
          title: "Coffee",
          icon: "coffee",
          color: "orange",
        })
      );
    });
  });

  test("a picked icon stays when the name changes", async () => {
    const screen = await renderForm();
    await typeName(screen, "Gym");

    await fireEvent.press(screen.getByTestId("tag-icon"));
    await fireEvent.changeText(
      await screen.findByTestId("tag-icon-search"),
      "coffee"
    );
    await fireEvent.press(await screen.findByTestId("tag-icon-coffee"));
    await typeName(screen, "Gym and swim");

    expect(screen.getByTestId("tag-icon")).toHaveProp(
      "accessibilityLabel",
      "Change icon: coffee"
    );
  });

  test("color moves into the icon picker", async () => {
    const screen = await renderForm();

    expect(screen.queryByTestId("tag-color-red")).toBeNull();

    await fireEvent.press(screen.getByTestId("tag-icon"));
    await fireEvent.press(await screen.findByTestId("tag-color-red"));
    await fireEvent.press(screen.getByTestId("tag-icon-close"));
    await typeName(screen, "Gym");
    await fireEvent.press(screen.getByTestId("tag-save"));

    await waitFor(async () => {
      expect(await storedTags()).toContainEqual(
        expect.objectContaining({ title: "Gym", color: "red" })
      );
    });
  });

  test("flag off keeps the color grid and stores no icon", async () => {
    mockHasTagIcons = false;
    const screen = await renderForm();

    expect(screen.queryByTestId("tag-icon")).toBeNull();
    expect(screen.getByTestId("tag-color-red")).toBeOnTheScreen();

    await typeName(screen, "Gym");
    await fireEvent.press(screen.getByTestId("tag-save"));

    await waitFor(async () => {
      const tags = await storedTags();
      const gym = tags.find((tag) => tag.title === "Gym");
      expect(gym).toBeDefined();
      expect(gym?.icon).toBeUndefined();
    });
  });
});
