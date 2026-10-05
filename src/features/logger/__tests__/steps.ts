import { _generateItem } from "@/__tests__/utils";
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

const getCreateSteps = ({ isPhotosEnabled }: { isPhotosEnabled: boolean }) =>
  getAvailableStepsForCreate({
    question: null,
    hasStep,
    hasSleepOnDay: false,
    reminderEnabled: true,
    itemsCount: 5,
    hasPeople: false,
    isPhotosEnabled,
  });

describe("logger steps and the photos flag", () => {
  test("flag on: create shows the photos step after the message", () => {
    expect(getCreateSteps({ isPhotosEnabled: true })).toEqual([
      "rating",
      "emotions",
      "tags",
      "message",
      "photos",
    ]);
  });

  test("flag off: create hides the photos step even when enabled", () => {
    expect(getCreateSteps({ isPhotosEnabled: false })).not.toContain("photos");
  });

  test("edit shows the photos step for an entry with photos", () => {
    const item = _generateItem({ photos: [PHOTO] });

    expect(
      getAvailableStepsForEdit({
        item,
        hasStep: () => false,
        hasSleepOnDay: false,
        hasPeople: false,
        isPhotosEnabled: true,
      })
    ).toContain("photos");
  });

  test("flag off: edit hides the photos step, also with photos", () => {
    const item = _generateItem({ photos: [PHOTO] });

    expect(
      getAvailableStepsForEdit({
        item,
        hasStep: () => true,
        hasSleepOnDay: false,
        hasPeople: false,
        isPhotosEnabled: false,
      })
    ).not.toContain("photos");
  });
});

describe("logger steps and the people flag", () => {
  test("flag off: create hides the people step even when enabled", () => {
    expect(
      getAvailableStepsForCreate({
        question: null,
        hasStep: () => true,
        hasSleepOnDay: false,
        reminderEnabled: true,
        itemsCount: 5,
        hasPeople: false,
        isPhotosEnabled: false,
      })
    ).not.toContain("people");
  });

  test("flag off: edit keeps the people step for an entry with people", () => {
    const item = _generateItem({ people: [{ id: "p1" }] });

    expect(
      getAvailableStepsForEdit({
        item,
        hasStep: () => false,
        hasSleepOnDay: false,
        hasPeople: false,
        isPhotosEnabled: false,
      })
    ).toContain("people");
  });
});

const getCreateStepsWithSleep = ({
  hasSleepOnDay,
}: {
  hasSleepOnDay: boolean;
}) =>
  getAvailableStepsForCreate({
    question: null,
    hasStep: (step) => step === "sleep" || step === "emotions",
    reminderEnabled: true,
    itemsCount: 5,
    hasSleepOnDay,
    hasPeople: false,
    isPhotosEnabled: false,
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

  test("edit keeps the sleep step for an entry with sleep, also with the step off", () => {
    const item = _generateItem({ sleep: { quality: "good" } });

    expect(
      getAvailableStepsForEdit({
        item,
        hasStep: () => false,
        hasSleepOnDay: true,
        hasPeople: false,
        isPhotosEnabled: false,
      })
    ).toContain("sleep");
  });

  test("edit skips sleep when another entry of the day holds it", () => {
    // SAFETY: entries saved with a skipped sleep step store a null quality.
    const item = _generateItem({ sleep: { quality: null as never } });

    expect(
      getAvailableStepsForEdit({
        item,
        hasStep: () => true,
        hasSleepOnDay: true,
        hasPeople: false,
        isPhotosEnabled: false,
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
      input: { slideCount: 1, slideIndex: 0, isTouched: false, mode: "edit" },
      expected: "save",
    },
    {
      name: "edit with more slides moves to the next slide",
      input: { slideCount: 3, slideIndex: 0, isTouched: false, mode: "edit" },
      expected: "next",
    },
    {
      name: "fresh create logger hides the button",
      input: { slideCount: 3, slideIndex: 0, isTouched: false, mode: "create" },
      expected: "hidden",
    },
    {
      name: "create logger after a carousel move shows next",
      input: { slideCount: 3, slideIndex: 0, isTouched: true, mode: "create" },
      expected: "next",
    },
  ] as const)("$name", ({ input, expected }) => {
    expect(getRatingActionType(input)).toBe(expected);
  });
});
