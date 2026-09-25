import type {
  DevelopmentSupportMode,
  SupportClient,
  SupportFlowError,
} from "./index";
import { createStructuredError } from "@/lib/errors";

export const disabledSupportClient: SupportClient = {
  enabled: false,
  openSupport: () => Promise.resolve(),
};

export interface FakeSupportClient extends SupportClient {
  readonly attempts: number;
}

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

export const resolveDevelopmentSupportClient = ({
  isDevelopment,
  mode,
}: {
  isDevelopment: boolean;
  mode?: string;
}): SupportClient | undefined => {
  if (isDevelopment && (mode === "available" || mode === "failed")) {
    return createFakeSupportClient(mode);
  }

  return undefined;
};
