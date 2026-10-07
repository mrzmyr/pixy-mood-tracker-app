import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  useLocalSearchParams,
} from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { _generateItem } from "@/__tests__/utils";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { LogsProvider } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { PeopleProvider } from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
  useSettingsLoad,
} from "@/state/settings";
import type { SettingsState } from "@/state/settings";
import { Entry } from "../screens/LogList/Entry";

let mockOnFlags: string[] = [];

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature flags come from PostHog after consent; these tests set them by name, all others off.
jest.mock("@/state/featureFlags", () => ({
  useFeatureFlag: (flag: string) => mockOnFlags.includes(flag),
}));

const EditRoute = () => {
  const { id, step } = useLocalSearchParams<{ id: string; step: string }>();
  return <Text>{`edit ${id} ${step}`}</Text>;
};

const Loaded = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSettingsLoad();
  return status === "ready" ? children : null;
};

const renderEntry = async ({
  steps = ["rating", "emotions", "tags", "message"],
  item,
  onEdit = jest.fn(),
  onDelete = jest.fn(),
}: {
  steps?: SettingsState["steps"];
  item: LogItem;
  onEdit?: (item: LogItem) => void;
  onDelete?: (item: LogItem) => void;
}) => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...INITIAL_STATE, steps })
  );
  const result = await renderRouter(
    {
      _layout: () => (
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
                  <PeopleProvider>
                    <Loaded>
                      <Stack />
                    </Loaded>
                  </PeopleProvider>
                </TagsProvider>
              </LogsProvider>
            </AnalyticsProvider>
          </SettingsProvider>
        </ThemeProvider>
      ),
      index: () => <Entry item={item} onEdit={onEdit} onDelete={onDelete} />,
      "logs/[id]/edit": EditRoute,
    },
    { initialUrl: "/" }
  );
  jest.useRealTimers();
  return result;
};

describe("day view entry card", () => {
  beforeEach(async () => {
    mockOnFlags = [];
    await AsyncStorage.clear();
  });

  test("add pill opens the logger at its step", async () => {
    const item = _generateItem({ emotions: [], message: "" });
    await renderEntry({ item });

    fireEvent.press(await screen.findByLabelText("Add Note"));

    expect(await screen.findByText(`edit ${item.id} message`)).toBeTruthy();
  });

  test("filled step shows content instead of an add pill", async () => {
    const item = _generateItem({ emotions: [], message: "Long walk" });
    await renderEntry({ item });

    fireEvent.press(await screen.findByText("Long walk"));

    expect(await screen.findByText(`edit ${item.id} message`)).toBeTruthy();
  });

  test("step off: no add pill for it", async () => {
    const item = _generateItem({ emotions: [], message: "" });
    await renderEntry({ steps: ["rating", "tags"], item });

    await screen.findByLabelText("Add Tags");
    expect(screen.queryByLabelText("Add Note")).toBeNull();
    expect(screen.queryByLabelText("Add Emotions")).toBeNull();
  });

  test("few emotions show as one chip each and open the logger", async () => {
    const item = _generateItem({
      emotions: ["happy", "joyful"],
      message: "",
    });
    await renderEntry({ item });

    expect(await screen.findByText("Happy")).toBeTruthy();
    expect(screen.getByText("Joyful")).toBeTruthy();

    fireEvent.press(screen.getByHintText("Edit Emotions"));

    expect(await screen.findByText(`edit ${item.id} emotions`)).toBeTruthy();
  });

  test.each([
    ["Edit", "edit"],
    ["Delete", "delete"],
  ] as const)("menu item %s calls %s", async (label, action) => {
    const item = _generateItem({});
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await renderEntry({ item, onEdit, onDelete });

    fireEvent.press(await screen.findByLabelText(label));

    await waitFor(() => {
      expect(action === "edit" ? onEdit : onDelete).toHaveBeenCalledWith(item);
    });
    expect(action === "edit" ? onDelete : onEdit).not.toHaveBeenCalled();
  });

  describe("place", () => {
    const berlin = {
      latitude: 52.52,
      longitude: 13.405,
      name: "Mitte, Berlin",
    };

    test("shows the place of an entry with a location", async () => {
      mockOnFlags = ["location"];
      await renderEntry({ item: _generateItem({ location: berlin }) });

      expect(await screen.findByText("Mitte, Berlin")).toBeTruthy();
    });

    test.each([
      ["no name", { ...berlin, name: null }],
      ["a blank name", { ...berlin, name: " " }],
    ])("shows coordinates for a place with %s", async (_, location) => {
      mockOnFlags = ["location"];
      await renderEntry({ item: _generateItem({ location }) });

      expect(await screen.findByText("52.520, 13.405")).toBeTruthy();
    });

    test("shows no place for an entry without a location", async () => {
      mockOnFlags = ["location"];
      await renderEntry({ item: _generateItem({}) });

      await screen.findByLabelText("Edit");
      expect(screen.queryByTestId("log-list-place")).toBeNull();
    });

    test("hides the place with the location flag off", async () => {
      await renderEntry({ item: _generateItem({ location: berlin }) });

      await screen.findByLabelText("Edit");
      expect(screen.queryByText("Mitte, Berlin")).toBeNull();
    });
  });
});
