import { _generateItem } from "@/__tests__/utils";
import type { LogPhoto } from "@/types";
import {
  getAvailableStepsForCreate,
  getAvailableStepsForEdit,
  getRatingActionType,
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
        hasPeople: false,
        isPhotosEnabled: false,
      })
    ).toContain("people");
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
