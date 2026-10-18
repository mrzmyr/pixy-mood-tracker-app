import { getCalendarStoryMonth } from "../story/calendar-month";

describe("calendar story card", () => {
  test("offers the month on its last day", () => {
    expect(getCalendarStoryMonth("2026-09-30")).toBe("2026-09-01");
  });

  test("offers last month on the first 2 days", () => {
    expect(getCalendarStoryMonth("2026-10-01")).toBe("2026-09-01");
    expect(getCalendarStoryMonth("2026-10-02")).toBe("2026-09-01");
  });

  test("stays away on other days", () => {
    expect(getCalendarStoryMonth("2026-10-03")).toBeNull();
    expect(getCalendarStoryMonth("2026-10-29")).toBeNull();
  });

  test("handles the turn of the year", () => {
    expect(getCalendarStoryMonth("2027-01-02")).toBe("2026-12-01");
  });
});
