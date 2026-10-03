import {
  FEATURE_FLAGS,
  getFeatureFlagState,
  isFeatureFlagOn,
} from "../featureFlags";

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

describe("getFeatureFlagState()", () => {
  const consenting = { settingsLoaded: true, analyticsEnabled: true };

  test("is loading until settings load", () => {
    expect(
      getFeatureFlagState({ ...consenting, settingsLoaded: false, value: true })
    ).toBe("loading");
  });

  test("is off right away without analytics consent", () => {
    expect(
      getFeatureFlagState({
        ...consenting,
        analyticsEnabled: false,
        value: undefined,
      })
    ).toBe("off");
  });

  test("is loading until PostHog serves a value", () => {
    expect(getFeatureFlagState({ ...consenting, value: undefined })).toBe(
      "loading"
    );
  });

  test("follows the served value", () => {
    expect(getFeatureFlagState({ ...consenting, value: true })).toBe("on");
    expect(getFeatureFlagState({ ...consenting, value: false })).toBe("off");
  });
});
