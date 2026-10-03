import { _generateItem } from "@/__tests__/utils";
import type { LogPhoto } from "@/types";
import { getAvailableStepsForCreate, getAvailableStepsForEdit } from "../steps";

const PHOTO: LogPhoto = {
  id: "photo-1",
  fileName: "photo-1.jpg",
  width: 1,
  height: 1,
  createdAt: "2026-10-02T10:00:00.000Z",
  source: "camera",
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
        isPhotosEnabled: false,
      })
    ).not.toContain("photos");
  });
});
