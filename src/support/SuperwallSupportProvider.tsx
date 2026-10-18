import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  SuperwallExpoModule,
  SuperwallProvider,
  usePlacement,
  useSuperwall,
  useSuperwallEvents,
} from "expo-superwall";
import { useAnalytics } from "@/state/analytics";
import { createStructuredError } from "@/lib/errors";
import { SupportProvider } from "@/support";
import type { SupportClient, SupportFlowError } from "@/support";
import { disabledSupportClient } from "@/support/clients";

/**
 * Superwall placement that shows the support paywall. It must match the
 * placement configured in the Superwall dashboard.
 */
export const SUPPORT_PLACEMENT = "support_pixy";
const SUPPORT_PRODUCT_IDS = [
  "support_pixy_1",
  "support_pixy_2",
  "support_pixy_5",
  "support_pixy_20",
] as const;

const logSupportError = (error: SupportFlowError) => {
  console.error(error);
};

const SuperwallConsumableEvents = () => {
  useSuperwallEvents({
    onSuperwallEvent: ({ event }) => {
      if (
        Platform.OS !== "android" ||
        event.event !== "transactionComplete" ||
        !SUPPORT_PRODUCT_IDS.some(
          (productId) => productId === event.product.productIdentifier
        )
      ) {
        return;
      }

      const purchaseToken = event.transaction?.purchaseToken;
      if (!purchaseToken) {
        logSupportError({
          status: "support_consumption_token_missing",
          message: "Support purchase could not be finalized",
          why: "Google Play did not provide a purchase token for the completed contribution.",
          fix: "Keep Pixy open and contact support before trying the same amount again.",
        });
        return;
      }

      void (async () => {
        try {
          await SuperwallExpoModule.consume(purchaseToken);
        } catch {
          logSupportError({
            status: "support_consumption_failed",
            message: "Support purchase could not be finalized",
            why: "Google Play could not consume the completed contribution.",
            fix: "Try a different contribution amount or contact support.",
          });
        }
      })();
    },
  });

  return null;
};

/**
 * Delay before Superwall configures on its own. Keeps its network fetch and
 * native SDK init out of the startup window; Settings can start it sooner
 * through {@link SupportClient.prepare}.
 */
export const SUPERWALL_CONFIGURE_DELAY_MS = 3000;

const SuperwallSupportBridge = ({
  onClientChange,
}: {
  onClientChange: (client: SupportClient) => void;
}) => {
  const analytics = useAnalytics();
  const isConfigured = useSuperwall((state) => state.isConfigured);
  const setEventTrackingBehavior = useSuperwall(
    (state) => state.setEventTrackingBehavior
  );
  const placementErrorRef = useRef<string | null>(null);
  const { registerPlacement } = usePlacement({
    onError: (error) => {
      placementErrorRef.current = error;
    },
  });

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    void (async () => {
      try {
        await setEventTrackingBehavior(
          analytics.isEnabled ? "superwallOnly" : "none"
        );
      } catch {
        logSupportError({
          status: "support_configuration_failed",
          message: "Support privacy setting could not be applied",
          why: "Superwall rejected the requested event-tracking behavior.",
          fix: "Support stays available; restart Pixy before contributing.",
        });
      }
    })();
  }, [analytics.isEnabled, isConfigured, setEventTrackingBehavior]);

  const client = useMemo<SupportClient>(
    () => ({
      enabled: isConfigured,
      openSupport: async () => {
        placementErrorRef.current = null;

        try {
          await registerPlacement({ placement: SUPPORT_PLACEMENT });
        } catch {
          throw createStructuredError({
            status: "support_placement_failed",
            message: "Support could not open",
            why: "Superwall could not register the support placement.",
            fix: "Check your connection and try again.",
          }) satisfies SupportFlowError;
        }

        if (placementErrorRef.current !== null) {
          throw createStructuredError({
            status: "support_placement_failed",
            message: "Support could not open",
            why: "Superwall could not present the support paywall.",
            fix: "Check your connection and try again.",
          }) satisfies SupportFlowError;
        }
      },
    }),
    [isConfigured, registerPlacement]
  );

  useEffect(() => {
    // oxlint-disable-next-line react-doctor/no-pass-data-to-parent -- the client comes from hooks that only work under SuperwallProvider, which mounts beside children so they never remount
    onClientChange(client);
  }, [client, onClientChange]);

  return <SuperwallConsumableEvents />;
};

/**
 * Superwall-backed support provider for iOS and Android.
 *
 * Falls back to the disabled client when no API key exists for the
 * platform. Must render inside the analytics provider: Superwall event
 * tracking is off unless the user enabled analytics. On Android, completed
 * support purchases are consumed so the same amount can be bought again.
 *
 * Superwall configures {@link SUPERWALL_CONFIGURE_DELAY_MS} after mount, or
 * as soon as a consumer calls `prepare`. Until then the client is disabled.
 * `children` stay mounted at the same position throughout; Superwall mounts
 * as a sibling that publishes its client.
 */
export const ConfiguredSupportProvider = ({
  children,
  apiKeys: configuredApiKeys,
}: {
  children: React.ReactNode;
  apiKeys?: { android?: string; ios?: string };
}) => {
  const analytics = useAnalytics();
  const [isRequested, setIsRequested] = useState(false);
  const [superwallClient, setSuperwallClient] = useState<SupportClient>(
    disabledSupportClient
  );
  const apiKeys = configuredApiKeys ?? {
    android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY,
    ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY,
  };
  const platformApiKey = Platform.select({
    android: apiKeys.android,
    default: apiKeys.ios ?? apiKeys.android,
    ios: apiKeys.ios,
  });
  const hasApiKey = Boolean(platformApiKey);

  useEffect(() => {
    if (!hasApiKey) {
      return;
    }

    const timer = setTimeout(
      () => setIsRequested(true),
      SUPERWALL_CONFIGURE_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [hasApiKey]);

  const prepare = useCallback(() => setIsRequested(true), []);
  const client = useMemo<SupportClient>(
    () => ({ ...superwallClient, prepare }),
    [prepare, superwallClient]
  );

  if (!hasApiKey) {
    return (
      <SupportProvider client={disabledSupportClient}>
        {children}
      </SupportProvider>
    );
  }

  return (
    <SupportProvider client={client}>
      {isRequested && (
        <SuperwallProvider
          apiKeys={apiKeys}
          options={{
            eventTrackingBehavior: analytics.isEnabled
              ? "superwallOnly"
              : "none",
            paywalls: {
              automaticallyDismiss: true,
              shouldShowPurchaseFailureAlert: true,
            },
            shouldObservePurchases: false,
            testModeBehavior: __DEV__ ? "automatic" : "never",
          }}
          onConfigurationError={() => {
            logSupportError({
              status: "support_configuration_failed",
              message: "Support could not start",
              why: "Superwall configuration failed for this platform.",
              fix: "Restart Pixy and try again later.",
            });
          }}
        >
          <SuperwallSupportBridge onClientChange={setSuperwallClient} />
        </SuperwallProvider>
      )}
      {children}
    </SupportProvider>
  );
};
