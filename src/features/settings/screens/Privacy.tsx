import * as WebBrowser from "expo-web-browser";
import { ScrollView, Switch, View } from "react-native";
import { Shield } from "react-native-feather";
import LinkButton from "@/components/LinkButton";
import { MarkdownBody } from "@/components/MarkdownBody";
import useColors from "@/hooks/useColors";
import { useAnalytics } from "@/state/analytics";
import { t } from "@/lib/translation";
import { PageWithHeaderLayout } from "@/components/PageWithHeaderLayout";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";

/**
 * Settings > Privacy: privacy summary, link to the full policy, and the
 * analytics opt-in switch.
 */
export const PrivacyScreen = () => {
  const colors = useColors();
  const analytics = useAnalytics();

  const _handlePressButtonAsync = async () => {
    await WebBrowser.openBrowserAsync("https://pixy.day/privacy", {
      readerMode: true,
    });
    analytics.track("settings:privacy_policy_opened");
  };

  return (
    <PageWithHeaderLayout
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
          <MarkdownBody>{t("privacy_content")}</MarkdownBody>

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
              isLast
            />
          </MenuList>
          <TextInfo>{t("behavioral_data_help")}</TextInfo>

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
    </PageWithHeaderLayout>
  );
};
