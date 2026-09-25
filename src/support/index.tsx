import { createContext, useContext } from "react";
import { disabledSupportClient } from "./clients";

/** Fake support outcomes selectable in development builds. */
export type DevelopmentSupportMode = "available" | "failed";
/**
 * Stable status codes for support flow errors; tests and logs match on
 * them, so do not rename existing values.
 */
export type SupportFlowStatus =
  | "support_configuration_failed"
  | "support_consumption_failed"
  | "support_consumption_token_missing"
  | "support_fake_failed"
  | "support_flow_failed"
  | "support_placement_failed";

/** Structured support error following the project's evlog error shape. */
export interface SupportFlowError {
  status: SupportFlowStatus;
  message: string;
  why: string;
  fix: string;
}

/** Voluntary support (tip) purchase flow behind the Settings support entry. */
export interface SupportClient {
  /** False when support purchases are unavailable on this build or device. */
  enabled: boolean;
  /**
   * Present the support paywall.
   *
   * @returns Rejects with a {@link SupportFlowError} when the flow cannot open.
   */
  openSupport: () => Promise<void>;
}

const SupportContext = createContext<SupportClient>(disabledSupportClient);

/**
 * Provide the support client. Without a provider, consumers get the
 * disabled client.
 */
export const SupportProvider = ({
  children,
  client = disabledSupportClient,
}: {
  children: React.ReactNode;
  client?: SupportClient;
}) => (
  <SupportContext.Provider value={client}>{children}</SupportContext.Provider>
);

/**
 * Current support client; the support UI must hide itself when `enabled` is
 * `false`.
 */
export const useSupport = () => useContext(SupportContext);
