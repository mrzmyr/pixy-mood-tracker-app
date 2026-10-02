import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as StoreReview from "expo-store-review";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, Text, View } from "react-native";
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
import useColors from "@/hooks/useColors";
import { useFeedbackModal } from "@/features/feedback";
import pkg from "../../../../../package.json";
import { Tag } from "lucide-react-native";
import { useSupport } from "@/support";

/**
 * Settings screen, opened from the calendar header. The support card shows only when a support client is enabled.
 */
export const SettingsScreen = () => {
  const router = useRouter();
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

  return (
    <View
      style={{
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
            title={t("send_feedback")}
            onPress={() => showFeedbackModal({ type: "issue" })}
            iconLeft={<Flag width={18} color={colors.menuListItemIcon} />}
            testID="send_feedback"
            isLast
          />
        </MenuList>
        <TextInfo>{t("feedback_help")}</TextInfo>

        <MenuListHeadline>{t("settings_about")}</MenuListHeadline>
        <MenuList style={{}}>
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
            title={t("changelog")}
            onPress={async () => {
              analytics.track("settings:changelog_tapped");
              await WebBrowser.openBrowserAsync(CHANGELOG_URL);
            }}
            iconLeft={<BookOpen width={18} color={colors.menuListItemIcon} />}
            testID="changelog"
          />
          <MenuListItem
            title={t("rate_this_app")}
            onPress={() => askToRateApp()}
            iconLeft={<Star width={18} color={colors.menuListItemIcon} />}
          />
          <MenuListItem
            title={t("privacy")}
            onPress={() => router.push("/settings/privacy")}
            iconLeft={<Shield width={18} color={colors.menuListItemIcon} />}
            isLink
          />
        </MenuList>

        <MenuListHeadline>{t("settings_development")}</MenuListHeadline>
        <MenuList style={{}}>
          <MenuListItem
            title={`${t("onboarding")}`}
            iconLeft={<Smartphone width={18} color={colors.menuListItemIcon} />}
            onPress={() => router.push("/onboarding")}
          />
          <MenuListItem
            title={`${t("settings_development_statistics")}`}
            iconLeft={<PieChart width={18} color={colors.menuListItemIcon} />}
            onPress={() => router.push("/settings/development-tools")}
            isLink
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
          <MenuListItem
            title={t("app_is_open_source")}
            onPress={() => {
              Linking.openURL(
                "https://github.com/mrzmyr/pixy-mood-tracker-app"
              );
            }}
            iconLeft={<Github width={18} color={colors.menuListItemIcon} />}
          />
          <MenuListItem
            title={t("licenses")}
            iconLeft={<Award width={18} color={colors.menuListItemIcon} />}
            onPress={() => router.push("/settings/licenses")}
            isLink
            isLast
          />
        </MenuList>
        {support.enabled && <SupportCard />}
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
