import dayjs from "dayjs";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as StoreReview from "expo-store-review";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import CircleArrowUp from "lucide-react-native/icons/circle-arrow-up";
import Award from "lucide-react-native/icons/award";
import Bell from "lucide-react-native/icons/bell";
import BookOpen from "lucide-react-native/icons/book-open";
import CircleCheckBig from "lucide-react-native/icons/circle-check-big";
import Database from "lucide-react-native/icons/database";
import Droplet from "lucide-react-native/icons/droplet";
import Flag from "lucide-react-native/icons/flag";
import GithubIcon from "@/components/GithubIcon";
import Layers from "lucide-react-native/icons/layers";
import PanelsTopLeft from "lucide-react-native/icons/panels-top-left";
import ChartPie from "lucide-react-native/icons/chart-pie";
import Shield from "lucide-react-native/icons/shield";
import Smartphone from "lucide-react-native/icons/smartphone";
import Star from "lucide-react-native/icons/star";
import FlagHighlight from "@/components/FlagHighlight";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import { SupportCard } from "@/components/SupportCard";
import TextInfo from "@/components/TextInfo";
import { APP_VARIANT, HAS_APP_VARIANT } from "@/constants/AppVariant";
import {
  CHANGELOG_URL,
  DATE_FORMAT,
  FEEDBACK_FEATURES_URL,
} from "@/constants/Config";
import { DEV_TOOLS } from "@/dev";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import {
  useCanOverrideFeatureFlags,
  useFeatureFlag,
} from "@/state/featureFlags";
import { useSettings } from "@/state/settings";
import { COLOR_SCHEMES } from "@/state/settings/colorScheme";
import useColors from "@/hooks/useColors";
import { useIsWidgetEnabled } from "@/features/widget";
import { AppLockMenuItem } from "@/features/applock";
import { ProfileRow } from "@/features/profile";
import pkg from "../../../../../package.json";
import Bug from "lucide-react-native/icons/bug";
import Lightbulb from "lucide-react-native/icons/lightbulb";
import Squircle from "lucide-react-native/icons/squircle";
import SunMoon from "lucide-react-native/icons/sun-moon";
import { useSupport } from "@/support";

const DEVELOPMENT_UNLOCK_TAPS = 20;

/**
 * Settings screen, opened from the calendar header. With the `profile` flag,
 * the user's name and photo row comes first. The support card needs its
 * feature flag and an enabled client.
 * The App Lock row needs the `app-lock` flag, or the lock being on.
 * The Development section shows in development and preview builds, with the
 * `development` or `feature-flag-overrides` feature flag, or after 20 taps on
 * the version in this session.
 */
export const SettingsScreen = () => {
  const router = useRouter();
  const colors = useColors();
  const iconProps = { width: 20, height: 20, color: colors.menuListItemIcon };
  const analytics = useAnalytics();
  const isWidgetEnabled = useIsWidgetEnabled();
  const isRecapsEnabled = useFeatureFlag("recaps");
  const isProfileEnabled = useFeatureFlag("profile");
  const support = useSupport();
  const isSupportEnabled = useFeatureFlag("support-pixy");
  const isDevelopmentFlagOn = useFeatureFlag("development");
  const canOverrideFeatureFlags = useCanOverrideFeatureFlags();
  const [versionTaps, setVersionTaps] = useState(0);
  const isDevelopmentVisible =
    DEV_TOOLS !== null ||
    isDevelopmentFlagOn ||
    canOverrideFeatureFlags ||
    versionTaps >= DEVELOPMENT_UNLOCK_TAPS;
  const { settings, setSettings } = useSettings();
  const { colorScheme } = settings;

  /** Cycles System, Light, Dark. */
  const cycleColorScheme = () => {
    const next =
      COLOR_SCHEMES[
        (COLOR_SCHEMES.indexOf(colorScheme) + 1) % COLOR_SCHEMES.length
      ];
    setSettings((current) => ({ ...current, colorScheme: next }));
    analytics.track("settings:theme_changed", { color_scheme: next });
  };

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
        {isProfileEnabled && (
          <View style={{ marginBottom: 24 }}>
            <FlagHighlight flag="profile">
              <ProfileRow />
            </FlagHighlight>
          </View>
        )}
        <MenuList>
          <MenuListItem
            title={t("data")}
            iconLeft={<Database {...iconProps} />}
            onPress={() => router.push("/settings/data")}
            testID="data"
            isLink
          />
          <MenuListItem
            title={t("reminder")}
            iconLeft={<Bell {...iconProps} />}
            onPress={() => router.push("/settings/reminder")}
            testID="reminder"
            isLink
          />
          <MenuListItem
            title={t("steps")}
            iconLeft={<CircleCheckBig {...iconProps} />}
            onPress={() => router.push("/settings/steps")}
            isLink
          />
          <AppLockMenuItem />
          {isRecapsEnabled && (
            <FlagHighlight flag="recaps">
              <MenuListItem
                title={t("recaps")}
                iconLeft={<Layers {...iconProps} />}
                onPress={() =>
                  router.push(`/recaps/week/${dayjs().format(DATE_FORMAT)}`)
                }
                testID="recaps"
                isLink
              />
            </FlagHighlight>
          )}
          {isWidgetEnabled && (
            <FlagHighlight flag="ios-widget">
              <MenuListItem
                title={t("widget")}
                iconLeft={<PanelsTopLeft {...iconProps} />}
                onPress={() => router.push("/widget")}
                testID="widget"
                isLink
              />
            </FlagHighlight>
          )}
        </MenuList>

        <MenuListHeadline>{t("settings_appearance")}</MenuListHeadline>
        <MenuList>
          <MenuListItem
            title={t("theme")}
            iconLeft={<SunMoon {...iconProps} />}
            iconRight={
              <Text style={{ fontSize: 17, color: colors.textSecondary }}>
                {t(`theme_${colorScheme}`)}
              </Text>
            }
            accessibilityValue={{ text: t(`theme_${colorScheme}`) }}
            onPress={cycleColorScheme}
            testID="theme"
          />
          <MenuListItem
            title={t("app_icon")}
            iconLeft={<Squircle {...iconProps} />}
            onPress={() => router.push("/settings/app-icon")}
            testID="app-icon"
            isLink
          />
          <MenuListItem
            title={t("colors")}
            iconLeft={<Droplet {...iconProps} />}
            onPress={() => router.push("/settings/colors")}
            isLink
          />
        </MenuList>

        <MenuListHeadline>{t("settings_feedback")}</MenuListHeadline>
        <MenuList style={{}}>
          <MenuListItem
            title={t("request_a_feature")}
            onPress={() =>
              router.push({ pathname: "/feedback", params: { type: "idea" } })
            }
            iconLeft={<Lightbulb {...iconProps} />}
            testID="request_a_feature"
          />
          <MenuListItem
            title={t("vote_features")}
            onPress={async () => {
              analytics.track("settings:vote_features_tapped");
              await WebBrowser.openBrowserAsync(FEEDBACK_FEATURES_URL);
            }}
            iconLeft={<CircleArrowUp {...iconProps} />}
            testID="vote_features"
          />
          <MenuListItem
            title={t("report_a_bug")}
            onPress={() =>
              router.push({ pathname: "/feedback", params: { type: "issue" } })
            }
            iconLeft={<Bug {...iconProps} />}
            testID="report_a_bug"
          />
          <MenuListItem
            title={t(
              Platform.OS === "ios"
                ? "rate_pixy_app_store"
                : "rate_pixy_google_play"
            )}
            onPress={() => askToRateApp()}
            iconLeft={<Star {...iconProps} />}
            testID="rate_pixy"
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
            iconLeft={<BookOpen {...iconProps} />}
            testID="changelog"
          />
          <MenuListItem
            title={t("privacy")}
            onPress={() => router.push("/settings/privacy")}
            iconLeft={<Shield {...iconProps} />}
            isLink
          />
          <MenuListItem
            title={t("licenses")}
            iconLeft={<Award {...iconProps} />}
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
            iconLeft={<GithubIcon {...iconProps} />}
          />
        </MenuList>

        {isDevelopmentVisible && (
          <>
            <MenuListHeadline>{t("settings_development")}</MenuListHeadline>
            <MenuList style={{}}>
              <MenuListItem
                title={t("onboarding")}
                iconLeft={<Smartphone {...iconProps} />}
                onPress={() => router.push("/onboarding")}
              />
              {DEV_TOOLS && (
                <MenuListItem
                  title="Test data"
                  iconLeft={<Database {...iconProps} />}
                  onPress={() => router.push("/dev/fixtures")}
                  isLink
                  testID="dev-fixtures"
                />
              )}
              {canOverrideFeatureFlags && (
                <MenuListItem
                  title="Feature flags"
                  iconLeft={<Flag {...iconProps} />}
                  onPress={() => router.push("/settings/feature-flags")}
                  isLink
                  testID="dev-feature-flags"
                />
              )}
              <MenuListItem
                title={t("settings_development_statistics")}
                iconLeft={<ChartPie {...iconProps} />}
                onPress={() => router.push("/settings/development-tools")}
                isLink
              />
            </MenuList>
          </>
        )}
        {isSupportEnabled && support.enabled && (
          <FlagHighlight flag="support-pixy">
            <SupportCard />
          </FlagHighlight>
        )}
        <Pressable
          testID="settings-version"
          accessible={false}
          onPress={() => setVersionTaps((taps) => taps + 1)}
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
        </Pressable>
      </ScrollView>
    </View>
  );
};
