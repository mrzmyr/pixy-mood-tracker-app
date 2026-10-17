import { getStartupEntry } from "@/shell/startup-entry";

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
