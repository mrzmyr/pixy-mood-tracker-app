import { createContext, useContext } from "react";
import { createStructuredError } from "@/lib/errors";

export type DevelopmentSupportMode = "available" | "failed";
export type SupportFlowStatus =
  | "support_configuration_failed"
  | "support_consumption_failed"
  | "support_consumption_token_missing"
  | "support_fake_failed"
  | "support_flow_failed"
  | "support_placement_failed";

export interface SupportFlowError {
  status: SupportFlowStatus;
  message: string;
  why: string;
  fix: string;
}

export interface SupportClient {
  enabled: boolean;
  openSupport: () => Promise<void>;
}

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

const SupportContext = createContext<SupportClient>(disabledSupportClient);

export function SupportProvider({
  children,
  client = disabledSupportClient,
}: {
  children: React.ReactNode;
  client?: SupportClient;
}) {
  return (
    <SupportContext.Provider value={client}>{children}</SupportContext.Provider>
  );
}

export const useSupport = () => useContext(SupportContext);
