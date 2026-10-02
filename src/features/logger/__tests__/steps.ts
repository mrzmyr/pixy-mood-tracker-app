import { _generateItem } from "@/__tests__/utils";
import { getAvailableStepsForCreate, getAvailableStepsForEdit } from "../steps";

let mockIsPhotosEnabled = true;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the flag is a build-time constant; a getter lets each test pick on or off.
jest.mock("@/constants/FeatureFlags", () => ({
  get IS_PHOTOS_ENABLED() {
    return mockIsPhotosEnabled;
  },
}));

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
    question: null,
    hasStep,
    reminderEnabled: true,
    itemsCount: 5,
  });

describe("logger steps and the photos flag", () => {
  afterEach(() => {
    mockIsPhotosEnabled = true;
  });

  test("flag on: create shows the photos step after the message", () => {
    expect(getCreateSteps()).toEqual([
      "rating",
      "emotions",
      "tags",
      "message",
      "photos",
    ]);
  });

  test("flag off: create hides the photos step even when enabled", () => {
    mockIsPhotosEnabled = false;
    expect(getCreateSteps()).not.toContain("photos");
  });

  test("edit shows the photos step for an entry with photos", () => {
    const item = _generateItem({
      photos: [
        {
          id: "photo-1",
          fileName: "photo-1.jpg",
          width: 1,
          height: 1,
          createdAt: "2026-10-02T10:00:00.000Z",
          source: "camera",
        },
      ],
    });

    expect(getAvailableStepsForEdit({ item, hasStep: () => false })).toContain(
      "photos"
    );

    mockIsPhotosEnabled = false;
    expect(
      getAvailableStepsForEdit({ item, hasStep: () => true })
    ).not.toContain("photos");
  });
});
