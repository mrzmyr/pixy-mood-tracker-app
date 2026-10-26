import { createStructuredError } from "@/lib/errors";
import { reportError } from "@/lib/report-error";
import { useEffect, useEffectEvent, useState } from "react";
import { Alert, Linking, ScrollView, Text, View } from "react-native";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/button";
import { exportRawStorage, useAppData } from "@/features/datagate";
import { FeedbackModal } from "@/features/feedback";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import type { StructuredError } from "@/lib/errors";
import { useAnalytics } from "@/state/analytics";
import { getSupportMailUrl } from "@/shell/support-mail";

const exportData = async () => {
  try {
    await exportRawStorage();
  } catch (error) {
    reportError(
      createStructuredError({
        status: "raw_storage_export_failed",
        message: "Stored data could not be exported",
        why: `exportRawStorage failed: ${error instanceof Error ? error.message : String(error)}`,
        fix: "Check free device storage, then tap Export data again",
      })
    );
    Alert.alert(t("export_failed_title"));
  }
};

const StorageLoadErrorScreen = ({ error }: { error: StructuredError }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
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
      await Linking.openURL(
        getSupportMailUrl("Pixy: stored data could not be loaded", error.status)
      );
    } catch {
      // No mail app: fall back to the feedback form. This screen replaces
      // the router stack, so it shows the form as a modal, not the route.
      setIsFeedbackVisible(true);
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
          <CircleAlert color={colors.text} width={48} height={48} />
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
      <FeedbackModal
        visible={isFeedbackVisible}
        type="issue"
        onClose={() => setIsFeedbackVisible(false)}
      />
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
