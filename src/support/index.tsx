import { createContext, useContext } from 'react';

export type SupportOutcome = 'purchased' | 'cancelled';
export type FakeSupportOutcome = SupportOutcome | 'failed';
export type SupportFlowStatus =
  | 'support_flow_failed'
  | 'support_fake_failed'
  | 'support_unavailable';

export interface SupportFlowError {
  status: SupportFlowStatus;
  message: string;
  why: string;
  fix: string;
}

export interface SupportClient {
  enabled: boolean;
  openSupport: () => Promise<SupportOutcome>;
}

export const disabledSupportClient: SupportClient = {
  enabled: false,
  openSupport: async () => 'cancelled',
};

export interface FakeSupportClient extends SupportClient {
  readonly attempts: number;
}

export const createFakeSupportClient = (
  outcome: FakeSupportOutcome,
  ...nextOutcomes: FakeSupportOutcome[]
): FakeSupportClient => {
  const outcomes = [outcome, ...nextOutcomes];
  let attempts = 0;

  return {
    enabled: true,
    get attempts() {
      return attempts;
    },
    openSupport: async () => {
      const currentOutcome = outcomes[Math.min(attempts, outcomes.length - 1)];
      attempts += 1;

      if (currentOutcome === 'failed') {
        const error: SupportFlowError = {
          status: 'support_fake_failed',
          message: 'Support unavailable',
          why: 'Development fake provider was configured to fail.',
          fix: 'Try again. Pixy remains fully usable.',
        };

        throw error;
      }

      return currentOutcome;
    },
  };
};

export const resolveSupportClient = ({
  isDevelopment,
  fakeOutcome,
}: {
  isDevelopment: boolean;
  fakeOutcome?: string;
}): SupportClient => {
  const validFakeOutcomes: FakeSupportOutcome[] = [
    'purchased',
    'cancelled',
    'failed',
  ];

  if (
    isDevelopment
    && validFakeOutcomes.includes(fakeOutcome as FakeSupportOutcome)
  ) {
    return createFakeSupportClient(fakeOutcome as FakeSupportOutcome);
  }

  return disabledSupportClient;
};

export const defaultSupportClient = resolveSupportClient({
  isDevelopment: __DEV__,
  fakeOutcome: process.env.EXPO_PUBLIC_PIXY_SUPPORT_FAKE_OUTCOME,
});

const SupportContext = createContext<SupportClient>(disabledSupportClient);

export function SupportProvider({
  children,
  client = disabledSupportClient,
}: {
  children: React.ReactNode;
  client?: SupportClient;
}) {
  return (
    <SupportContext.Provider value={client}>
      {children}
    </SupportContext.Provider>
  );
}

export const useSupport = () => useContext(SupportContext);
