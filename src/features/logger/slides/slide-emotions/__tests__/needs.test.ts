import type { Emotion } from "@/types";
import { NEEDS, suggestEmotionsForNeed } from "../needs";
import type { NeedKey } from "../needs";

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

// SAFETY: NeedKey comes from NEEDS, so every key has one entry.
const NEED_BY_KEY = Object.fromEntries(
  NEEDS.map((need) => [need.key, need])
) as Record<NeedKey, (typeof NEEDS)[number]>;
const need = (key: NeedKey) => NEED_BY_KEY[key];

describe("suggestEmotionsForNeed", () => {
  it("shows four unpleasant emotions for an unmet need", () => {
    expect(
      keysOf(suggestEmotionsForNeed(need("connection"), "unmet", CATALOG))
    ).toEqual(["lonely", "alienated", "rejected", "sad"]);
  });

  it("shows pleasant emotions for a met need", () => {
    expect(keysOf(suggestEmotionsForNeed(need("joy"), "met", CATALOG))).toEqual(
      ["happy", "excited", "enthusiastic", "content"]
    );
  });

  it("mixes two pleasant and two unpleasant emotions for a partly met need", () => {
    expect(
      keysOf(suggestEmotionsForNeed(need("connection"), "partly", CATALOG))
    ).toEqual(["connected", "loved", "lonely", "alienated"]);
  });

  it("skips disabled and unknown emotions", () => {
    const catalog = [emotion("tired", true), emotion("weak")];

    expect(
      keysOf(suggestEmotionsForNeed(need("body"), "unmet", catalog))
    ).toEqual(["weak"]);
  });
});
