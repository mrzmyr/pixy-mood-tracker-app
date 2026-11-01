import { createStructuredError } from "@/lib/errors";
import { getStorageLoadEvent } from "@/shell/storage-load-event";

describe("getStorageLoadEvent", () => {
  it("waits while stores load", () => {
    expect(getStorageLoadEvent({ status: "loading" }, 120)).toBeNull();
  });

  it("logs a ready load with whole milliseconds", () => {
    expect(getStorageLoadEvent({ status: "ready" }, 120.6)).toEqual({
      attributes: { outcome: "ready", duration_ms: 121 },
      severity: "info",
    });
  });

  it("logs a failed load as error with its status, not its cause", () => {
    const error = createStructuredError({
      status: "storage_parse_failed",
      message: "Logs could not be read",
      why: "Stored JSON is invalid",
      fix: "Export raw data and contact support",
    });

    const event = getStorageLoadEvent({ status: "error", error }, 80);

    expect(event).toEqual({
      attributes: {
        outcome: "error",
        duration_ms: 80,
        error_status: "storage_parse_failed",
      },
      severity: "error",
    });
  });
});
