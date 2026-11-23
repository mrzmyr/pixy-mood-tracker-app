// Fixed capture inputs. Every value here is part of each state's input hash:
// change one and every state captures again.

/** Bump to invalidate every cached screenshot, for example after a capture logic fix. */
export const SCHEMA_VERSION = 1;

/** Simulator, OS runtime, and app settings of every iOS capture. */
export const DEVICE_PROFILE = {
  model: "iPhone 17 Pro",
  /** `xcrun simctl list runtimes`: version and build must match exactly. */
  runtime: { version: "26.4", build: "23E244" },
  language: "en",
  locale: "en_US",
  timeZone: "Europe/Berlin",
  contentSize: "large",
  /** Wall clock at launch, see scripts/sitemap/capture-polyfill.js. */
  clockStart: "2026-03-18T09:41:00+01:00",
  /**
   * Dynamic Island in screenshot pixels. The simulator draws its antialiased
   * edge with up to 2 levels of noise, so capture redraws it as a hard
   * stadium on the row background.
   */
  island: { x: 415, y: 42, width: 376, height: 110 },
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

/** Emulator, system image, and settings of every Android capture. */
export const ANDROID_PROFILE = {
  model: "Pixel 8",
  /** `sdkmanager` package and its `Pkg.Revision`: both must match exactly. */
  systemImage: {
    package: "system-images;android-36;google_apis_playstore;arm64-v8a",
    revision: "7",
  },
  locale: "en-US",
  timeZone: "Europe/Berlin",
  fontScale: "1.0",
  clockStart: DEVICE_PROFILE.clockStart,
  /** System UI demo mode: fixed clock, full battery and wifi, no mobile, no icons. */
  statusBar: { clock: "0941", battery: "100", wifi: "4" },
} as const;

/** Platform of a capture; one device per platform and run. */
export type Platform = "ios" | "android";
/** System appearance; set on the device before launch. */
export type Appearance = "light" | "dark";

/** One platform and appearance. Every state is captured in each. */
export interface Variant {
  platform: Platform;
  appearance: Appearance;
}

/** All variants, in site order. `bun sitemap check` requires every one. */
export const VARIANTS: Variant[] = [
  { platform: "ios", appearance: "light" },
  { platform: "ios", appearance: "dark" },
  { platform: "android", appearance: "light" },
  { platform: "android", appearance: "dark" },
];

/** `ios-light`, `android-dark`, ... Key of a variant in sitemap.json. */
export const variantId = (variant: Variant) =>
  `${variant.platform}-${variant.appearance}`;

/** Device settings of one variant; part of its input hash. */
export const profileOf = (variant: Variant) => ({
  ...(variant.platform === "ios" ? DEVICE_PROFILE : ANDROID_PROFILE),
  appearance: variant.appearance,
});

/** Seconds from launch to screenshot. Longer and a clock minute can roll over. */
export const CLOCK_BUDGET_SECONDS = 50;

/** Bundle-time env of the capture build, on top of the eas.json preview profile. */
export const CAPTURE_ENV = { EXPO_PUBLIC_SITEMAP_CAPTURE: "1" } as const;

/** Site images: screenshot pixels divided by this. */
export const SITE_IMAGE_SCALE = 3;
