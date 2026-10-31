import { useEffect, useRef } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { ObserveErrorBoundaryFallbackProps } from "expo-observe";
import { ThemeProvider } from "expo-router";
import Button from "@/components/button";
import { exportRawStorage } from "@/features/datagate";
import useColors from "@/hooks/use-colors";
import { createStructuredError } from "@/lib/errors";
import { reportBoundaryError, reportError } from "@/lib/report-error";
import { t } from "@/lib/translation";
import { getNavigationTheme } from "@/shell/navigation-theme";
import { getSupportMailUrl } from "@/shell/support-mail";

const RENDER_FAILED = "render_failed";

const toRenderError = (error: ObserveErrorBoundaryFallbackProps["error"]) => {
  const failure = createStructuredError({
    status: RENDER_FAILED,
    message: "A screen could not be rendered",
    why:
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : `Non-Error thrown: ${String(error)}`,
    fix: "Tap Try Again. If it keeps happening, restart Pixy and contact support",
  });
  // Keep the thrower's stack, so Sentry points at the broken component.
  if (error instanceof Error && error.stack) {
    failure.stack = error.stack;
  }
  return failure;
};

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

const contactSupport = async () => {
  try {
    await Linking.openURL(
      getSupportMailUrl("Pixy: a screen could not be shown", RENDER_FAILED)
    );
  } catch {
    Alert.alert(t("storage_load_error_contact"), "care@pixy.day");
  }
};

const AppErrorContent = ({
  error,
  resetError,
}: ObserveErrorBoundaryFallbackProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reportedError =
    useRef<ObserveErrorBoundaryFallbackProps["error"]>(null);

  useEffect(() => {
    // One report per caught error, also under Strict Mode double effects.
    if (reportedError.current === error) {
      return;
    }
    reportedError.current = error;
    const failure = toRenderError(error);
    console.error(failure);
    reportBoundaryError(failure);
  }, [error]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      testID="app-error"
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
          {t("app_error_title")}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: 17,
            lineHeight: 24,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          {t("storage_load_error_body")}
        </Text>
        <Button onPress={resetError} testID="app-error-retry">
          {t("app_error_retry")}
        </Button>
        <Button
          type="secondary"
          onPress={() => {
            void exportData();
          }}
          style={{ marginTop: 12 }}
          testID="app-error-export"
        >
          {t("storage_load_error_export")}
        </Button>
        <Button
          type="tertiary"
          onPress={() => {
            void contactSupport();
          }}
          style={{ marginTop: 12 }}
          testID="app-error-contact"
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
        >
          {t("storage_load_error_code", { status: RENDER_FAILED })}
        </Text>
      </ScrollView>
    </View>
  );
};

/**
 * Root error boundary fallback. Renders outside every app provider, so it
 * brings its own theme and safe area, and uses no stores. Entries stay on
 * disk; Try Again remounts the app from a clean state.
 */
export const AppErrorScreen = (props: ObserveErrorBoundaryFallbackProps) => {
  const scheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={getNavigationTheme(scheme)}>
        <AppErrorContent {...props} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
};
