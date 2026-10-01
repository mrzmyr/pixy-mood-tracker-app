import { FieldGroup, Host, Icon, RNHostView, Text } from "@expo/ui";
import { NavigationStack } from "@expo/ui/swift-ui";
import { navigationTitle } from "@expo/ui/swift-ui/modifiers";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as StoreReview from "expo-store-review";
import * as WebBrowser from "expo-web-browser";
import {
  Platform,
  Text as RNText,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SupportCard } from "@/components/SupportCard";
import { APP_VARIANT, HAS_APP_VARIANT } from "@/constants/AppVariant";
import { CHANGELOG_URL, FEEDBACK_FEATURES_URL } from "@/constants/Config";
import { DEV_TOOLS } from "@/dev";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import { useFeedbackModal } from "@/features/feedback";
import pkg from "../../../../../package.json";
import { useSupport } from "@/support";
import { SettingsRow } from "./SettingsRow";

const ICONS = {
  data: Icon.select({
    ios: "cylinder.split.1x2",
    android: import("@expo/material-symbols/database.xml"),
  }),
  reminder: Icon.select({
    ios: "bell",
    android: import("@expo/material-symbols/notifications.xml"),
  }),
  colors: Icon.select({
    ios: "drop",
    android: import("@expo/material-symbols/water_drop.xml"),
  }),
  tags: Icon.select({
    ios: "tag",
    android: import("@expo/material-symbols/sell.xml"),
  }),
  steps: Icon.select({
    ios: "checkmark.circle",
    android: import("@expo/material-symbols/check_circle.xml"),
  }),
  feedback: Icon.select({
    ios: "flag",
    android: import("@expo/material-symbols/flag.xml"),
  }),
  voteFeatures: Icon.select({
    ios: "arrow.up.circle",
    android: import("@expo/material-symbols/arrow_circle_up.xml"),
  }),
  changelog: Icon.select({
    ios: "book",
    android: import("@expo/material-symbols/menu_book.xml"),
  }),
  rate: Icon.select({
    ios: "star",
    android: import("@expo/material-symbols/star.xml"),
  }),
  privacy: Icon.select({
    ios: "hand.raised",
    android: import("@expo/material-symbols/shield.xml"),
  }),
  onboarding: Icon.select({
    ios: "iphone",
    android: import("@expo/material-symbols/mobile.xml"),
  }),
  nerdStatistics: Icon.select({
    ios: "chart.pie",
    android: import("@expo/material-symbols/pie_chart.xml"),
  }),
  testData: Icon.select({
    ios: "cylinder.split.1x2",
    android: import("@expo/material-symbols/dataset.xml"),
  }),
  openSource: Icon.select({
    ios: "chevron.left.forwardslash.chevron.right",
    android: import("@expo/material-symbols/code.xml"),
  }),
  licenses: Icon.select({
    ios: "rosette",
    android: import("@expo/material-symbols/license.xml"),
  }),
};

/**
 * Settings tab: native grouped list from `@expo/ui` `FieldGroup`.
 *
 * iOS renders a SwiftUI `Form` in a `NavigationStack` for the system large
 * title. Android renders a Material 3 list with the title as the first
 * section header. The support card shows only when a support client is
 * enabled.
 */
export const SettingsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const colors = useColors();
  const analytics = useAnalytics();
  const support = useSupport();

  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();

  const askToRateApp = () => {
    analytics.track("settings:rate_app_tapped");

    const storeUrl = StoreReview.storeUrl();
    if (storeUrl !== null) {
      Linking.openURL(storeUrl);
    }
  };

  const isIOS = Platform.OS === "ios";

  const list = (
    <FieldGroup
      modifiers={isIOS ? [navigationTitle(t("settings"))] : undefined}
    >
      <FieldGroup.Section>
        {!isIOS && (
          <FieldGroup.SectionHeader>
            <Text
              textStyle={{
                fontSize: 32,
                fontWeight: "bold",
                color: colors.text,
              }}
            >
              {t("settings")}
            </Text>
          </FieldGroup.SectionHeader>
        )}
        <SettingsRow
          title={t("data")}
          icon={ICONS.data}
          onPress={() => router.push("/settings/data")}
          testID="data"
          isLink
        />
        <SettingsRow
          title={t("reminder")}
          icon={ICONS.reminder}
          onPress={() => router.push("/settings/reminder")}
          testID="reminder"
          isLink
        />
        <SettingsRow
          title={t("colors")}
          icon={ICONS.colors}
          onPress={() => router.push("/settings/colors")}
          isLink
        />
        <SettingsRow
          title={t("tags")}
          icon={ICONS.tags}
          onPress={() => router.push("/settings/tags")}
          isLink
        />
        <SettingsRow
          title={t("steps")}
          icon={ICONS.steps}
          onPress={() => router.push("/settings/steps")}
          isLink
        />
      </FieldGroup.Section>

      <FieldGroup.Section title={t("settings_feedback")}>
        <SettingsRow
          title={t("send_feedback")}
          icon={ICONS.feedback}
          onPress={() => showFeedbackModal({ type: "issue" })}
          testID="send_feedback"
        />
        <FieldGroup.SectionFooter>
          <Text>{t("feedback_help")}</Text>
        </FieldGroup.SectionFooter>
      </FieldGroup.Section>

      <FieldGroup.Section title={t("settings_about")}>
        <SettingsRow
          title={t("vote_features")}
          icon={ICONS.voteFeatures}
          onPress={async () => {
            analytics.track("settings:vote_features_tapped");
            await WebBrowser.openBrowserAsync(FEEDBACK_FEATURES_URL);
          }}
          testID="vote_features"
        />
        <SettingsRow
          title={t("changelog")}
          icon={ICONS.changelog}
          onPress={async () => {
            analytics.track("settings:changelog_tapped");
            await WebBrowser.openBrowserAsync(CHANGELOG_URL);
          }}
          testID="changelog"
        />
        <SettingsRow
          title={t("rate_this_app")}
          icon={ICONS.rate}
          onPress={() => askToRateApp()}
        />
        <SettingsRow
          title={t("privacy")}
          icon={ICONS.privacy}
          onPress={() => router.push("/settings/privacy")}
          isLink
        />
      </FieldGroup.Section>

      <FieldGroup.Section title={t("settings_development")}>
        <SettingsRow
          title={t("onboarding")}
          icon={ICONS.onboarding}
          onPress={() => router.push("/onboarding")}
        />
        <SettingsRow
          title={t("settings_development_statistics")}
          icon={ICONS.nerdStatistics}
          onPress={() => router.push("/settings/development-tools")}
          isLink
        />
        {DEV_TOOLS && (
          <SettingsRow
            title="Test data"
            icon={ICONS.testData}
            onPress={() => router.push("/dev/fixtures")}
            testID="dev-fixtures"
            isLink
          />
        )}
        <SettingsRow
          title={t("app_is_open_source")}
          icon={ICONS.openSource}
          onPress={() => {
            Linking.openURL("https://github.com/mrzmyr/pixy-mood-tracker-app");
          }}
        />
        <SettingsRow
          title={t("licenses")}
          icon={ICONS.licenses}
          onPress={() => router.push("/settings/licenses")}
          isLink
        />
        <FieldGroup.SectionFooter>
          <RNHostView matchContents>
            {/* Form footers have no width for RN content; pin it to the list width. */}
            <View style={{ width: width - 40 }}>
              {support.enabled && <SupportCard />}
              <View
                testID="settings-version"
                style={{
                  marginTop: 20,
                  alignItems: "center",
                  marginBottom: 40,
                }}
              >
                <RNText style={{ fontSize: 14, color: colors.textSecondary }}>
                  Pixy v{pkg.version}
                </RNText>
                {HAS_APP_VARIANT && (
                  <RNText
                    style={{
                      fontSize: 14,
                      marginTop: 5,
                      color: colors.textSecondary,
                    }}
                  >
                    {APP_VARIANT}
                  </RNText>
                )}
              </View>
            </View>
          </RNHostView>
        </FieldGroup.SectionFooter>
      </FieldGroup.Section>
    </FieldGroup>
  );

  return (
    <View
      style={{
        flex: 1,
        paddingTop: isIOS ? 0 : insets.top,
        backgroundColor: colors.background,
      }}
    >
      <FeedbackModal />
      <Host style={{ flex: 1 }}>
        {isIOS ? <NavigationStack>{list}</NavigationStack> : list}
      </Host>
    </View>
  );
};
