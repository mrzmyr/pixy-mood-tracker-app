import type {
  DevelopmentSupportMode,
  SupportClient,
  SupportFlowError,
} from "./index";
import { createStructuredError } from "@/lib/errors";

/**
 * Client used when no support provider is configured (web, missing API key).
 * `openSupport` resolves without doing anything.
 */
export const disabledSupportClient: SupportClient = {
  enabled: false,
  openSupport: () => Promise.resolve(),
};

/**
 * Scripted client for development and tests; `attempts` counts
 * `openSupport` calls.
 */
export interface FakeSupportClient extends SupportClient {
  readonly attempts: number;
}

/**
 * Create a scripted client that plays `mode`, then each of `nextModes`, one
 * per `openSupport` call, repeating the last mode afterwards.
 *
 * `"failed"` rejects with a `support_fake_failed` {@link SupportFlowError}.
 */
export const createFakeSupportClient = (
  mode: DevelopmentSupportMode = "available",
  ...nextModes: DevelopmentSupportMode[]
): FakeSupportClient => {
  const modes = [mode, ...nextModes];
  let attempts = 0;

  return {
    enabled: true,
    get attempts() {
      return attempts;
    },
    openSupport: () => {
      const currentMode = modes[Math.min(attempts, modes.length - 1)];
      attempts += 1;

      if (currentMode === "failed") {
        const error: SupportFlowError = createStructuredError({
          status: "support_fake_failed",
          message: "Support unavailable",
          why: "Development fake provider was configured to fail.",
          fix: "Try again. Pixy remains fully usable.",
        });

        return Promise.reject(error);
      }

      return Promise.resolve();
    },
  };
};

/**
 * Pick the fake client from `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE`.
 *
 * Builds with service mocks always get a fake client (`available` unless the
 * mode is `failed`), so they never reach Superwall. Otherwise returns
 * `undefined` outside development or for unknown modes, so the configured
 * provider is used instead.
 */
export const resolveDevelopmentSupportClient = ({
  isDevelopment,
  isServiceMocks = false,
  mode,
}: {
  isDevelopment: boolean;
  isServiceMocks?: boolean;
  mode?: string;
}): SupportClient | undefined => {
  if (isServiceMocks) {
    return createFakeSupportClient(mode === "failed" ? "failed" : "available");
  }

  if (isDevelopment && (mode === "available" || mode === "failed")) {
    return createFakeSupportClient(mode);
  }

  return undefined;
};
