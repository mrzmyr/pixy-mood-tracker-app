import * as WebBrowser from "expo-web-browser";
import { ScrollView, Switch, View } from "react-native";
import { Shield } from "react-native-feather";
import LinkButton from "@/components/LinkButton";
import { MarkdownBody } from "@/components/MarkdownBody";
import useColors from "@/hooks/useColors";
import { useAnalytics } from "@/state/analytics";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/featureFlags";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";

/**
 * Settings > Privacy: privacy summary, link to the full policy, and the
 * analytics opt-in switch. The people section shows only behind the
 * `people` feature flag.
 */
export const PrivacyScreen = () => {
  const colors = useColors();
  const analytics = useAnalytics();
  const hasPeople = useFeatureFlag("people");
  const isBackupOn = useFeatureFlag("backup");
  const content = hasPeople
    ? `${t("privacy_content")}\n\n${t("privacy_people_content")}`
    : t("privacy_content");

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
        style={{
          padding: 16,
        }}
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
                <Switch
                  ios_backgroundColor={colors.backgroundSecondary}
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
          {isBackupOn && (
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
