import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { _generateItem } from "@/__tests__/utils";
import { t } from "@/lib/translation";
import { INITIAL_STATE } from "@/constants/Settings";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, STORAGE_KEY, useSettings } from "@/state/settings";
import {
  countWords,
  getEntryProperties,
} from "../feelingCheck/entryProperties";
import { getEncouragement } from "../feelingCheck/encouragement";
import { useFeelingCheck } from "../feelingCheck/useFeelingCheck";

// jest.setup.js replaces posthog-react-native with one shared fake client.
const { capture: mockCapture } = getPostHogTestClient();

// The app mounts the logger only after settings load, like this gate.
const SettingsLoaded = ({ children }) =>
  useSettings().settings.loaded ? children : null;

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider options={{ enabled: true }}>
      <SettingsLoaded>{children}</SettingsLoaded>
    </AnalyticsProvider>
  </SettingsProvider>
);

const item = _generateItem({
  rating: "very_bad",
  emotions: ["tired", "worried"],
  tags: [{ id: "tag-1" }],
  message: "  Long day at work  ",
  sleep: { quality: "bad" },
});

const properties = {
  rating: "very_bad",
  emotions: ["tired", "worried"],
  emotions_count: 2,
  tags_count: 1,
  message_length: 20,
  message_word_count: 4,
  sleep_quality: "bad",
  entries_count: 3,
};

const renderFeelingCheck = (rating = item.rating) =>
  renderHook(
    () => useFeelingCheck({ item: { ...item, rating }, entriesCount: 3 }),
    { wrapper }
  );

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
  );
});

describe("countWords()", () => {
  test("counts whitespace-separated words", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("one")).toBe(1);
    expect(countWords(" one\ntwo  three ")).toBe(3);
  });
});

describe("getEntryProperties()", () => {
  test("sends counts for free text, never the text", () => {
    expect(getEntryProperties({ item, entriesCount: 3 })).toEqual(properties);
  });
});

describe("useFeelingCheck()", () => {
  test("tracks view on mount and the first answer only", async () => {
    const hook = await renderFeelingCheck();

    await waitFor(() => expect(hook.result.current).not.toBeNull());
    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith(
        "logger:feeling_check_viewed",
        expect.objectContaining(properties)
      )
    );

    await act(() => {
      hook.result.current.answer("better");
      hook.result.current.answer("worse");
      hook.result.current.skip();
    });

    expect(mockCapture).toHaveBeenCalledTimes(2);
    expect(mockCapture).toHaveBeenLastCalledWith(
      "logger:feeling_check_answered",
      expect.objectContaining({ ...properties, answer: "better" })
    );
  });

  test("tracks skip", async () => {
    const hook = await renderFeelingCheck();
    await waitFor(() => expect(hook.result.current).not.toBeNull());

    await act(() => {
      hook.result.current.skip();
    });

    expect(mockCapture).toHaveBeenLastCalledWith(
      "logger:feeling_check_skipped",
      expect.objectContaining({ ...properties, skip_ms: expect.any(Number) })
    );
  });

  test("tracks skip when closed without an answer", async () => {
    const hook = await renderFeelingCheck();
    await waitFor(() => expect(hook.result.current).not.toBeNull());

    await act(() => {
      hook.unmount();
    });

    expect(mockCapture).toHaveBeenLastCalledWith(
      "logger:feeling_check_skipped",
      expect.objectContaining(properties)
    );
  });
});

describe("getEncouragement()", () => {
  test("supports bad days and celebrates good days", () => {
    expect(getEncouragement("very_bad")).toEqual({
      tone: "bad",
      title: t("log_saved_bad_title"),
      body: t("log_saved_bad_body"),
    });
    expect(getEncouragement("neutral").tone).toBe("neutral");
    expect(getEncouragement("extremely_good").tone).toBe("good");
  });
});
