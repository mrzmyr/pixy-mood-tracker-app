import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { AlertCircle } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import useFeedbackModal from "@/features/feedback/hooks/useFeedbackModal";
import { useLogLoad } from "@/features/logs";
import { useTagsLoad } from "@/features/tags";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import type { StructuredError } from "@/lib/errors";
import { useSettingsLoad } from "@/state/settings";

const StorageLoadErrorScreen = ({
  error,
  isRetrying,
  onRetry,
}: {
  error: StructuredError | null;
  isRetrying: boolean;
  onRetry: () => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { Modal: FeedbackModal, show: showFeedbackModal } = useFeedbackModal();

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
          onPress={onRetry}
          disabled={isRetrying}
          testID="storage-load-error-retry"
        >
          {t("storage_load_error_retry")}
        </Button>
        <Button
          type="secondary"
          onPress={() => showFeedbackModal({ type: "issue" })}
          style={{ marginTop: 12 }}
          testID="storage-load-error-contact"
        >
          {t("storage_load_error_contact")}
        </Button>
        {error ? (
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
        ) : null}
      </ScrollView>
      <FeedbackModal />
    </View>
  );
};

/**
 * Renders a blocking error screen instead of the app while stored logs,
 * tags, or settings could not be read.
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
  const settingsLoad = useSettingsLoad();
  const logLoad = useLogLoad();
  const tagsLoad = useTagsLoad();
  const loads = [settingsLoad, logLoad, tagsLoad];

  // After "Try again", keep the error screen up until every store is ready,
  // so the app never flashes with half-loaded data.
  const [hasRetried, setHasRetried] = useState(false);
  const [lastError, setLastError] = useState<StructuredError | null>(null);

  const failedLoad = loads.find((load) => load.status === "error");
  const isLoading = loads.some((load) => load.status === "loading");
  const isRetrying = hasRetried && !failedLoad && isLoading;

  if (!failedLoad && !isRetrying) {
    return children;
  }

  const retry = () => {
    setHasRetried(true);
    setLastError(failedLoad?.error ?? null);
    for (const load of loads) {
      if (load.status === "error") {
        load.retry();
      }
    }
  };

  return (
    <StorageLoadErrorScreen
      error={failedLoad?.error ?? lastError}
      isRetrying={isRetrying}
      onRetry={retry}
    />
  );
};
