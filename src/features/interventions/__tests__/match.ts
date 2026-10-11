import dayjs from "dayjs";
import { _generateItem } from "@/__tests__/utils";
import { matchCluster, matchToday } from "../match";

const now = dayjs("2026-10-04T20:30:00");
const at = (time: string, emotions: string[], day = "2026-10-04") =>
  _generateItem({ dateTime: dayjs(`${day}T${time}`).toISOString(), emotions });

describe("matchCluster()", () => {
  test("no matching emotion offers nothing", () => {
    expect(matchCluster([])).toBeNull();
    expect(matchCluster(["happy", "tired"])).toBeNull();
  });

  test("returns only the emotions of the matched cluster", () => {
    expect(matchCluster(["tired", "worried", "nervous"])).toEqual({
      cluster: "anxiety",
      emotions: ["worried", "nervous"],
    });
  });
});

describe("matchToday()", () => {
  test("uses the latest matching entry of today", () => {
    const early = at("09:00", ["worried"]);
    const late = at("14:10", ["anxious"]);
    const unrelated = at("18:00", ["happy"]);

    expect(matchToday([late, unrelated, early], now)?.item).toBe(late);
  });

  test("entries of other days never count", () => {
    expect(
      matchToday([at("23:00", ["anxious"], "2026-10-03")], now)
    ).toBeNull();
  });
});
