import { encodeLoggerPrefill, parseLoggerPrefill } from "../prefill";

const known = { tags: ["t1", "t2"], people: ["p1"], emotions: ["calm"] };

describe("parseLoggerPrefill", () => {
  it("round trips a prefill", () => {
    const prefill = {
      message: "Met Anna, calm",
      tags: ["t2"],
      people: ["p1"],
      emotions: ["calm"],
    };
    expect(parseLoggerPrefill(encodeLoggerPrefill(prefill), known)).toEqual(
      prefill
    );
  });

  it("drops unknown and duplicate ids", () => {
    const param = encodeLoggerPrefill({
      message: "",
      tags: ["t1", "gone", "t1"],
      people: ["p-deleted"],
      emotions: ["calm", "not_an_emotion"],
    });
    expect(parseLoggerPrefill(param, known)).toEqual({
      message: "",
      tags: ["t1"],
      people: [],
      emotions: ["calm"],
    });
  });

  it("returns null for a missing or invalid param", () => {
    expect(parseLoggerPrefill(undefined, known)).toBeNull();
    expect(parseLoggerPrefill("{not json", known)).toBeNull();
    expect(parseLoggerPrefill('{"tags":"t1"}', known)).toBeNull();
  });
});
