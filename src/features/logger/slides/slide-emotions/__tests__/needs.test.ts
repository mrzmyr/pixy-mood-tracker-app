import type { Emotion } from "@/types";
import { getNeedExamples, suggestEmotionsForNeeds } from "../needs";

const emotion = (key: string, disabled = false): Emotion => ({
  key,
  label: key,
  category: "neutral",
  mode: "basic",
  source: "custom",
  description: "",
  disabled,
});

const keysOf = (emotions: Emotion[]) => emotions.map((e) => e.key);

const CATALOG = [
  "tired",
  "exhausted",
  "weak",
  "lonely",
  "alienated",
  "rejected",
  "sad",
  "connected",
  "loved",
  "supported",
  "happy",
  "excited",
  "enthusiastic",
  "bored",
  "meh",
  "calm",
  "anxious",
  "worried",
  "proud",
  "productive",
  "focused",
  "motivated",
  "brave",
  "content",
  "pressured",
  "frustrated",
].map((key) => emotion(key));

describe("suggestEmotionsForNeeds", () => {
  it("suggests nothing while no need is rated", () => {
    expect(suggestEmotionsForNeeds({}, CATALOG)).toEqual([]);
  });

  it("lists emotions of unmet needs before met needs", () => {
    const keys = keysOf(
      suggestEmotionsForNeeds({ joy: "met", body: "unmet" }, CATALOG)
    );

    expect(keys).toEqual([
      "tired",
      "exhausted",
      "weak",
      "happy",
      "excited",
      "enthusiastic",
    ]);
  });

  it("mixes one pleasant and two unpleasant emotions for a partly met need", () => {
    const keys = keysOf(
      suggestEmotionsForNeeds({ connection: "partly" }, CATALOG)
    );

    expect(keys).toEqual(["connected", "lonely", "alienated"]);
  });

  it("skips disabled and unknown emotions", () => {
    const catalog = [emotion("tired", true), emotion("weak")];

    expect(keysOf(suggestEmotionsForNeeds({ body: "unmet" }, catalog))).toEqual(
      ["weak"]
    );
  });

  it("returns each emotion once and at most 10", () => {
    const keys = keysOf(
      suggestEmotionsForNeeds(
        {
          body: "unmet",
          safety: "unmet",
          connection: "unmet",
          autonomy: "unmet",
          competence: "met",
          joy: "unmet",
        },
        CATALOG
      )
    );

    expect(keys).toHaveLength(10);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("getNeedExamples", () => {
  it("takes the first three enabled labels per side", () => {
    const emotions = [
      { ...emotion("tired"), label: "Tired" },
      { ...emotion("exhausted", true), label: "Exhausted" },
      { ...emotion("weak"), label: "Weak" },
      { ...emotion("restless"), label: "Restless" },
      { ...emotion("irritated"), label: "Irritated" },
      { ...emotion("energized"), label: "Energized" },
    ];

    expect(
      getNeedExamples(
        {
          met: ["energized", "missing"],
          unmet: ["tired", "exhausted", "weak", "restless", "irritated"],
        },
        emotions
      )
    ).toEqual({ met: ["Energized"], unmet: ["Tired", "Weak", "Restless"] });
  });
});
