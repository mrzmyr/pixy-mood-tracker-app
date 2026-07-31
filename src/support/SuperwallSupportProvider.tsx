import { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import {
  SuperwallExpoModule,
  SuperwallProvider,
  usePlacement,
  useSuperwall,
  useSuperwallEvents,
} from 'expo-superwall';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  disabledSupportClient,
  SupportClient,
  SupportFlowError,
  SupportProvider,
} from './index';

export const SUPPORT_PLACEMENT = 'support_pixy';
export const SUPPORT_PRODUCT_IDS = [
  'support_pixy_1',
  'support_pixy_2',
  'support_pixy_5',
  'support_pixy_20',
] as const;

const logSupportError = (error: SupportFlowError) => {
  console.error(error);
};

const SuperwallConsumableEvents = () => {
  useSuperwallEvents({
    onSuperwallEvent: ({ event }) => {
      if (
        Platform.OS !== 'android'
        || event.event !== 'transactionComplete'
        || !SUPPORT_PRODUCT_IDS.includes(
          event.product.productIdentifier as typeof SUPPORT_PRODUCT_IDS[number],
        )
      ) {
        return;
      }

      const purchaseToken = event.transaction?.purchaseToken;
      if (!purchaseToken) {
        logSupportError({
          status: 'support_consumption_token_missing',
          message: 'Support purchase could not be finalized',
          why: 'Google Play did not provide a purchase token for the completed contribution.',
          fix: 'Keep Pixy open and contact support before trying the same amount again.',
        });
        return;
      }

      void SuperwallExpoModule.consume(purchaseToken).catch(() => {
        logSupportError({
          status: 'support_consumption_failed',
          message: 'Support purchase could not be finalized',
          why: 'Google Play could not consume the completed contribution.',
          fix: 'Try a different contribution amount or contact support.',
        });
      });
    },
  });

  return null;
};

const SuperwallSupportBridge = ({ children }: { children: React.ReactNode }) => {
  const analytics = useAnalytics();
  const isConfigured = useSuperwall((state) => state.isConfigured);
  const setEventTrackingBehavior = useSuperwall(
    (state) => state.setEventTrackingBehavior,
  );
  const placementErrorRef = useRef<string | null>(null);
  const { registerPlacement } = usePlacement({
    onError: (error) => {
      placementErrorRef.current = error;
    },
  });

  useEffect(() => {
    if (!isConfigured) return;

    void setEventTrackingBehavior(
      analytics.isEnabled ? 'superwallOnly' : 'none',
    ).catch(() => {
      logSupportError({
        status: 'support_configuration_failed',
        message: 'Support privacy setting could not be applied',
        why: 'Superwall rejected the requested event-tracking behavior.',
        fix: 'Support stays available; restart Pixy before contributing.',
      });
    });
  }, [analytics.isEnabled, isConfigured, setEventTrackingBehavior]);

  const client = useMemo<SupportClient>(() => ({
    enabled: isConfigured,
    openSupport: async () => {
      placementErrorRef.current = null;

      try {
        await registerPlacement({ placement: SUPPORT_PLACEMENT });
      } catch {
        throw {
          status: 'support_placement_failed',
          message: 'Support could not open',
          why: 'Superwall could not register the support placement.',
          fix: 'Check your connection and try again.',
        } satisfies SupportFlowError;
      }

      if (placementErrorRef.current !== null) {
        throw {
          status: 'support_placement_failed',
          message: 'Support could not open',
          why: 'Superwall could not present the support paywall.',
          fix: 'Check your connection and try again.',
        } satisfies SupportFlowError;
      }
    },
  }), [isConfigured, registerPlacement]);

  return (
    <SupportProvider client={client}>
      <SuperwallConsumableEvents />
      {children}
    </SupportProvider>
  );
};

export function ConfiguredSupportProvider({
  children,
  apiKeys: configuredApiKeys,
}: {
  children: React.ReactNode;
  apiKeys?: { android?: string; ios?: string };
}) {
  const analytics = useAnalytics();
  const apiKeys = configuredApiKeys ?? {
    android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY,
    ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY,
  };
  const platformApiKey = Platform.select({
    android: apiKeys.android,
    default: apiKeys.ios ?? apiKeys.android,
    ios: apiKeys.ios,
  });

  if (!platformApiKey) {
    return (
      <SupportProvider client={disabledSupportClient}>
        {children}
      </SupportProvider>
    );
  }

  return (
    <SuperwallProvider
      apiKeys={apiKeys}
      options={{
        eventTrackingBehavior: analytics.isEnabled ? 'superwallOnly' : 'none',
        paywalls: {
          automaticallyDismiss: true,
          shouldShowPurchaseFailureAlert: true,
        },
        shouldObservePurchases: false,
        testModeBehavior: __DEV__ ? 'automatic' : 'never',
      }}
      onConfigurationError={() => {
        logSupportError({
          status: 'support_configuration_failed',
          message: 'Support could not start',
          why: 'Superwall configuration failed for this platform.',
          fix: 'Restart Pixy and try again later.',
        });
      }}
    >
      <SuperwallSupportBridge>{children}</SuperwallSupportBridge>
    </SuperwallProvider>
  );
}
