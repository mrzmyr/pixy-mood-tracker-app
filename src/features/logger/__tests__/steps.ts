import { _generateItem } from "@/testing/log-item";
import type { LogPhoto } from "@/types";
import {
  getAvailableStepsForCreate,
  getAvailableStepsForEdit,
  getRatingActionType,
  hasSleepOnDate,
} from "../steps";

const PHOTO: LogPhoto = {
  id: "photo-1",
  fileName: "photo-1.jpg",
  width: 1,
  height: 1,
  createdAt: "2026-10-02T10:00:00.000Z",
  source: "library",
};

const enabledSteps = new Set<string>([
  "rating",
  "emotions",
  "tags",
  "message",
  "photos",
]);
const hasStep = (step: string) => enabledSteps.has(step);

const getCreateSteps = () =>
  getAvailableStepsForCreate({
    isMenstruationEnabled: false,
    hasMenstruationOnDay: false,
    question: null,
    hasStep,
    hasSleepOnDay: false,
    isSleepAutoFilled: false,
    reminderEnabled: true,
    itemsCount: 5,
  });

describe("logger steps and photos", () => {
  test("create shows the photos step before the message", () => {
    expect(getCreateSteps()).toEqual([
      "rating",
      "emotions",
      "tags",
      "photos",
      "message",
    ]);
  });

  test("edit shows the photos step for an entry with photos", () => {
    const item = _generateItem({ photos: [PHOTO] });

    expect(
      getAvailableStepsForEdit({
        isMenstruationEnabled: false,
        item,
        hasStep: () => false,
        hasSleepOnDay: false,
      })
    ).toContain("photos");
  });

  test("edit shows the photos step before the message", () => {
    const item = _generateItem({ photos: [PHOTO], message: "Lunch" });

    const steps = getAvailableStepsForEdit({
      isMenstruationEnabled: false,
      item,
      hasStep: () => false,
      hasSleepOnDay: false,
    });

    expect(steps.slice(-2)).toEqual(["photos", "message"]);
  });
});

describe("logger steps and people", () => {
  test("edit keeps the people step for an entry with people, also with the step off", () => {
    const item = _generateItem({ people: [{ id: "p1" }] });

    expect(
      getAvailableStepsForEdit({
        isMenstruationEnabled: false,
        item,
        hasStep: () => false,
        hasSleepOnDay: false,
      })
    ).toContain("people");
  });
});

const getCreateStepsWithSleep = ({
  hasSleepOnDay,
  isSleepAutoFilled = false,
}: {
  hasSleepOnDay: boolean;
  isSleepAutoFilled?: boolean;
}) =>
  getAvailableStepsForCreate({
    isMenstruationEnabled: false,
    hasMenstruationOnDay: false,
    question: null,
    hasStep: (step) => step === "sleep" || step === "emotions",
    reminderEnabled: true,
    itemsCount: 5,
    hasSleepOnDay,
    isSleepAutoFilled,
  });

describe("logger steps and sleep", () => {
  test("create asks for sleep after the rating, before emotions", () => {
    expect(getCreateStepsWithSleep({ hasSleepOnDay: false })).toEqual([
      "rating",
      "sleep",
      "emotions",
    ]);
  });

  test("create skips sleep when the day already holds a sleep quality", () => {
    expect(getCreateStepsWithSleep({ hasSleepOnDay: true })).toEqual([
      "rating",
      "emotions",
    ]);
  });

  test("create skips sleep while Apple Health fills it", () => {
    expect(
      getCreateStepsWithSleep({ hasSleepOnDay: false, isSleepAutoFilled: true })
    ).toEqual(["rating", "emotions"]);
  });

  test("edit keeps the sleep step for an entry with sleep, also with the step off", () => {
    const item = _generateItem({ sleep: { quality: "good" } });

    expect(
      getAvailableStepsForEdit({
        isMenstruationEnabled: false,
        item,
        hasStep: () => false,
        hasSleepOnDay: true,
      })
    ).toContain("sleep");
  });

  test("edit skips sleep when another entry of the day holds it", () => {
    // SAFETY: entries saved with a skipped sleep step store a null quality.
    const item = _generateItem({ sleep: { quality: null as never } });

    expect(
      getAvailableStepsForEdit({
        isMenstruationEnabled: false,
        item,
        hasStep: () => true,
        hasSleepOnDay: true,
      })
    ).not.toContain("sleep");
  });

  test("hasSleepOnDate only counts entries of that day with a quality", () => {
    const items = [
      _generateItem({
        dateTime: "2026-10-01T09:00:00",
        sleep: { quality: "good" },
      }),
      // SAFETY: entries saved with a skipped sleep step store a null quality.
      _generateItem({
        dateTime: "2026-10-02T09:00:00",
        sleep: { quality: null as never },
      }),
    ];

    expect(hasSleepOnDate(items, "2026-10-01")).toBe(true);
    expect(hasSleepOnDate(items, "2026-10-02")).toBe(false);
    expect(hasSleepOnDate(items, "2026-10-03")).toBe(false);
  });
});

describe("rating slide button", () => {
  test.each([
    {
      name: "edit with rating as the only slide saves",
      input: {
        slideCount: 1,
        slideIndex: 0,
        isTouched: false,
        hasRating: false,
        mode: "edit",
      },
      expected: "save",
    },
    {
      name: "edit with more slides moves to the next slide",
      input: {
        slideCount: 3,
        slideIndex: 0,
        isTouched: false,
        hasRating: false,
        mode: "edit",
      },
      expected: "next",
    },
    {
      name: "fresh create logger hides the button",
      input: {
        slideCount: 3,
        slideIndex: 0,
        isTouched: false,
        hasRating: false,
        mode: "create",
      },
      expected: "hidden",
    },
    {
      name: "create logger after a carousel move shows next",
      input: {
        slideCount: 3,
        slideIndex: 0,
        isTouched: true,
        hasRating: false,
        mode: "create",
      },
      expected: "next",
    },
    {
      name: "create logger with a prefilled rating shows next",
      input: {
        slideCount: 3,
        slideIndex: 0,
        isTouched: false,
        hasRating: true,
        mode: "create",
      },
      expected: "next",
    },
  ] as const)("$name", ({ input, expected }) => {
    expect(getRatingActionType(input)).toBe(expected);
  });
});
