import { disabledSupportClient } from "./clients";
import { SupportProvider } from "./index";

export const ConfiguredSupportProvider = ({
  children,
  apiKeys: _apiKeys,
}: {
  children: React.ReactNode;
  apiKeys?: { android?: string; ios?: string };
}) => (
  <SupportProvider client={disabledSupportClient}>{children}</SupportProvider>
);
