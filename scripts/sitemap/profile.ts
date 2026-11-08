// Fixed capture inputs. Every value here is part of each state's input hash:
// change one and every state captures again.

/** Bump to invalidate every cached screenshot, for example after a capture logic fix. */
export const SCHEMA_VERSION = 1;

/** Simulator, OS runtime, and app settings of every capture. */
export const DEVICE_PROFILE = {
  model: "iPhone 17 Pro",
  /** `xcrun simctl list runtimes`: version and build must match exactly. */
  runtime: { version: "26.4", build: "23E244" },
  language: "en",
  locale: "en_US",
  timeZone: "Europe/Berlin",
  appearance: "light",
  contentSize: "large",
  /** Wall clock at launch, see scripts/sitemap/capture-polyfill.js. */
  clockStart: "2026-03-18T09:41:00+01:00",
  statusBar: {
    time: "9:41",
    dataNetwork: "wifi",
    wifiMode: "active",
    wifiBars: "3",
    cellularMode: "active",
    cellularBars: "4",
    batteryState: "charged",
    batteryLevel: "100",
    operatorName: "",
  },
} as const;

/** Seconds from launch to screenshot. Longer and a clock minute can roll over. */
export const CLOCK_BUDGET_SECONDS = 50;

/** Bundle-time env of the capture build, on top of the eas.json preview profile. */
export const CAPTURE_ENV = { EXPO_PUBLIC_SITEMAP_CAPTURE: "1" } as const;

/** Site images: screenshot pixels divided by this, so 1 image px = 1 point. */
export const SITE_IMAGE_SCALE = 3;
