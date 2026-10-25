import { createStructuredError } from "@/lib/errors";
import { toObserveError } from "@/lib/report-error";

describe("toObserveError", () => {
  const error = createStructuredError({
    status: "widget_year_image_failed",
    message: "Year widget image could not be captured",
    why: "Note text: private",
    fix: "Open Pixy again",
  });

  it("leads the message with the status", () => {
    expect(toObserveError(error).message).toBe(
      "widget_year_image_failed: Year widget image could not be captured"
    );
  });

  it("drops why and fix, which can quote stored data", () => {
    const observeError = toObserveError(error);

    expect(observeError).not.toHaveProperty("why");
    expect(observeError).not.toHaveProperty("fix");
    expect(JSON.stringify(observeError)).not.toContain("private");
  });

  it("keeps the stack for symbolication", () => {
    expect(toObserveError(error).stack).toBe(error.stack);
  });
});
