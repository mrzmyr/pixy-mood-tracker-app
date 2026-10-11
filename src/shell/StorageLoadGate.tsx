import * as Sentry from "@sentry/react-native";
import { useEffect, useEffectEvent } from "react";
import { Alert, Linking, Platform, ScrollView, Text, View } from "react-native";
import { AlertCircle } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import { exportRawStorage, useAppData } from "@/features/datagate";
import { useFeedbackModal } from "@/features/feedback";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import type { StructuredError } from "@/lib/errors";
import { useAnalytics } from "@/state/analytics";
import pkg from "../../package.json";

const SUPPORT_EMAIL = "care@pixy.day";

const exportData = async () => {
  try {
    await exportRawStorage();
  } catch (error) {
    Sentry.captureException(error);
    Alert.alert(t("export_failed_title"));
  }
};

// Holds the error code only: `why` can quote stored user data.
const getSupportMailUrl = (error: StructuredError) => {
  const subject = "Pixy: stored data could not be loaded";
  const body = `\n\nError code: ${error.status}\nApp version: ${pkg.version}\nPlatform: ${Platform.OS}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const StorageLoadErrorScreen = ({ error }: { error: StructuredError }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { Modal: FeedbackModal, show: showFeedbackModal } = useFeedbackModal();
  const analytics = useAnalytics();

  // Effect event: reads the latest analytics without re-running the effect.
  // Settings can load after this screen, so track once analytics is on.
  const trackLoadFailed = useEffectEvent(() => {
    analytics.track("app:storage_load_failed", { status: error.status });
  });

  useEffect(() => {
    if (analytics.isEnabled) {
      trackLoadFailed();
    }
  }, [analytics.isEnabled]);

  const contactSupport = async () => {
    analytics.track("app:storage_recovery_tapped", { action: "contact" });
    try {
      await Linking.openURL(getSupportMailUrl(error));
    } catch {
      // No mail app: fall back to the feedback form.
      showFeedbackModal({ type: "issue" });
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      testID="storage-load-error"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <AlertCircle color={colors.text} width={48} height={48} />
        </View>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: 22,
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          {t("storage_load_error_title")}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: 17,
            lineHeight: 24,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          {t("storage_load_error_body")}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            lineHeight: 22,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          {t("storage_load_error_advice")}
        </Text>
        <Button
          onPress={() => {
            analytics.track("app:storage_recovery_tapped", {
              action: "export",
            });
            void exportData();
          }}
          testID="storage-load-error-export"
        >
          {t("storage_load_error_export")}
        </Button>
        <Button
          type="secondary"
          onPress={contactSupport}
          style={{ marginTop: 12 }}
          testID="storage-load-error-contact"
        >
          {t("storage_load_error_contact")}
        </Button>
        <Text
          selectable
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            textAlign: "center",
            marginTop: 24,
          }}
          testID="storage-load-error-status"
        >
          {t("storage_load_error_code", { status: error.status })}
        </Text>
      </ScrollView>
      <FeedbackModal />
    </View>
  );
};

/**
 * Renders a blocking error screen instead of the app while any gated store
 * in `PERSISTED_STORES` could not be read.
 *
 * Stores never persist after a failed read, so the stored data stays intact.
 * Blocking the app keeps users from resetting or importing over data they
 * believe is gone. While loading, the app renders as before.
 */
export const StorageLoadGate = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { load } = useAppData();

  return load.status === "error" ? (
    <StorageLoadErrorScreen error={load.error} />
  ) : (
    children
  );
};
