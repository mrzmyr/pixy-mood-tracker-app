import * as Sentry from "@sentry/react-native";
import noop from "lodash/noop";
import { createStructuredError } from "@/lib/errors";
import { logger, toStructuredError } from "@/lib/logger";

// oxlint-disable-next-line anti-slop/no-module-mocking -- logger is the Sentry seam; the test asserts on what reaches the SDK
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

const fields = {
  status: "test_failed",
  message: "Test failed",
  why: "The test forced a failure",
  fix: "Nothing to fix",
};

describe("logger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(noop);
    jest.spyOn(console, "warn").mockImplementation(noop);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("error() reports structured fields to Sentry", () => {
    logger.error(createStructuredError(fields));

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining(fields),
      {
        tags: { status: "test_failed" },
        extra: { why: fields.why, fix: fields.fix },
      }
    );
  });

  test("error() wraps plain error objects in an Error", () => {
    logger.error(fields);

    const [[reported]] = jest.mocked(Sentry.captureException).mock.calls;
    expect(reported).toBeInstanceOf(Error);
    expect(reported).toMatchObject(fields);
  });

  test("error() survives a failing Sentry SDK", () => {
    jest.mocked(Sentry.captureException).mockImplementationOnce(() => {
      throw createStructuredError({
        status: "sdk_down",
        message: "Sentry SDK failed",
        why: "The test forced the SDK to throw",
        fix: "Nothing to fix",
      });
    });

    expect(() => logger.error(fields)).not.toThrow();
    expect(console.error).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "telemetry_failed" })
    );
  });

  test("warn() never reaches Sentry", () => {
    logger.warn(fields);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(expect.objectContaining(fields));
  });

  test("toStructuredError() keeps already structured errors", () => {
    const error = createStructuredError(fields);

    expect(
      toStructuredError(error, {
        status: "other",
        message: "Other",
        fix: "Other",
      })
    ).toBe(error);
  });

  test("toStructuredError() uses the cause message as why", () => {
    const cause = new Error("disk full");

    expect(
      toStructuredError(cause, {
        status: "write_failed",
        message: "Write failed",
        fix: "Free up space",
      })
    ).toMatchObject({
      status: "write_failed",
      message: "Write failed",
      why: "disk full",
      fix: "Free up space",
      cause,
    });
  });
});
