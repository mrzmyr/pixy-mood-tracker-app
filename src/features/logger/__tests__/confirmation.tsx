import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { _generateItem } from "@/__tests__/utils";
import { t } from "@/lib/translation";
import { INITIAL_STATE } from "@/constants/Settings";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettingsLoad,
} from "@/state/settings";
import {
  countWords,
  getEntryProperties,
} from "../confirmation/entryProperties";
import {
  getDaySummary,
  getSummarySentence,
  getSummaryTitle,
} from "../confirmation/daySummary";
import type { DaySummary } from "../confirmation/daySummary";
import { useConfirmation } from "../confirmation/useConfirmation";

// jest.setup.js replaces posthog-react-native with one shared fake client.
const { capture: mockCapture } = getPostHogTestClient();

// The app mounts the logger only after settings load, like this gate.
const SettingsLoaded = ({ children }) =>
  useSettingsLoad().status === "ready" ? children : null;

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
  people_count: 0,
  message_length: 20,
  message_word_count: 4,
  sleep_quality: "bad",
  entries_count: 3,
};

const TODAY = "2026-10-04";
const at = (time: string, entry: Parameters<typeof _generateItem>[0] = {}) =>
  _generateItem({ dateTime: `${time}`, message: "", ...entry });

const summaryOf = (overrides: Partial<DaySummary>): DaySummary => ({
  date: TODAY,
  rating: "very_good",
  tone: "good",
  entriesCount: 1,
  isFirstEntry: false,
  emotions: [],
  tagIds: [],
  ...overrides,
});

const sentence = (summary: DaySummary) =>
  getSummarySentence({ summary, emotionLabel: (key) => key, today: TODAY });
const text = (summary: DaySummary) =>
  sentence(summary)
    .map((segment) => segment.text)
    .join("");

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

describe("useConfirmation()", () => {
  test("tracks the view once on mount", async () => {
    const hook = await renderHook(
      () => useConfirmation({ item, entriesCount: 3 }),
      { wrapper }
    );

    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith(
        "logger:confirmation_viewed",
        expect.objectContaining(properties)
      )
    );
    await act(() => hook.rerender({}));
    await act(() => hook.unmount());

    expect(mockCapture).toHaveBeenCalledTimes(1);
  });
});

describe("getDaySummary()", () => {
  test("merges all entries of the saved entry's day, saved entry first", () => {
    const saved = at(`${TODAY}T20:00:00`, {
      rating: "extremely_good",
      emotions: ["proud"],
      tags: [{ id: "gym" }],
    });
    const morning = at(`${TODAY}T08:00:00`, {
      rating: "good",
      emotions: ["calm", "proud"],
      tags: [{ id: "coffee" }, { id: "gym" }],
    });
    const yesterday = at("2026-10-03T21:00:00", {
      emotions: ["tired"],
      tags: [{ id: "work" }],
    });

    const summary = getDaySummary({
      items: [yesterday, morning, saved],
      item: saved,
    });

    expect(summary).toEqual({
      date: TODAY,
      rating: "very_good",
      tone: "good",
      entriesCount: 2,
      isFirstEntry: false,
      emotions: ["proud", "calm"],
      tagIds: ["gym", "coffee"],
    });
  });

  test("counts the saved entry once, also before it is in the list", () => {
    const saved = at(`${TODAY}T20:00:00`);

    expect(getDaySummary({ items: [], item: saved })).toMatchObject({
      entriesCount: 1,
      isFirstEntry: true,
    });
    expect(getDaySummary({ items: [saved], item: saved })).toMatchObject({
      entriesCount: 1,
      isFirstEntry: true,
    });
  });
});

describe("getSummarySentence()", () => {
  test("names the mood on good days and marks it", () => {
    expect(text(summaryOf({}))).toBe("Today was very good.");
    expect(sentence(summaryOf({}))).toContainEqual({
      text: "very good",
      mark: "mood",
    });
  });

  test("uses the weekday for a past day", () => {
    expect(text(summaryOf({ date: "2026-10-02" }))).toBe(
      "Friday was very good."
    );
  });

  test("never repeats the rating back on hard days", () => {
    const hardDay = summaryOf({
      rating: "very_bad",
      tone: "bad",
      emotions: ["anxious", "tired"],
    });

    expect(text(hardDay)).toBe(
      "Thank you for checking in. You named anxious and tired."
    );
    expect(sentence(hardDay).some((segment) => segment.mark === "mood")).toBe(
      false
    );
    expect(text(hardDay)).not.toContain(t("very_bad").toLowerCase());
  });

  test("welcomes a first entry on a hard day instead of celebrating", () => {
    const first = summaryOf({ rating: "bad", tone: "bad", isFirstEntry: true });

    expect(getSummaryTitle(first)).toBe("Welcome to Pixy");
    expect(text(first)).toBe(
      "Glad you’re here. Starting on a hard day takes courage."
    );
  });

  test("names up to 3 emotions, then counts the rest", () => {
    expect(
      text(
        summaryOf({
          emotions: ["grateful", "calm", "proud", "joyful", "hopeful"],
        })
      )
    ).toBe("Today was very good. You felt grateful, calm, proud and 2 more.");
  });

  test("counts tags only when there are more than 3", () => {
    expect(text(summaryOf({ tagIds: ["a", "b", "c"] }))).toBe(
      "Today was very good."
    );
    expect(text(summaryOf({ tagIds: ["a", "b", "c", "d", "e"] }))).toBe(
      "Today was very good. Tags added: 5."
    );
  });

  test("numbers repeat check-ins with only a rating, except on hard days", () => {
    expect(text(summaryOf({ entriesCount: 2 }))).toBe(
      "Today was very good. Check-in #2 today. Short and sweet."
    );
    expect(
      text(summaryOf({ entriesCount: 2, rating: "very_bad", tone: "bad" }))
    ).toBe("Thank you for checking in.");
  });
});
