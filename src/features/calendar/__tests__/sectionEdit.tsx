import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen, waitFor } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { _generateItem } from "@/__tests__/utils";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { LogsProvider } from "@/features/logs";
import { PeopleProvider } from "@/features/people";
import type { LogItem } from "@/features/logs";
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

const Loaded = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSettingsLoad();
  return status === "ready" ? children : null;
};

const renderEntry = async ({
  steps,
  item,
}: {
  steps: SettingsState["steps"];
  item: Partial<LogItem>;
}) => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...INITIAL_STATE, steps })
  );

  return render(
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
                  <Entry
                    item={_generateItem(item)}
                    onEdit={jest.fn()}
                    onDelete={jest.fn()}
                  />
                </Loaded>
              </PeopleProvider>
            </TagsProvider>
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
};

describe("day view section pencils", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("step off, empty section: no pencil", async () => {
    await renderEntry({
      steps: ["rating", "tags"],
      item: { emotions: [], message: "" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("log-list-tags-edit")).toBeTruthy();
    });
    expect(screen.queryByTestId("log-list-emotions-edit")).toBeNull();
    expect(screen.queryByTestId("log-list-message-edit")).toBeNull();
  });

  test("step off, section with content: content and pencil stay", async () => {
    await renderEntry({
      steps: ["rating"],
      item: { emotions: ["alive"], message: "Long walk" },
    });

    await waitFor(() => {
      expect(screen.getByText("Long walk")).toBeTruthy();
    });
    expect(screen.getByTestId("log-list-emotions-edit")).toBeTruthy();
    expect(screen.getByTestId("log-list-message-edit")).toBeTruthy();
    expect(screen.queryByTestId("log-list-tags-edit")).toBeNull();
  });
});

test("flag off keeps stored menstruation visible and read-only", async () => {
  await renderEntry({
    steps: ["rating", "menstruation"],
    item: { menstruation: { flow: "none" } },
  });
  await waitFor(() =>
    expect(screen.getByTestId("log-list-menstruation")).toHaveTextContent(
      "Menstruation: None"
    )
  );
  expect(
    screen.getByTestId("log-list-menstruation").props.accessibilityRole
  ).toBe("text");
});
