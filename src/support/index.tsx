import { createContext, useContext } from "react";
import { disabledSupportClient } from "./clients";

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

const SupportContext = createContext<SupportClient>(disabledSupportClient);

export const SupportProvider = ({
  children,
  client = disabledSupportClient,
}: {
  children: React.ReactNode;
  client?: SupportClient;
}) => (
  <SupportContext.Provider value={client}>{children}</SupportContext.Provider>
);

export const useSupport = () => useContext(SupportContext);
