import { Observe } from "expo-observe";
import type { ObserveConfig } from "expo-observe";

/** Options the app derives at runtime. Everything else is fixed per build. */
interface ObserveOptions {
  /** Stored analytics consent. `false` until stored settings load. */
  consent: boolean;
}

/** Full Observe config. Every field is set, so no call resets another. */
export const observeConfig = ({
  consent,
}: ObserveOptions): Required<Pick<ObserveConfig, "dispatchingEnabled">> => ({
  dispatchingEnabled: consent,
});

/**
 * Only caller of `Observe.configure`. Each native call replaces the whole
 * config: a field left out resets to its default. So every call sends every
 * field, and callers pass only what changes at runtime.
 */
export const configureObserve = (options: ObserveOptions) => {
  Observe.configure(observeConfig(options));
};
