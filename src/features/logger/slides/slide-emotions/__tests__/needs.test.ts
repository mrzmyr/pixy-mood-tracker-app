import { EMOTIONS } from "../../../config";
import type { Emotion } from "@/types";
import {
  feelingsForNeed,
  NEEDS,
  pickedForNeed,
  previewFeelings,
} from "../needs";
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

// SAFETY: NeedKey comes from NEEDS, so every key has one entry.
const NEED_BY_KEY = Object.fromEntries(
  NEEDS.map((need) => [need.key, need])
) as Record<NeedKey, (typeof NEEDS)[number]>;
const need = (key: NeedKey) => NEED_BY_KEY[key];

const CATALOG = [...new Set(NEEDS.flatMap((n) => [...n.met, ...n.unmet]))].map(
  (key) => emotion(key)
);

describe("feelingsForNeed", () => {
  it("shows only unpleasant feelings for an unmet need, strongest first", () => {
    const feelings = feelingsForNeed(need("connection"), "unmet", CATALOG);

    expect(feelings.met).toEqual([]);
    expect(keysOf(feelings.unmet).slice(0, 4)).toEqual([
      "lonely",
      "alienated",
      "rejected",
      "sad",
    ]);
  });

  it("shows both sides for a partly met need", () => {
    const feelings = feelingsForNeed(need("joy"), "partly", CATALOG);

    expect(feelings.met[0]?.key).toBe("happy");
    expect(feelings.unmet[0]?.key).toBe("bored");
  });

  it("skips disabled and unknown emotions", () => {
    const catalog = [emotion("tired", true), emotion("weak")];

    expect(
      keysOf(feelingsForNeed(need("body"), "unmet", catalog).unmet)
    ).toEqual(["weak"]);
  });
});

describe("previewFeelings", () => {
  it("shows 8 feelings before More", () => {
    const preview = previewFeelings(
      feelingsForNeed(need("joy"), "met", CATALOG)
    );

    expect(preview.met).toHaveLength(8);
  });

  it("shows 4 per side for a partly met need", () => {
    const preview = previewFeelings(
      feelingsForNeed(need("safety"), "partly", CATALOG)
    );

    expect(preview.met).toHaveLength(4);
    expect(preview.unmet).toHaveLength(4);
  });
});

describe("pickedForNeed", () => {
  const picks = [emotion("happy"), emotion("bored"), emotion("calm")];

  it("returns nothing for an unrated need", () => {
    expect(pickedForNeed(need("joy"), undefined, picks)).toEqual([]);
  });

  it("returns picks on the rated side only", () => {
    expect(keysOf(pickedForNeed(need("joy"), "met", picks))).toEqual(["happy"]);
  });
});

describe("NEEDS", () => {
  const enabled = EMOTIONS.filter((e) => e.disabled !== true);

  it("lists only emotions that exist", () => {
    const known = new Set(EMOTIONS.map((e) => e.key));
    const unknown = NEEDS.flatMap((n) => [...n.met, ...n.unmet]).filter(
      (key) => !known.has(key)
    );

    expect(unknown).toEqual([]);
  });

  it("reaches every enabled emotion from at least one need", () => {
    const listed = new Set<string>(
      NEEDS.flatMap((n) => [...n.met, ...n.unmet])
    );
    const missing = enabled.map((e) => e.key).filter((key) => !listed.has(key));

    expect(missing).toEqual([]);
  });
});
