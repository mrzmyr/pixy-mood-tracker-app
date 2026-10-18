import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import Button from "@/components/Button";
import { Section } from "@/components/Type";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";

/**
 * Unknown paths, for example stale widget or notification links. Tracks a
 * fixed screen name, never the path.
 */
const NotFound = () => {
  const router = useRouter();
  const colors = useColors();
  const analytics = useAnalytics();

  useEffect(() => {
    if (analytics.isEnabled) {
      analytics.screen("NotFound");
    }
  }, [analytics]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        backgroundColor: colors.background,
      }}
    >
      <Section accessibilityRole="header">{t("not_found_title")}</Section>
      <Button
        testID="not-found-open-calendar"
        onPress={() => router.replace("/calendar")}
      >
        {t("not_found_open_calendar")}
      </Button>
    </View>
  );
};

export default NotFound;
