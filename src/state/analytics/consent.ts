import * as Localization from "expo-localization";

/**
 * Regions where analytics needs opt-in consent (GDPR and ePrivacy rules):
 * EU member states and their outermost regions, EEA, UK, and Switzerland.
 */
const CONSENT_REGIONS = new Set([
  // EU
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
  // EU regions with their own region code
  "AX",
  "EA",
  "GF",
  "GP",
  "IC",
  "MF",
  "MQ",
  "RE",
  "YT",
  // EEA
  "IS",
  "LI",
  "NO",
  // UK and Switzerland
  "GB",
  "GI",
  "CH",
]);

/**
 * Whether analytics must stay off until the user opts in. An unknown region
 * requires consent, so a missing region never turns analytics on.
 */
export const requiresAnalyticsConsent = (regionCode: string | null) =>
  regionCode === null || CONSENT_REGIONS.has(regionCode.toUpperCase());

/** Device region (for example `DE`), read once at startup. */
const deviceRegion = Localization.getLocales()[0]?.regionCode ?? null;

/** Whether this device's region needs opt-in consent for analytics. */
export const DEVICE_REQUIRES_CONSENT = requiresAnalyticsConsent(deviceRegion);

/**
 * Analytics default for fresh installs and factory resets: off where consent
 * is required, on elsewhere. Users can change it in Settings > Privacy.
 */
export const DEFAULT_ANALYTICS_ENABLED = !DEVICE_REQUIRES_CONSENT;
