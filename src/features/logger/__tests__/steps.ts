import { _generateItem } from "@/__tests__/utils";
import type { LogPhoto } from "@/types";
import { getAvailableStepsForEdit } from "../steps";

const photo: LogPhoto = {
  id: "00000000-0000-4000-8000-000000000001",
  fileName: "00000000-0000-4000-8000-000000000001.jpg",
  width: 100,
  height: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const hasNoStep = () => false;

describe("getAvailableStepsForEdit()", () => {
  test("shows the message step for photos when the step is off", () => {
    const item = _generateItem({ message: "", photos: [photo] });

    expect(getAvailableStepsForEdit({ item, hasStep: hasNoStep })).toEqual([
      "rating",
      "message",
    ]);
  });

  test("hides the message step without message and photos when off", () => {
    const item = _generateItem({ message: "", photos: [] });

    expect(getAvailableStepsForEdit({ item, hasStep: hasNoStep })).toEqual([
      "rating",
    ]);
  });

  test("shows the message step when it is on", () => {
    const item = _generateItem({ message: "", photos: [] });

    expect(
      getAvailableStepsForEdit({
        item,
        hasStep: (step) => step === "message",
      })
    ).toEqual(["rating", "message"]);
  });
});
