import { formatAgo, lastConnected } from "../last-connected";
import { makeInput } from "./utils";

const person = (id: string) => ({
  id,
  name: id,
  photoUri: null,
  role: null,
});

describe("Orbit last connected", () => {
  it("takes each person's latest day, not their first", () => {
    const { days } = makeInput({
      kind: "year",
      today: "2026-10-12",
      items: [
        { date: "2026-10-01", people: [person("ana")] },
        { date: "2026-10-09", people: [person("ana"), person("ben")] },
        { date: "2026-10-03", people: [person("ben")] },
      ],
    });
    const last = lastConnected(days);
    expect(last.get("ana")).toBe("2026-10-09");
    expect(last.get("ben")).toBe("2026-10-09");
  });

  it.each([
    ["2026-10-12", "Today"],
    ["2026-10-11", "1d ago"],
    ["2026-10-06", "6d ago"],
    ["2026-10-05", "1w ago"],
    ["2026-09-13", "4w ago"],
    ["2026-09-12", "1mo ago"],
    ["2025-10-13", "11mo ago"],
  ])("shows %s as %s", (date, label) => {
    expect(formatAgo(date, "2026-10-12")).toBe(label);
  });
});
