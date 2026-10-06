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

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature flags come from PostHog after consent; these tests need them off.
jest.mock("@/state/featureFlags", () => ({
  useFeatureFlag: () => false,
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

  test.each([
    ["log-list-edit", "edit"],
    ["log-list-delete", "delete"],
  ] as const)("%s calls %s", async (testID, action) => {
    const item = _generateItem({});
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await renderEntry({ item, onEdit, onDelete });

    fireEvent.press(await screen.findByTestId(testID));

    await waitFor(() => {
      expect(action === "edit" ? onEdit : onDelete).toHaveBeenCalledWith(item);
    });
    expect(action === "edit" ? onDelete : onEdit).not.toHaveBeenCalled();
  });
});
