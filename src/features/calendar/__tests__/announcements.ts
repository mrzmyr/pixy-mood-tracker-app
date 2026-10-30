import {
  AnnouncementsSchema,
  pickAnnouncements,
} from "../screens/calendar/announcements";
import type { Announcement } from "../screens/calendar/announcements";

const now = new Date("2026-11-01T12:00:00Z");

const item = (
  id: string,
  overrides: Partial<Announcement> = {}
): Announcement => ({
  id,
  title: { en: id },
  url: `https://pixy.day/changelog/${id}`,
  date: "2026-10-01T00:00:00Z",
  ...overrides,
});

const pick = (announcements: Announcement[], dismissed: string[] = []) =>
  pickAnnouncements({
    announcements,
    dismissedIds: new Set(dismissed),
    appVersion: "1.105.0",
    platform: "ios",
    now,
  }).map((announcement) => announcement.id);

describe("pickAnnouncements", () => {
  it("sorts newest first and skips dismissed ones", () => {
    expect(
      pick(
        [
          item("old", { date: "2026-09-01T00:00:00Z" }),
          item("new", { date: "2026-10-30T00:00:00Z" }),
          item("seen"),
        ],
        ["seen"]
      )
    ).toEqual(["new", "old"]);
  });

  it("shows only between start and end date", () => {
    expect(
      pick([
        item("future", { date: "2026-11-02T00:00:00Z" }),
        item("ended", { endsAt: "2026-10-31T00:00:00Z" }),
        item("running", { endsAt: "2026-11-02T00:00:00Z" }),
      ])
    ).toEqual(["running"]);
  });

  it("matches app version range and platform", () => {
    expect(
      pick([
        item("newer-app", { appVersion: ">= 1.106.0" }),
        item("this-app", { appVersion: ">= 1.105.0" }),
        item("android", { platforms: ["android"] }),
        item("ios", { platforms: ["ios"] }),
      ])
    ).toEqual(["this-app", "ios"]);
  });
});

describe("AnnouncementsSchema", () => {
  it("rejects error bodies and drops malformed items", () => {
    expect(AnnouncementsSchema.safeParse({ message: "error" }).success).toBe(
      false
    );
    expect(
      AnnouncementsSchema.parse([
        null,
        { id: "no-title", url: "x" },
        item("ok"),
      ])
    ).toEqual([item("ok")]);
  });
});
