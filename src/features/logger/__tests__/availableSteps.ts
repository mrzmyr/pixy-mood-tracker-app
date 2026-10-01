import { _generateItem } from "@/__tests__/utils";
import type { LoggerStep } from "@/constants/LoggerSteps";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  getAvailableStepsForCreate,
  getAvailableStepsForEdit,
} from "../availableSteps";

const createHasStep =
  (steps: string[]) =>
  (step: string): boolean =>
    steps.includes(step);

const PHOTO = {
  id: "8f6b8a52-2f6a-4c55-9a8e-1f2d3c4b5a69",
  fileName: "8f6b8a52-2f6a-4c55-9a8e-1f2d3c4b5a69.jpg",
  width: 1200,
  height: 1600,
  createdAt: "2026-10-01T18:00:00.000Z",
};

describe("getAvailableStepsForCreate()", () => {
  test("shows photos after message with default steps", () => {
    const steps = getAvailableStepsForCreate({
      question: null,
      hasStep: createHasStep(INITIAL_STATE.steps),
      reminderEnabled: true,
      itemsCount: 0,
    });

    expect(steps).toEqual<LoggerStep[]>([
      "rating",
      "emotions",
      "tags",
      "message",
      "photos",
    ]);
  });

  test("puts the reminder slide after photos", () => {
    const steps = getAvailableStepsForCreate({
      question: null,
      hasStep: createHasStep(INITIAL_STATE.steps),
      reminderEnabled: false,
      itemsCount: 1,
    });

    expect(steps.slice(-2)).toEqual<LoggerStep[]>(["photos", "reminder"]);
  });

  test("hides photos when the step is off", () => {
    const steps = getAvailableStepsForCreate({
      question: null,
      hasStep: createHasStep(["rating", "message"]),
      reminderEnabled: true,
      itemsCount: 0,
    });

    expect(steps).toEqual<LoggerStep[]>(["rating", "message"]);
  });
});

describe("getAvailableStepsForEdit()", () => {
  test("shows photos when the step is on", () => {
    const steps = getAvailableStepsForEdit({
      item: _generateItem({ message: "" }),
      hasStep: createHasStep(["rating", "photos"]),
    });

    expect(steps).toEqual<LoggerStep[]>(["rating", "photos"]);
  });

  test("shows photos when the step is off but the entry has photos", () => {
    const steps = getAvailableStepsForEdit({
      item: _generateItem({ message: "", photos: [PHOTO] }),
      hasStep: createHasStep(["rating"]),
    });

    expect(steps).toEqual<LoggerStep[]>(["rating", "photos"]);
  });

  test("hides photos when the step is off and the entry has none", () => {
    const steps = getAvailableStepsForEdit({
      item: _generateItem({ message: "" }),
      hasStep: createHasStep(["rating"]),
    });

    expect(steps).toEqual<LoggerStep[]>(["rating"]);
  });
});
