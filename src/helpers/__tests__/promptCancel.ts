import { createStructuredError } from "@/lib/errors";
import { isConfirmed } from "../promptCancel";

const cancelled = () =>
  createStructuredError({
    status: "prompt_cancelled",
    message: "Confirmation prompt cancelled",
    why: "The user pressed Cancel",
    fix: "No action needed",
  });

describe("isConfirmed()", () => {
  test("returns true when the prompt resolves", async () => {
    await expect(isConfirmed(Promise.resolve({}))).resolves.toBe(true);
  });

  test("returns false instead of rejecting when the prompt is cancelled", async () => {
    await expect(isConfirmed(Promise.reject(cancelled()))).resolves.toBe(false);
  });

  test("rethrows other structured errors unchanged", async () => {
    const error = createStructuredError({
      status: "boom",
      message: "Prompt failed",
      why: "Native alert threw",
      fix: "Retry",
    });

    await expect(isConfirmed(Promise.reject(error))).rejects.toBe(error);
  });

  test("rethrows values without a status", async () => {
    await expect(isConfirmed(Promise.reject(new Error("x")))).rejects.toThrow(
      "x"
    );
  });
});
