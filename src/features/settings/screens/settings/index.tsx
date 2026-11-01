import dayjs from "dayjs";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as StoreReview from "expo-store-review";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { FieldGroup, Host, RNHostView, Text as ExpoText } from "@expo/ui";
import {
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import FlagHighlight from "@/components/flag-highlight";
import FieldRow from "@/components/field-row";
import { ScrollEdge } from "@/components/scroll-edge";
import { SupportCard } from "@/components/support-card";
import { APP_VARIANT, HAS_APP_VARIANT } from "@/constants/app-variant";
import { MATERIAL_SEED_COLOR } from "@/constants/colors";
import {
  CHANGELOG_URL,
  DATE_FORMAT,
  FEEDBACK_FEATURES_URL,
} from "@/constants/config";
import { DEV_TOOLS } from "@/dev";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import {
  useCanOverrideFeatureFlags,
  useFeatureFlag,
} from "@/state/feature-flags";
import { useSettings } from "@/state/settings";
import { COLOR_SCHEMES } from "@/state/settings/color-scheme";
import useColors from "@/hooks/use-colors";
import useFormBackground from "@/hooks/use-form-background";
import {
  AppLockMenuItem,
  useIsAppLockMenuItemVisible,
} from "@/features/applock";
import { ProfileRow } from "@/features/profile";
import pkg from "../../../../../package.json";
import { useSupport } from "@/support";
import { SETTINGS_ICONS } from "./icons";

const DEVELOPMENT_UNLOCK_TAPS = 20;

/** Horizontal space a native section header or footer leaves on each side. */
const SECTION_INSET = Platform.select({ ios: 20, android: 32, default: 16 });

/**
 * Settings screen, opened from the calendar header. The user's name and photo
 * row comes first. The support card needs its feature flag and an enabled
 * client.
 * The App Lock row needs the `app-lock` flag, or the lock being on.
 * The Development section shows in development and preview builds, with the
 * `development` or `feature-flag-overrides` feature flag, or after 20 taps on
 * the version in this session.
 */
export const SettingsScreen = () => {
  const router = useRouter();
  const colors = useColors();
  const formBackground = useFormBackground();
  const { width: windowWidth } = useWindowDimensions();
  const analytics = useAnalytics();
  const isAppLockVisible = useIsAppLockMenuItemVisible();
  const isRecapsEnabled = useFeatureFlag("recaps");
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

  const footer = (
    <FieldGroup.SectionFooter>
      <RNHostView matchContents>
        <View style={{ width: windowWidth - 2 * SECTION_INSET }}>
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
              alignItems: "center",
              gap: 5,
              paddingTop: 5,
              marginBottom: 40,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              Pixy v{pkg.version}
            </Text>
            {HAS_APP_VARIANT && (
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                }}
              >
                {APP_VARIANT}
              </Text>
            )}
          </Pressable>
        </View>
      </RNHostView>
    </FieldGroup.SectionFooter>
  );

  return (
    <ScrollEdge style={{ flex: 1, backgroundColor: formBackground }}>
      <Host
        style={{ flex: 1 }}
        // Web derives its accent scale from the seed: keep the web tint.
        seedColor={
          Platform.OS === "android" ? MATERIAL_SEED_COLOR : colors.tint
        }
      >
        <FieldGroup
          style={
            Platform.OS === "web"
              ? { backgroundColor: colors.background }
              : undefined
          }
        >
          <FieldGroup.Section>
            <ProfileRow />
          </FieldGroup.Section>
          <FieldGroup.Section>
            <FieldRow
              title={t("data")}
              icon={SETTINGS_ICONS.data}
              kind="push"
              onPress={() => router.push("/settings/data")}
              testID="data"
            />
            <FieldRow
              title={t("reminders")}
              icon={SETTINGS_ICONS.reminder}
              kind="push"
              onPress={() => router.push("/settings/reminder")}
              testID="reminder"
            />
            <FieldRow
              title={t("steps")}
              icon={SETTINGS_ICONS.steps}
              kind="push"
              onPress={() => router.push("/settings/steps")}
            />
            {isAppLockVisible && <AppLockMenuItem />}
            {isRecapsEnabled && (
              <FieldRow
                title={t("recaps")}
                icon={SETTINGS_ICONS.recaps}
                kind="push"
                onPress={() =>
                  router.push(`/recaps/week/${dayjs().format(DATE_FORMAT)}`)
                }
                testID="recaps"
              />
            )}
          </FieldGroup.Section>

          <FieldGroup.Section title={t("settings_appearance")}>
            <FieldRow
              title={t("theme")}
              icon={SETTINGS_ICONS.theme}
              kind="action"
              value={t(`theme_${colorScheme}`)}
              onPress={cycleColorScheme}
              testID="theme"
            />
            <FieldRow
              title={t("app_icon")}
              icon={SETTINGS_ICONS.appIcon}
              kind="push"
              onPress={() => router.push("/settings/app-icon")}
              testID="app-icon"
            />
            <FieldRow
              title={t("colors")}
              icon={SETTINGS_ICONS.colors}
              kind="push"
              onPress={() => router.push("/settings/colors")}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title={t("settings_feedback")}>
            <FieldRow
              title={t("request_a_feature")}
              icon={SETTINGS_ICONS.requestFeature}
              kind="action"
              onPress={() =>
                router.push({ pathname: "/feedback", params: { type: "idea" } })
              }
              testID="request_a_feature"
            />
            <FieldRow
              title={t("vote_features")}
              icon={SETTINGS_ICONS.voteFeatures}
              kind="external"
              onPress={async () => {
                analytics.track("settings:vote_features_tapped");
                await WebBrowser.openBrowserAsync(FEEDBACK_FEATURES_URL);
              }}
              testID="vote_features"
            />
            <FieldRow
              title={t("report_a_bug")}
              icon={SETTINGS_ICONS.reportBug}
              kind="action"
              onPress={() =>
                router.push({
                  pathname: "/feedback",
                  params: { type: "issue" },
                })
              }
              testID="report_a_bug"
            />
            <FieldRow
              title={t(
                Platform.OS === "ios"
                  ? "rate_pixy_app_store"
                  : "rate_pixy_google_play"
              )}
              icon={SETTINGS_ICONS.rate}
              kind="external"
              onPress={askToRateApp}
              testID="rate_pixy"
            />
            <FieldGroup.SectionFooter>
              <ExpoText textStyle={{ color: colors.textSecondary }}>
                {t("feedback_help")}
              </ExpoText>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title={t("settings_about")}>
            <FieldRow
              title={t("changelog")}
              icon={SETTINGS_ICONS.changelog}
              kind="external"
              onPress={async () => {
                analytics.track("settings:changelog_tapped");
                await WebBrowser.openBrowserAsync(CHANGELOG_URL);
              }}
              testID="changelog"
            />
            <FieldRow
              title={t("privacy")}
              icon={SETTINGS_ICONS.privacy}
              kind="push"
              onPress={() => router.push("/settings/privacy")}
            />
            <FieldRow
              title={t("licenses")}
              icon={SETTINGS_ICONS.licenses}
              kind="push"
              onPress={() => router.push("/settings/licenses")}
            />
            <FieldRow
              title={t("app_is_open_source")}
              icon={SETTINGS_ICONS.openSource}
              kind="external"
              onPress={() => {
                Linking.openURL(
                  "https://github.com/mrzmyr/pixy-mood-tracker-app"
                );
              }}
            />
            {!isDevelopmentVisible && footer}
          </FieldGroup.Section>

          {isDevelopmentVisible && (
            <FieldGroup.Section title={t("settings_development")}>
              <FieldRow
                title={t("onboarding")}
                icon={SETTINGS_ICONS.onboarding}
                kind="push"
                onPress={() => router.push("/onboarding")}
              />
              {DEV_TOOLS && (
                <FieldRow
                  title="Test data"
                  icon={SETTINGS_ICONS.data}
                  kind="push"
                  onPress={() => router.push("/dev/fixtures")}
                  testID="dev-fixtures"
                />
              )}
              {DEV_TOOLS && (
                <FieldRow
                  title="Playground"
                  icon={SETTINGS_ICONS.playground}
                  kind="push"
                  onPress={() => router.push("/dev/playground")}
                  testID="dev-playground"
                />
              )}
              {canOverrideFeatureFlags && (
                <FieldRow
                  title="Feature flags"
                  icon={SETTINGS_ICONS.featureFlags}
                  kind="push"
                  onPress={() => router.push("/settings/feature-flags")}
                  testID="dev-feature-flags"
                />
              )}
              <FieldRow
                title={t("settings_development_statistics")}
                icon={SETTINGS_ICONS.statistics}
                kind="push"
                onPress={() => router.push("/settings/development-tools")}
              />
              {footer}
            </FieldGroup.Section>
          )}
        </FieldGroup>
      </Host>
    </ScrollEdge>
  );
};
