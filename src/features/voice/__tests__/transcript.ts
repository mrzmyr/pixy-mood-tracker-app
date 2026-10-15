import {
  applyResult,
  commitPartial,
  EMPTY_TRANSCRIPT,
  transcriptText,
} from "../transcript";

describe("transcript", () => {
  it("replaces partial results of the running segment", () => {
    let state = applyResult(EMPTY_TRANSCRIPT, {
      text: "I met",
      isFinal: false,
    });
    state = applyResult(state, { text: "I met Anna", isFinal: false });
    expect(transcriptText(state)).toBe("I met Anna");
  });

  it("appends a new segment after a final result", () => {
    let state = applyResult(EMPTY_TRANSCRIPT, {
      text: "I met Anna",
      isFinal: true,
    });
    state = applyResult(state, { text: "felt calm", isFinal: false });
    expect(transcriptText(state)).toBe("I met Anna felt calm");
  });

  it("keeps the partial on pause, so resume appends", () => {
    let state = applyResult(EMPTY_TRANSCRIPT, { text: "work", isFinal: false });
    state = commitPartial(state);
    state = applyResult(state, { text: "then gym", isFinal: false });
    expect(transcriptText(state)).toBe("work then gym");
  });

  it("drops empty segments", () => {
    let state = applyResult(EMPTY_TRANSCRIPT, { text: "  ", isFinal: true });
    state = commitPartial(state);
    expect(state.committed).toEqual([]);
    expect(transcriptText(state)).toBe("");
  });

  it("keeps the old text when the recognizer restarts after a pause", () => {
    let state = applyResult(EMPTY_TRANSCRIPT, {
      text: "Long day at work",
      isFinal: false,
    });
    state = applyResult(state, { text: "I called", isFinal: false });
    state = applyResult(state, { text: "I called Sam", isFinal: false });
    expect(transcriptText(state)).toBe("Long day at work I called Sam");
  });

  it("ignores empty partial results", () => {
    let state = applyResult(EMPTY_TRANSCRIPT, { text: "Sam", isFinal: false });
    state = applyResult(state, { text: " ", isFinal: false });
    expect(transcriptText(state)).toBe("Sam");
  });
});
