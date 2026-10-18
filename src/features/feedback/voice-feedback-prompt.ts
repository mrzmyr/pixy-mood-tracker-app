/** How many voice check-ins ask for feedback. */
export const VOICE_FEEDBACK_PROMPTS = 3;

/** `actionsDone` title of the n-th voice feedback prompt (1-based). */
const promptAction = (index: number) => `voice_feedback_${index}`;

/**
 * Next voice feedback prompt, or `null` after {@link VOICE_FEEDBACK_PROMPTS}
 * prompts. Shown and skipped prompts both count. Uses one `actionsDone`
 * title per prompt, because `addActionDone` stores each title once.
 */
export const getNextVoiceFeedbackPrompt = (
  hasActionDone: (title: string) => boolean
): { index: number; action: string } | null => {
  for (let index = 1; index <= VOICE_FEEDBACK_PROMPTS; index += 1) {
    if (!hasActionDone(promptAction(index))) {
      return { index, action: promptAction(index) };
    }
  }
  return null;
};
