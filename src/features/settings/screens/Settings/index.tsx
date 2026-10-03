import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as StoreReview from "expo-store-review";
import * as WebBrowser from "expo-web-browser";
import { Platform, ScrollView, Text, View } from "react-native";
import {
  ArrowUpCircle,
  Award,
  Bell,
  BookOpen,
  CheckCircle,
  Database,
  Droplet,
  Flag,
  Github,
  PieChart,
  Shield,
  Smartphone,
  Star,
} from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import { SupportCard } from "@/components/SupportCard";
import TextInfo from "@/components/TextInfo";
import { APP_VARIANT, HAS_APP_VARIANT } from "@/constants/AppVariant";
import { CHANGELOG_URL, FEEDBACK_FEATURES_URL } from "@/constants/Config";
import { DEV_TOOLS } from "@/dev";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";
import useColors from "@/hooks/useColors";
import { useFeedbackModal } from "@/features/feedback";
import pkg from "../../../../../package.json";
import { Bug, LayoutGrid, Lightbulb, Tag } from "lucide-react-native";
import { useSupport } from "@/support";

/**
 * Settings tab. The support card needs its feature flag and an enabled client.
 */
export const SettingsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const analytics = useAnalytics();
  const support = useSupport();
  const isSupportEnabled = useFeatureFlag("support-pixy");

  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();

  const askToRateApp = () => {
    analytics.track("settings:rate_app_tapped");

    const storeUrl = StoreReview.storeUrl();
    if (storeUrl !== null) {
      Linking.openURL(storeUrl);
    }
  };

  return (
    <View
      style={{
        paddingTop: insets.top,
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        style={{
          padding: 20,
        }}
      >
        <FeedbackModal />
        <Text
          style={{
            fontSize: 32,
            color: colors.text,
            fontWeight: "bold",
            marginTop: 32,
            marginBottom: 18,
          }}
        >
          {t("settings")}
        </Text>
        <MenuList>
          <MenuListItem
            title={t("data")}
            iconLeft={<Database width={18} color={colors.menuListItemIcon} />}
            onPress={() => router.push("/settings/data")}
            testID="data"
            isLink
          />
          <MenuListItem
            title={t("reminder")}
            iconLeft={<Bell width={18} color={colors.menuListItemIcon} />}
            onPress={() => router.push("/settings/reminder")}
            testID="reminder"
            isLink
          />
          <MenuListItem
            title={t("colors")}
            iconLeft={<Droplet width={18} color={colors.menuListItemIcon} />}
            onPress={() => router.push("/settings/colors")}
            isLink
          />
          <MenuListItem
            title={t("app_icon")}
            iconLeft={<LayoutGrid size={18} color={colors.menuListItemIcon} />}
            onPress={() => router.push("/settings/app-icon")}
            testID="app-icon"
            isLink
          />
          <MenuListItem
            title={t("tags")}
            iconLeft={<Tag width={18} color={colors.menuListItemIcon} />}
            onPress={() => router.push("/settings/tags")}
            isLink
          />
          <MenuListItem
            title={t("steps")}
            iconLeft={
              <CheckCircle width={18} color={colors.menuListItemIcon} />
            }
            onPress={() => router.push("/settings/steps")}
            isLink
            isLast
          />
        </MenuList>

        <MenuListHeadline>{t("settings_feedback")}</MenuListHeadline>
        <MenuList style={{}}>
          <MenuListItem
            title={t("request_a_feature")}
            onPress={() => showFeedbackModal({ type: "idea" })}
            iconLeft={<Lightbulb width={18} color={colors.menuListItemIcon} />}
            testID="request_a_feature"
          />
          <MenuListItem
            title={t("vote_features")}
            onPress={async () => {
              analytics.track("settings:vote_features_tapped");
              await WebBrowser.openBrowserAsync(FEEDBACK_FEATURES_URL);
            }}
            iconLeft={
              <ArrowUpCircle width={18} color={colors.menuListItemIcon} />
            }
            testID="vote_features"
          />
          <MenuListItem
            title={t("report_a_bug")}
            onPress={() => showFeedbackModal({ type: "issue" })}
            iconLeft={<Bug width={18} color={colors.menuListItemIcon} />}
            testID="report_a_bug"
          />
          <MenuListItem
            title={t(
              Platform.OS === "ios"
                ? "rate_pixy_app_store"
                : "rate_pixy_google_play"
            )}
            onPress={() => askToRateApp()}
            iconLeft={<Star width={18} color={colors.menuListItemIcon} />}
            testID="rate_pixy"
            isLast
          />
        </MenuList>
        <TextInfo>{t("feedback_help")}</TextInfo>

        <MenuListHeadline>{t("settings_about")}</MenuListHeadline>
        <MenuList style={{}}>
          <MenuListItem
            title={t("changelog")}
            onPress={async () => {
              analytics.track("settings:changelog_tapped");
              await WebBrowser.openBrowserAsync(CHANGELOG_URL);
            }}
            iconLeft={<BookOpen width={18} color={colors.menuListItemIcon} />}
            testID="changelog"
          />
          <MenuListItem
            title={t("privacy")}
            onPress={() => router.push("/settings/privacy")}
            iconLeft={<Shield width={18} color={colors.menuListItemIcon} />}
            isLink
          />
          <MenuListItem
            title={t("licenses")}
            iconLeft={<Award width={18} color={colors.menuListItemIcon} />}
            onPress={() => router.push("/settings/licenses")}
            isLink
          />
          <MenuListItem
            title={t("app_is_open_source")}
            onPress={() => {
              Linking.openURL(
                "https://github.com/mrzmyr/pixy-mood-tracker-app"
              );
            }}
            iconLeft={<Github width={18} color={colors.menuListItemIcon} />}
            isLast
          />
        </MenuList>

        <MenuListHeadline>{t("settings_development")}</MenuListHeadline>
        <MenuList style={{}}>
          <MenuListItem
            title={t("onboarding")}
            iconLeft={<Smartphone width={18} color={colors.menuListItemIcon} />}
            onPress={() => router.push("/onboarding")}
          />
          {DEV_TOOLS && (
            <MenuListItem
              title="Test data"
              iconLeft={<Database width={18} color={colors.menuListItemIcon} />}
              onPress={() => router.push("/dev/fixtures")}
              isLink
              testID="dev-fixtures"
            />
          )}
          {DEV_TOOLS && (
            <MenuListItem
              title="Feature flags"
              iconLeft={<Flag width={18} color={colors.menuListItemIcon} />}
              onPress={() => router.push("/dev/feature-flags")}
              isLink
              testID="dev-feature-flags"
            />
          )}
          <MenuListItem
            title={t("settings_development_statistics")}
            iconLeft={<PieChart width={18} color={colors.menuListItemIcon} />}
            onPress={() => router.push("/settings/development-tools")}
            isLink
            isLast
          />
        </MenuList>
        {isSupportEnabled && support.enabled && <SupportCard />}
        <View
          testID="settings-version"
          style={{
            marginTop: 20,
            flex: 1,
            justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <Text
            style={{ fontSize: 14, marginTop: 5, color: colors.textSecondary }}
          >
            Pixy v{pkg.version}
          </Text>
          {HAS_APP_VARIANT && (
            <Text
              style={{
                fontSize: 14,
                marginTop: 5,
                color: colors.textSecondary,
              }}
            >
              {APP_VARIANT}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};
