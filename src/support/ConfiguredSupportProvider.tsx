import { disabledSupportClient } from "./clients";
import { SupportProvider } from "./index";

/**
 * Web fallback: support purchases are unavailable, so it always provides
 * the disabled client. Native builds resolve
 * `ConfiguredSupportProvider.native.tsx` instead.
 */
export const ConfiguredSupportProvider = ({
  children,
  apiKeys: _apiKeys,
}: {
  children: React.ReactNode;
  apiKeys?: { android?: string; ios?: string };
}) => (
  <SupportProvider client={disabledSupportClient}>{children}</SupportProvider>
);
