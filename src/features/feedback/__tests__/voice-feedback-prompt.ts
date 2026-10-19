import { getNextVoiceFeedbackPrompt } from "../voice-feedback-prompt";

const withDone =
  (...titles: string[]) =>
  (title: string) =>
    titles.includes(title);

describe("getNextVoiceFeedbackPrompt", () => {
  it("asks on the first voice check-in", () => {
    expect(getNextVoiceFeedbackPrompt(withDone())).toEqual({
      index: 1,
      action: "voice_feedback_1",
    });
  });

  it("asks again until three prompts were shown", () => {
    expect(
      getNextVoiceFeedbackPrompt(
        withDone("voice_feedback_1", "voice_feedback_2")
      )
    ).toEqual({ index: 3, action: "voice_feedback_3" });
  });

  it("stops after three prompts", () => {
    expect(
      getNextVoiceFeedbackPrompt(
        withDone("voice_feedback_1", "voice_feedback_2", "voice_feedback_3")
      )
    ).toBeNull();
  });
});
