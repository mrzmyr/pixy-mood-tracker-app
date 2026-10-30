import type { LoggerPrefill } from "@/features/logger";
import { applyVoicePrefill } from "../draft";
import type { Draft } from "../draft";

const draft = (overrides: Partial<Draft> = {}): Draft => ({
  rating: null,
  emotions: [],
  picked: [],
  message: "",
  photos: [],
  source: "empty",
  ...overrides,
});

const prefill = (overrides: Partial<LoggerPrefill> = {}): LoggerPrefill => ({
  message: "",
  tags: [],
  people: [],
  emotions: [],
  ...overrides,
});

describe("applyVoicePrefill", () => {
  it("adds spoken items to picked ones without duplicates", () => {
    const result = applyVoicePrefill(
      draft({ emotions: ["calm"], picked: ["tag:work"] }),
      prefill({
        emotions: ["calm", "tired"],
        tags: ["work", "sport"],
        people: ["ada"],
      })
    );

    expect(result.emotions).toEqual(["calm", "tired"]);
    expect(result.picked).toEqual(["tag:work", "person:ada", "tag:sport"]);
  });

  it("replaces the rating only when a mood was spoken", () => {
    expect(
      applyVoicePrefill(draft({ rating: "bad" }), prefill({ rating: "good" }))
        .rating
    ).toBe("good");
    expect(applyVoicePrefill(draft({ rating: "bad" }), prefill()).rating).toBe(
      "bad"
    );
  });

  it("appends the transcript to the note on a new line", () => {
    expect(
      applyVoicePrefill(draft(), prefill({ message: " Long day " })).message
    ).toBe("Long day");
    expect(
      applyVoicePrefill(
        draft({ message: "Morning run" }),
        prefill({ message: "Long day" })
      ).message
    ).toBe("Morning run\nLong day");
  });

  it("keeps picked photos", () => {
    const photos: Draft["photos"] = [
      {
        id: "a",
        fileName: "a.jpg",
        width: 1,
        height: 1,
        createdAt: "2026-10-30T09:00:00.000Z",
        source: "library",
      },
    ];

    expect(applyVoicePrefill(draft({ photos }), prefill()).photos).toBe(photos);
  });

  it("marks the draft as changed, so a late entry does not replace it", () => {
    expect(applyVoicePrefill(draft(), prefill()).source).toBe("user");
  });
});
