import { FEATURE_FLAGS, isFeatureFlagOn } from "../featureFlags";

describe("isFeatureFlagOn()", () => {
  test("is on when the user allowed analytics and PostHog serves true", () => {
    expect(isFeatureFlagOn({ analyticsEnabled: true, value: true })).toBe(true);
  });

  test("is off without analytics consent, even when PostHog serves true", () => {
    expect(isFeatureFlagOn({ analyticsEnabled: false, value: true })).toBe(
      false
    );
  });

  test("is off until flags load or when PostHog serves anything but true", () => {
    expect(isFeatureFlagOn({ analyticsEnabled: true, value: undefined })).toBe(
      false
    );
    expect(isFeatureFlagOn({ analyticsEnabled: true, value: false })).toBe(
      false
    );
    expect(isFeatureFlagOn({ analyticsEnabled: true, value: "variant" })).toBe(
      false
    );
  });

  test("widget flag key is stable", () => {
    expect(FEATURE_FLAGS.homeScreenWidget).toBe("home-screen-widget");
  });
});
