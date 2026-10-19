import * as Device from "expo-device";
import { Observe } from "expo-observe";
import type { ObserveConfig } from "expo-observe";

import { APP_VARIANT, HAS_APP_VARIANT } from "@/constants/app-variant";
import type { AppVariant } from "@/constants/app-variant";

/** Facts fixed per build and device. */
interface ObserveBuild {
  /** `false` in Jest or when `EXPO_PUBLIC_APP_VARIANT` is missing. */
  hasVariant: boolean;
  variant: AppVariant;
  /** `false` on simulators and emulators, where E2E and local builds run. */
  isDevice: boolean;
}

/** Options the app derives at runtime. Everything else is fixed per build. */
interface ObserveOptions {
  /** Stored analytics consent. `false` until stored settings load. */
  consent: boolean;
}

const currentBuild: ObserveBuild = {
  hasVariant: HAS_APP_VARIANT,
  variant: APP_VARIANT,
  isDevice: Device.isDevice,
};

/**
 * Only real devices on shipped variants report. Simulator, emulator, E2E, and
 * development runs would otherwise skew startup numbers.
 */
const canDispatch = ({ hasVariant, variant, isDevice }: ObserveBuild) =>
  hasVariant && variant !== "development" && isDevice;

/**
 * Route params that point at one user's data: entry dates and log, tag, and
 * person ids. Observe drops them and hides the URL; `routeName` keeps the
 * pattern, for example `/logs/[id]`.
 */
const FILTERED_ROUTE_PARAMS = ["date", "dateTime", "id"];

/** Full Observe config. Every field is set, so no call resets another. */
export const observeConfig = (
  { consent }: ObserveOptions,
  build: ObserveBuild = currentBuild
): Required<
  Pick<ObserveConfig, "dispatchingEnabled" | "environment" | "integrations">
> => ({
  dispatchingEnabled: consent && canDispatch(build),
  // Default is NODE_ENV, which reads `production` for preview builds too.
  environment: build.variant,
  // Must stay the same on every call: Observe throws when the router
  // integration toggles after the app mounted.
  integrations: {
    "expo-router": { filteredParams: FILTERED_ROUTE_PARAMS },
  },
});

/**
 * Only caller of `Observe.configure`. Each native call replaces the whole
 * config: a field left out resets to its default. So every call sends every
 * field, and callers pass only what changes at runtime.
 */
export const configureObserve = (options: ObserveOptions) => {
  Observe.configure(observeConfig(options));
};
