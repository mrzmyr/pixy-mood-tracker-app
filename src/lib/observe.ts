import { Observe } from "expo-observe";
import type { ObserveConfig } from "expo-observe";

import { canReportTelemetry, currentBuild } from "@/lib/telemetry";
import type { TelemetryBuild } from "@/lib/telemetry";

/** Options the app derives at runtime. Everything else is fixed per build. */
interface ObserveOptions {
  /** Stored analytics consent. `false` until stored settings load. */
  consent: boolean;
}

/**
 * Route params that point at one user's data: entry dates and log, tag, and
 * person ids. Observe drops them and hides the URL; `routeName` keeps the
 * pattern, for example `/logs/[id]`.
 */
const FILTERED_ROUTE_PARAMS = ["date", "dateTime", "id"];

/** Full Observe config. Every field is set, so no call resets another. */
export const observeConfig = (
  { consent }: ObserveOptions,
  build: TelemetryBuild = currentBuild
): Required<
  Pick<ObserveConfig, "dispatchingEnabled" | "environment" | "integrations">
> => ({
  dispatchingEnabled: consent && canReportTelemetry(build),
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

/**
 * Every Observe log event and its attributes. Fixed values and numbers only:
 * never notes, tag names, people names, or other free text.
 */
export interface ObserveEvents {
  /** Gated stores finished loading at startup. */
  "storage.load": {
    outcome: "ready" | "error";
    /** From JS bundle evaluation to the settled load. */
    duration_ms: number;
    /** `StructuredError` status when `outcome` is `error`. */
    error_status?: string | number;
  };
}

/**
 * Only caller of `Observe.logEvent`. Typed names and attributes keep free
 * text out, like `track` does for PostHog. Dispatch follows consent through
 * `configureObserve`.
 */
export const logObserveEvent = <Name extends keyof ObserveEvents>(
  name: Name,
  attributes: ObserveEvents[Name],
  severity: "info" | "warn" | "error" = "info"
) => {
  Observe.logEvent(name, { attributes: { ...attributes }, severity });
};
