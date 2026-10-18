import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { fireEvent, waitFor } from "@testing-library/react-native";
import dayjs from "dayjs";
import { Pressable, Text } from "react-native";
import { _generateItem } from "@/testing/logItem";
import { DATE_FORMAT } from "@/constants/Config";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  LogsProvider,
  STORAGE_KEY as LOGS_KEY,
  useLogLoad,
  useLogState,
} from "@/features/logs";
import Alert from "@/lib/Alert";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
  useSettingsLoad,
} from "@/state/settings";
import { useDayActions } from "../dayActions";

const day = dayjs().subtract(1, "day").format(DATE_FORMAT);

const Loaded = ({ children }: { children: React.ReactNode }) => {
  const settings = useSettingsLoad();
  const logs = useLogLoad();
  return settings.status === "ready" && logs.status === "ready"
    ? children
    : null;
};

/** Shows the stored entries and deletes the first one, like the day menu. */
const DeleteFirst = () => {
  const { items } = useLogState();
  const actions = useDayActions(day, "calendar_menu");
  return (
    <>
      <Text testID="ids">{items.map((item) => item.id).join(",")}</Text>
      <Pressable
        testID="delete"
        onPress={() => actions.handleDelete(items[0])}
      />
    </>
  );
};

const renderActions = async () => {
  const result = await renderRouter(
    {
      _layout: () => (
        <SettingsProvider>
          <AnalyticsProvider>
            <LogsProvider>
              <Loaded>
                <Stack />
              </Loaded>
            </LogsProvider>
          </AnalyticsProvider>
        </SettingsProvider>
      ),
      index: DeleteFirst,
    },
    { initialUrl: "/" }
  );
  jest.useRealTimers();
  return result;
};

// Presses the confirm (destructive) or cancel button of the open alert.
const answerAlert = (style: "destructive" | "cancel") => {
  const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2] ?? [];
  buttons.find((button) => button.style === style)?.onPress?.();
};

describe("day actions > delete", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(INITIAL_STATE));
    await AsyncStorage.setItem(
      LOGS_KEY,
      JSON.stringify({
        items: [
          _generateItem({
            id: "a",
            dateTime: dayjs(day).hour(8).toISOString(),
          }),
        ],
      })
    );
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("cancel keeps the entry", async () => {
    const screen = await renderActions();
    expect(await screen.findByTestId("ids")).toHaveTextContent(/^a$/u);

    fireEvent.press(screen.getByTestId("delete"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));
    answerAlert("cancel");

    await waitFor(() =>
      expect(screen.getByTestId("ids")).toHaveTextContent(/^a$/u)
    );
  });

  test("confirm deletes the entry", async () => {
    const screen = await renderActions();
    expect(await screen.findByTestId("ids")).toHaveTextContent(/^a$/u);

    fireEvent.press(screen.getByTestId("delete"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));
    answerAlert("destructive");

    await waitFor(() =>
      expect(screen.getByTestId("ids")).toHaveTextContent(/^$/u)
    );
  });
});
