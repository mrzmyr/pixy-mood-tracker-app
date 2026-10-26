import type { ErrorEvent } from "@sentry/react-native";

import { scrubBreadcrumb, scrubEvent } from "@/lib/sentry-scrub";

describe("scrubBreadcrumb", () => {
  it("drops console breadcrumbs", () => {
    expect(
      scrubBreadcrumb({
        category: "console",
        message: "Note text: private",
        data: { arguments: [{ why: "Note text: private" }] },
      })
    ).toBeNull();
  });

  it.each(["fetch", "xhr", "http"])(
    "removes query and fragment from %s URLs",
    (category) => {
      const breadcrumb = scrubBreadcrumb({
        category,
        data: {
          url: "https://example.com/questions?note=private#secret",
          method: "GET",
          status_code: 200,
        },
      });

      expect(breadcrumb?.data).toEqual({
        url: "https://example.com/questions",
        method: "GET",
        status_code: 200,
      });
    }
  );

  it("keeps navigation breadcrumbs", () => {
    const breadcrumb = {
      category: "navigation",
      data: { from: "/calendar", to: "/settings" },
    };

    expect(scrubBreadcrumb(breadcrumb)).toEqual(breadcrumb);
  });
});

describe("scrubEvent", () => {
  const event: ErrorEvent = {
    type: undefined,
    exception: {
      values: [
        {
          type: "Error",
          value: "Entries could not be loaded",
          stacktrace: { frames: [{ filename: "app.js", lineno: 1 }] },
        },
      ],
    },
    user: { id: "install-id" },
    extra: {
      __serialized__: {
        status: "logs_load_failed",
        why: "Note text: private",
        fix: "Restart Pixy",
      },
    },
    contexts: {
      Error: {
        status: "logs_load_failed",
        why: "Note text: private",
        fix: "Restart Pixy",
      },
      device: { model: "iPhone16,1" },
    },
    breadcrumbs: [
      { category: "console", message: "Note text: private" },
      { category: "fetch", data: { url: "https://example.com/a?name=Klara" } },
      { category: "navigation", data: { to: "/calendar" } },
    ],
  };

  it("removes why and keeps status and fix", () => {
    const scrubbed = scrubEvent(event);

    expect(scrubbed.extra).toEqual({
      __serialized__: { status: "logs_load_failed", fix: "Restart Pixy" },
    });
    expect(scrubbed.contexts?.Error).toEqual({
      status: "logs_load_failed",
      fix: "Restart Pixy",
    });
    expect(JSON.stringify(scrubbed)).not.toContain("private");
  });

  it("removes the user", () => {
    expect(scrubEvent(event)).not.toHaveProperty("user");
  });

  it("scrubs breadcrumbs merged from the native SDK", () => {
    expect(scrubEvent(event).breadcrumbs).toEqual([
      { category: "fetch", data: { url: "https://example.com/a" } },
      { category: "navigation", data: { to: "/calendar" } },
    ]);
  });

  it("keeps the exception, stack trace, and device context", () => {
    const scrubbed = scrubEvent(event);

    expect(scrubbed.exception).toEqual(event.exception);
    expect(scrubbed.contexts?.device).toEqual({ model: "iPhone16,1" });
  });
});
