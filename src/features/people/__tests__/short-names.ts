import { toShortNames } from "../short-names";

describe("toShortNames()", () => {
  test("shows first names", () => {
    expect(toShortNames(["Ada Lovelace", "Jen Park", "Chuky"])).toEqual([
      "Ada",
      "Jen",
      "Chuky",
    ]);
  });

  test("namesakes get their last initial", () => {
    expect(toShortNames(["Anna Klein", "Anna Meyer", "Tobi Lang"])).toEqual([
      "Anna K.",
      "Anna M.",
      "Tobi",
    ]);
  });

  test("keeps full names when the initial still clashes", () => {
    expect(toShortNames(["Anna Klein", "Anna Kurz", "Anna"])).toEqual([
      "Anna Klein",
      "Anna Kurz",
      "Anna",
    ]);
  });

  test("ignores extra spaces", () => {
    expect(toShortNames(["  Oma   Hilde "])).toEqual(["Oma"]);
  });
});
