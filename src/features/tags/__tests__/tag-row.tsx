import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/colors";
import { AnalyticsProvider } from "@/state/analytics";
import { LogsProvider } from "@/features/logs";
import { SettingsProvider } from "@/state/settings";
import {
  STORAGE_KEY as STORAGE_KEY_TAGS,
  TagsProvider,
  useTagsLoad,
  useTagsState,
} from "../tags-provider";
import type { Tag } from "../tags-provider";
import { TagRow } from "../components/tag-row.ios";

// oxlint-disable-next-line anti-slop/no-module-mocking -- the swipeable row is a native gesture view that Jest cannot render; children render in place.
jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => ({
  __esModule: true,
  default: ({ children }) => children,
  SwipeDirection: { LEFT: "left", RIGHT: "right" },
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- RectButton is a native gesture button; a Pressable keeps its accessibility props.
jest.mock("react-native-gesture-handler", () => {
  const { Pressable } = require("react-native");
  return { RectButton: Pressable };
});

const TAG: Tag = { id: "1", title: "Work", color: "slate" };

const Row = () => {
  const { status } = useTagsLoad();
  const { tags } = useTagsState();
  const tag = tags.find((item) => item.id === TAG.id);
  if (status !== "ready" || !tag) {
    return null;
  }
  return <TagRow tag={tag} onPress={() => {}} />;
};

const renderRow = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider>
          <LogsProvider>
            <TagsProvider>
              <Row />
            </TagsProvider>
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

const actionNames = (node) =>
  node.props.accessibilityActions.map((action) => action.name);

describe("Tag row accessibility actions", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      STORAGE_KEY_TAGS,
      JSON.stringify({ tags: [TAG] })
    );
  });

  test("archive action archives the tag; row then offers only delete", async () => {
    const result = await renderRow();
    const row = await result.findByTestId("tag-row-1");
    expect(actionNames(row)).toEqual(["archive", "delete"]);

    await fireEvent(row, "accessibilityAction", {
      nativeEvent: { actionName: "archive" },
    });

    await waitFor(() => {
      expect(actionNames(result.getByTestId("tag-row-1"))).toEqual(["delete"]);
    });
  });

  test("delete action asks for confirmation", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const result = await renderRow();
    const row = await result.findByTestId("tag-row-1");

    await fireEvent(row, "accessibilityAction", {
      nativeEvent: { actionName: "delete" },
    });

    expect(alert).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });
});
