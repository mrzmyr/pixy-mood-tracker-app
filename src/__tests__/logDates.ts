import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";
import { getItemDate, getItemTime } from "@/lib/logDates";
import { _generateItem } from "./utils";

describe("logDates", () => {
  it("returns the local day and epoch time of dateTime", () => {
    for (const dateTime of [
      "2022-01-01T00:30:00.000Z",
      "2022-03-27T01:59:59.000Z",
      "2022-06-15T23:59:59.999Z",
      "2022-12-31T23:30:00.000Z",
    ]) {
      const item = { ..._generateItem({ date: "2022-01-01" }), dateTime };

      expect(getItemDate(item)).toBe(dayjs(dateTime).format(DATE_FORMAT));
      expect(getItemTime(item)).toBe(dayjs(dateTime).valueOf());
    }
  });

  it("caches values per entry object", () => {
    const item = _generateItem({ date: "2022-01-01" });
    const first = getItemDate(item);

    expect(getItemDate(item)).toBe(first);

    const edited = { ...item, dateTime: "2022-02-02T12:00:00.000Z" };
    expect(getItemDate(edited)).toBe(
      dayjs(edited.dateTime).format(DATE_FORMAT)
    );
    expect(getItemDate(item)).toBe(first);
  });
});
