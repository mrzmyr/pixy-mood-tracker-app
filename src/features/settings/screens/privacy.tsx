import * as WebBrowser from "expo-web-browser";
import { ScrollView, View } from "react-native";
import Toggle from "@/components/toggle";
import Shield from "lucide-react-native/icons/shield";
import LinkButton from "@/components/link-button";
import { MarkdownBody } from "@/components/markdown-body";
import useColors from "@/hooks/use-colors";
import { useScrollBottomPadding } from "@/hooks/use-scroll-bottom-padding";
import { useBackupProviders } from "@/features/backup";
import { useAnalytics } from "@/state/analytics";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";
import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import TextInfo from "@/components/text-info";

/**
 * Settings > Privacy: privacy summary, link to the full policy, and the
 * analytics opt-in switch. The people section shows only behind the
 * `people` feature flag, the backup section only while a backup flag of
 * this platform is on.
 */
export const PrivacyScreen = () => {
  const colors = useColors();
  const analytics = useAnalytics();
  const hasPeople = useFeatureFlag("people");
  const paddingBottom = useScrollBottomPadding(16);
  const hasBackup = useBackupProviders().length > 0;
  const content = [
    t("privacy_content"),
    hasPeople ? t("privacy_people_content") : null,
    hasBackup ? t("privacy_backup_content") : null,
  ]
    .filter((part) => part !== null)
    .join("\n\n");

  const _handlePressButtonAsync = async () => {
    await WebBrowser.openBrowserAsync("https://pixy.day/privacy", {
      readerMode: true,
    });
    analytics.track("settings:privacy_policy_opened");
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom }}
      >
        <View
          style={{
            paddingBottom: 80,
          }}
        >
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              padding: 16,
            }}
          >
            <Shield color={colors.text} width={80} height={30} />
          </View>
          <MarkdownBody>{content}</MarkdownBody>

          <MenuList
            style={{
              marginTop: 16,
            }}
          >
            <MenuListItem
              title={t("behavioral_data")}
              iconRight={
                <Toggle
                  accessibilityLabel={t("behavioral_data")}
                  onValueChange={() => {
                    analytics.track("settings:analytics_toggled", {
                      enabled: !analytics.isEnabled,
                    });
                    if (analytics.isEnabled) {
                      analytics.disable();
                    } else {
                      analytics.enable();
                    }
                  }}
                  value={analytics.isEnabled}
                  testID="behavioral-data-enabled"
                />
              }
            />
          </MenuList>
          <TextInfo>{t("behavioral_data_help")}</TextInfo>
          {hasBackup && (
            <TextInfo>{t("backup_needs_behavioral_data")}</TextInfo>
          )}

          <LinkButton
            style={{
              marginTop: 16,
            }}
            onPress={_handlePressButtonAsync}
          >
            {t("privacy_policy")}
          </LinkButton>
        </View>
      </ScrollView>
    </View>
  );
};
