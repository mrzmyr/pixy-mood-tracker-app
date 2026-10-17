import { getEntryCountRange, getStartupEntry } from "@/shell/startupEntry";

describe("getStartupEntry", () => {
  it("reports onboarding before the user finished it", () => {
    expect(
      getStartupEntry({ hasOnboarded: false, hasLaunchNotification: true })
    ).toBe("onboarding");
  });

  it("reports a notification launch", () => {
    expect(
      getStartupEntry({ hasOnboarded: true, hasLaunchNotification: true })
    ).toBe("notification");
  });

  it("reports home for a plain launch", () => {
    expect(
      getStartupEntry({ hasOnboarded: true, hasLaunchNotification: false })
    ).toBe("home");
  });
});

describe("getEntryCountRange", () => {
  it.each([
    [0, "0"],
    [1, "1-30"],
    [30, "1-30"],
    [31, "31-365"],
    [365, "31-365"],
    [1000, "366-1000"],
    [3000, "1001-3000"],
    [3001, "3001+"],
  ])("puts %i entries in %s", (count, range) => {
    expect(getEntryCountRange(count)).toBe(range);
  });
});
