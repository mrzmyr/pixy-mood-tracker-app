import { disabledSupportClient, SupportProvider } from './index';

export function DisabledSupportProvider({
  children,
  apiKeys: _apiKeys,
}: {
  children: React.ReactNode;
  apiKeys?: { android?: string; ios?: string };
}) {
  return (
    <SupportProvider client={disabledSupportClient}>
      {children}
    </SupportProvider>
  );
}
