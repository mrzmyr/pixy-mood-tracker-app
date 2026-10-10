/** Status of the error that confirmation prompts reject with on Cancel. */
export const PROMPT_CANCELLED = "prompt_cancelled";

/**
 * Await a confirmation prompt without an unhandled rejection on Cancel.
 *
 * @returns `true` when the user confirms, `false` when the user cancels.
 *   Any other error is rethrown unchanged, keeping its `status`, `message`,
 *   `why`, and `fix`.
 */
export const isConfirmed = async (prompt: Promise<unknown>) => {
  try {
    await prompt;
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "status" in error &&
      error.status === PROMPT_CANCELLED
    ) {
      return false;
    }
    throw error;
  }
};
