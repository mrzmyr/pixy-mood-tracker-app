import * as WebBrowser from "expo-web-browser";
import { ScrollView, View } from "react-native";
import Toggle from "@/components/toggle";
import Shield from "lucide-react-native/icons/shield";
import Markdown from "react-native-markdown-display";
import LinkButton from "@/components/link-button";
import useColors from "@/hooks/use-colors";
import { useScrollBottomPadding } from "@/hooks/use-scroll-bottom-padding";
import { useAnalytics } from "@/state/analytics";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";
import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import TextInfo from "@/components/text-info";
import { getTextStyle } from "@/components/typography";

/**
 * Settings > Privacy: privacy summary, link to the full policy, and the
 * analytics opt-in switch. The people section shows only behind the
 * `people` feature flag.
 */
export const PrivacyScreen = () => {
  const colors = useColors();
  const analytics = useAnalytics();
  const hasPeople = useFeatureFlag("people");
  const paddingBottom = useScrollBottomPadding(16);
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
          <Markdown
            style={{
              body: { ...getTextStyle("copy", 16), color: colors.text },
              heading3: {
                ...getTextStyle("heading", 20),
                fontWeight: "bold",
                lineHeight: 28,
                marginBottom: 0,
                marginTop: 20,
              },
              list_item: { marginTop: 5, marginLeft: -5 },
              bullet_list: { marginBottom: 10 },
              hr: {
                backgroundColor: colors.text,
                marginTop: 20,
                marginBottom: 20,
                opacity: 0.2,
              },
              em: { color: colors.text, opacity: 0.5, fontStyle: "normal" },
            }}
          >
            {content}
          </Markdown>

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
          <TextInfo style={{ marginTop: 8 }}>
            {t("behavioral_data_help")}
          </TextInfo>

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
