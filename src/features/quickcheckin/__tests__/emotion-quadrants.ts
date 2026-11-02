import { EMOTIONS } from "@/features/logger";
import { MAPPED_EMOTION_KEYS } from "../emotion-quadrants";

describe("emotion quadrants", () => {
  test("every enabled emotion has a quadrant", () => {
    const unmapped = EMOTIONS.filter(
      (emotion) =>
        emotion.disabled !== true && !MAPPED_EMOTION_KEYS.has(emotion.key)
    ).map((emotion) => emotion.key);

    expect(unmapped).toEqual([]);
  });
});
