import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { _generateItem } from "@/testing/log-item";
import { t } from "@/lib/translation";
import { INITIAL_STATE } from "@/constants/settings";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettingsLoad,
} from "@/state/settings";
import {
  countWords,
  getEntryProperties,
} from "../confirmation/entry-properties";
import {
  getDaySummary,
  getSummarySentence,
  getSummaryTitle,
} from "../confirmation/day-summary";
import type { DaySummary } from "../confirmation/day-summary";
import {
  getBentoRows,
  getPhotoBento,
  joinNames,
} from "../confirmation/entry-summary-layout";
import { useConfirmation } from "../confirmation/use-confirmation";

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
  has_rating: true,
  emotions_count: 2,
  tags_count: 1,
  people_count: 0,
  message_length: 20,
  message_word_count: 4,
  has_sleep: true,
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
  checkIns: [],
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
      // Day strip: oldest first, at the minute of the day.
      checkIns: [
        { minute: 8 * 60, rating: "good" },
        { minute: 20 * 60, rating: "extremely_good" },
      ],
    });
  });

  test("stays calm on a good day with mostly bad emotions", () => {
    const saved = at(`${TODAY}T20:00:00`, {
      rating: "good",
      emotions: ["overwhelmed", "anxious", "stressed", "grateful"],
    });
    const summary = getDaySummary({ items: [saved], item: saved });

    expect(summary.tone).toBe("neutral");
    expect(getSummaryTitle(summary)).not.toBe(t("log_summary_title_good"));
  });

  test("keeps celebrating a good day with mostly good emotions", () => {
    const saved = at(`${TODAY}T20:00:00`, {
      rating: "good",
      emotions: ["anxious", "grateful", "calm"],
    });

    expect(getDaySummary({ items: [saved], item: saved }).tone).toBe("good");
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

  test("tones each emotion by its own category, not the day's mood", () => {
    const tones = sentence(
      summaryOf({ emotions: ["grateful", "weak", "uneasy"] })
    )
      .filter((segment) => segment.mark === "emotion")
      .map((segment) => [segment.text, segment.tone]);

    expect(tones).toEqual([
      ["grateful", "good"],
      ["weak", "bad"],
      ["uneasy", "bad"],
    ]);
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

/** Photo indexes the bento shows for `count` photos, sorted. */
const bentoIndexes = (count: number) =>
  getPhotoBento(count)
    .flatMap((row) => row.columns.flat())
    .sort((a, b) => a - b);

/** Tile indexes per bento row for tiles of these spans. */
const bentoKeys = (spans: ("half" | "full")[]) =>
  getBentoRows(spans.map((span, index) => ({ span, key: index }))).map((row) =>
    row.map((tile) => tile.key)
  );

describe("entry summary", () => {
  test("shows each photo once in the hero, up to 5", () => {
    expect(bentoIndexes(0)).toEqual([]);
    expect(bentoIndexes(1)).toEqual([0]);
    expect(bentoIndexes(2)).toEqual([0, 1]);
    expect(bentoIndexes(3)).toEqual([0, 1, 2]);
    expect(bentoIndexes(4)).toEqual([0, 1, 2, 3]);
    expect(bentoIndexes(9)).toEqual([0, 1, 2, 3, 4]);
  });

  test("pairs half tiles into rows, a lone half takes the row alone", () => {
    expect(bentoKeys(["half", "half", "full"])).toEqual([[0, 1], [2]]);
    expect(bentoKeys(["half", "full", "half", "full"])).toEqual([
      [0, 2],
      [1],
      [3],
    ]);
    expect(bentoKeys(["half", "full"])).toEqual([[0], [1]]);
    expect(bentoKeys(["half", "half", "half"])).toEqual([[0, 1], [2]]);
  });

  test("names up to 3 people, then counts the rest", () => {
    expect(joinNames(["Lena", "Sam"])).toBe("Lena and Sam");
    expect(joinNames(["Lena", "Sam", "Max", "Hilde", "Tobi"])).toBe(
      "Lena, Sam, Max and 2 more"
    );
  });
});
