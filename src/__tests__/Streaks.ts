import {
  getCurrentStreak,
  getLongestStreak,
} from "../hooks/useStatistics/Streaks";
import { _generateItem } from "./utils";

const testItems = [
  _generateItem({ date: "2021-01-01" }),
  _generateItem({ date: "2021-01-02" }),
  _generateItem({ date: "2021-01-03" }),
  _generateItem({ date: "2021-01-04" }),
  _generateItem({ date: "2021-01-05" }),

  _generateItem({ date: "2021-01-06" }),
  _generateItem({ date: "2021-01-07" }),
  _generateItem({ date: "2021-01-08" }),

  _generateItem({ date: "2022-01-01" }),
  _generateItem({ date: "2022-01-02" }),
  _generateItem({ date: "2022-01-03" }),

  _generateItem({ date: "2022-01-05" }),

  _generateItem({ date: "2022-01-08" }),
  _generateItem({ date: "2022-01-09" }),
  _generateItem({ date: "2022-01-10" }),
  _generateItem({ date: "2022-01-11" }),
  _generateItem({ date: "2022-01-12" }),
];

describe("utils", () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date("2022-01-12") });
  });

  it("getCurrentStreak", () => {
    expect(getCurrentStreak(testItems)).toBe(5);
  });

  it("getLongestStreak", () => {
    expect(getLongestStreak(testItems)).toBe(8);
  });

  it("getCurrentStreak with no data for today", () => {
    expect(
      getCurrentStreak([
        _generateItem({ date: "2022-01-06" }),
        _generateItem({ date: "2022-01-07" }),
        _generateItem({ date: "2022-01-08" }),
        _generateItem({ date: "2022-01-09" }),
        _generateItem({ date: "2022-01-10" }),
      ])
    ).toBe(0);
  });

  it("getLongestStreak counts a final run that ends yesterday", () => {
    expect(
      getLongestStreak([
        _generateItem({ date: "2021-12-01" }),
        _generateItem({ date: "2021-12-02" }),
        _generateItem({ date: "2022-01-08" }),
        _generateItem({ date: "2022-01-09" }),
        _generateItem({ date: "2022-01-10" }),
        _generateItem({ date: "2022-01-11" }),
      ])
    ).toBe(4);
  });

  it("getLongestStreak counts runs across a DST change", () => {
    expect(
      getLongestStreak([
        _generateItem({ date: "2021-03-27" }),
        _generateItem({ date: "2021-03-28" }),
        _generateItem({ date: "2021-03-29" }),
        _generateItem({ date: "2021-10-30" }),
        _generateItem({ date: "2021-10-31" }),
        _generateItem({ date: "2021-11-01" }),
        _generateItem({ date: "2021-11-02" }),
      ])
    ).toBe(4);
  });

  afterAll(() => {
    jest.useRealTimers();
  });
});
