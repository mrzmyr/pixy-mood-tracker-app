import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import * as Sentry from "@sentry/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import * as Sharing from "expo-sharing";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { Text } from "react-native";
import { captureRef } from "react-native-view-shot";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { t } from "@/lib/translation";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettingsLoad,
} from "@/state/settings";
import { BigCard } from "../components/BigCard";

// oxlint-disable-next-line anti-slop/no-module-mocking -- view-shot has no native module in Jest; the test controls the captured file path.
jest.mock("react-native-view-shot", () => ({
  __esModule: true,
  captureRef: jest.fn(),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-sharing opens the native share sheet, which Jest does not have.
jest.mock("expo-sharing", () => ({
  __esModule: true,
  shareAsync: jest.fn(),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- share errors are reported through the Sentry SDK imported directly in BigCard.
jest.mock("@sentry/react-native", () => ({
  __esModule: true,
  captureException: jest.fn(),
}));

const mockCaptureRef = jest.mocked(captureRef);
const mockShareAsync = jest.mocked(Sharing.shareAsync);
const mockCaptureException = jest.mocked(Sentry.captureException);
// jest.setup.js replaces posthog-react-native with one shared fake client.
const { capture: mockCapture } = getPostHogTestClient();

const SHARE_COPY = "big-card-share-copy-mood_chart";

const SettingsLoaded = ({ children }: { children: React.ReactNode }) =>
  useSettingsLoad().status === "ready" ? children : null;

const renderCard = async () => {
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider options={{ enabled: true }}>
          <SettingsLoaded>
            <BigCard title="Mood" analyticsId="mood_chart" isShareable>
              <Text>Chart</Text>
            </BigCard>
          </SettingsLoaded>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
  await screen.findByText("Chart");
};

const layoutShareCopy = async () => {
  const copy = await screen.findByTestId(SHARE_COPY);
  await act(() => {
    fireEvent(copy, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 400 } },
    });
  });
};

const sharedEvents = () =>
  jest
    .mocked(mockCapture)
    .mock.calls.filter(([name]) => name === "statistics:card_shared");

beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("BigCard share", () => {
  test("share copy is not rendered before the user taps Share", async () => {
    await renderCard();

    expect(screen.queryByTestId(SHARE_COPY)).toBeNull();
    expect(screen.getAllByText("Chart")).toHaveLength(1);
  });

  test("tap Share captures the copy, opens the share sheet, then removes the copy", async () => {
    mockCaptureRef.mockResolvedValue("/tmp/card.png");
    mockShareAsync.mockResolvedValue();
    await renderCard();

    fireEvent.press(screen.getByLabelText(t("a11y_share")));
    await layoutShareCopy();

    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
    expect(mockCaptureRef).toHaveBeenCalledTimes(1);
    expect(mockShareAsync).toHaveBeenCalledWith(
      "file:///tmp/card.png",
      expect.objectContaining({ dialogTitle: expect.any(String) })
    );
    await waitFor(() => expect(sharedEvents()).toHaveLength(1));
    expect(sharedEvents()[0][1]).toEqual(
      expect.objectContaining({ card: "mood_chart" })
    );
    expect(screen.queryByTestId(SHARE_COPY)).toBeNull();
    expect(screen.getByLabelText(t("a11y_share"))).toBeTruthy();
  });

  test("repeated layout of the share copy captures once", async () => {
    mockCaptureRef.mockResolvedValue("file:///tmp/card.png");
    mockShareAsync.mockResolvedValue();
    await renderCard();

    fireEvent.press(screen.getByLabelText(t("a11y_share")));
    const copy = await screen.findByTestId(SHARE_COPY);
    const layout = {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 400 } },
    };
    await act(() => {
      fireEvent(copy, "layout", layout);
      fireEvent(copy, "layout", layout);
    });

    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
    expect(mockCaptureRef).toHaveBeenCalledTimes(1);
  });

  test("failed capture reports a structured error and lets the user share again", async () => {
    mockCaptureRef.mockRejectedValue(new Error("view not found"));
    await renderCard();

    fireEvent.press(screen.getByLabelText(t("a11y_share")));
    await layoutShareCopy();

    await waitFor(() => expect(mockCaptureException).toHaveBeenCalledTimes(1));
    expect(mockCaptureException.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        status: "statistics_card_capture_failed",
        message: "Statistics card image could not be captured",
        why: expect.stringContaining("view not found"),
        fix: expect.any(String),
      })
    );
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(sharedEvents()).toHaveLength(0);
    await waitFor(() => expect(screen.queryByTestId(SHARE_COPY)).toBeNull());
    expect(screen.getByLabelText(t("a11y_share"))).toBeTruthy();
  });

  test("failed share sheet reports a structured error and sends no share event", async () => {
    mockCaptureRef.mockResolvedValue("file:///tmp/card.png");
    mockShareAsync.mockRejectedValue(new Error("sharing not available"));
    await renderCard();

    fireEvent.press(screen.getByLabelText(t("a11y_share")));
    await layoutShareCopy();

    await waitFor(() => expect(mockCaptureException).toHaveBeenCalledTimes(1));
    expect(mockCaptureException.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        status: "statistics_card_share_failed",
        why: expect.stringContaining("sharing not available"),
        fix: expect.any(String),
      })
    );
    expect(sharedEvents()).toHaveLength(0);
    expect(screen.queryByTestId(SHARE_COPY)).toBeNull();
  });
});
