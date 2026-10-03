import { requiresAnalyticsConsent } from "@/state/analytics/consent";

describe("requiresAnalyticsConsent()", () => {
  test.each(["DE", "FR", "AT", "NO", "GB", "CH", "RE", "de"])(
    "requires consent in %s",
    (region) => {
      expect(requiresAnalyticsConsent(region)).toBe(true);
    }
  );

  test.each(["US", "CA", "BR", "JP", "IN", "AU"])(
    "does not require consent in %s",
    (region) => {
      expect(requiresAnalyticsConsent(region)).toBe(false);
    }
  );

  test("requires consent when the region is unknown", () => {
    expect(requiresAnalyticsConsent(null)).toBe(true);
  });
});
