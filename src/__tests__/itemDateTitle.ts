import dayjs from "dayjs";
import { getItemDateTitle, getShortItemDateTitle } from "@/lib/utils";

describe("getShortItemDateTitle()", () => {
  test("shows the year only outside the current year", () => {
    const thisYear = dayjs().year();
    // A mid-month day in another month: never today or yesterday.
    const otherMonth = dayjs().month() === 5 ? 1 : 5;
    const earlierThisYear = dayjs()
      .month(otherMonth)
      .date(15)
      .hour(20)
      .toISOString();
    const lastYear = dayjs().subtract(1, "year").toISOString();

    expect(getShortItemDateTitle(earlierThisYear)).not.toContain(
      String(thisYear)
    );
    expect(getShortItemDateTitle(lastYear)).toContain(String(thisYear - 1));
  });

  test("stays shorter than the full entry title", () => {
    const dateTime = dayjs().subtract(8, "day").toISOString();

    expect(getShortItemDateTitle(dateTime).length).toBeLessThan(
      getItemDateTitle(dateTime).length
    );
  });
});
