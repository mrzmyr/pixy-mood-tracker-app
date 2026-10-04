import { reminderTimeToDate } from "../reminderTime";

describe("reminderTimeToDate()", () => {
  test("returns today at the stored hour and minute", () => {
    const date = reminderTimeToDate("21:45");

    expect(date.getHours()).toBe(21);
    expect(date.getMinutes()).toBe(45);
    expect(date.getSeconds()).toBe(0);
    expect(date.toDateString()).toBe(new Date().toDateString());
  });
});
