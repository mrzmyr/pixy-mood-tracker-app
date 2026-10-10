import { ScrollView, Text, View } from "react-native";
import { Lock } from "react-native-feather";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import Button from "@/components/Button";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { useAnalytics } from "@/state/analytics";
import { DEVICE_REQUIRES_CONSENT } from "@/state/analytics/consent";
import { RADIUS } from "@/constants/Radius";

const ListItem = ({ children, delay }) => {
  const colors = useColors();

  return (
    <Animated.View
      style={{
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        marginBottom: 8,
      }}
      entering={FadeInRight.delay(delay)}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: RADIUS.full,
          backgroundColor: colors.onboardingListItemDot,
          marginRight: 12,
          marginTop: 9,
        }}
      />
      <Text
        style={{
          color: colors.onboardingListItemText,
          lineHeight: 24,
          fontSize: 17,
          flex: 1,
        }}
      >
        {children}
      </Text>
    </Animated.View>
  );
};

const PrivacyBadge = () => {
  const colors = useColors();

  return (
    <View
      style={{
        width: 72,
        height: 72,
        marginBottom: 16,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Svg width={72} height={72} viewBox="0 0 24 24">
        <Path
          fill={colors.onboardingPrivacyBadgeBackground}
          d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
        />
      </Svg>
      <Lock
        width={22}
        height={22}
        color={colors.onboardingPrivacyBadgeVector}
        style={{ position: "absolute", marginTop: 4 }}
      />
    </View>
  );
};

/**
 * Last onboarding slide with the privacy summary; `onPress` finishes
 * onboarding. Where analytics needs consent, the user picks share or don't
 * share with equal buttons; elsewhere analytics is on and the slide says how
 * to turn it off.
 */
export const PrivacySlide = ({
  onPress,
  needsConsent = DEVICE_REQUIRES_CONSENT,
}: {
  onPress: () => void;
  needsConsent?: boolean;
}) => {
  const colors = useColors();
  const analytics = useAnalytics();
  const insets = useSafeAreaInsets();

  const choose = (share: boolean) => {
    if (share) {
      analytics.enable();
    } else {
      analytics.disable();
    }
    onPress();
  };

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
      }}
    >
      <View
        style={{
          flex: 1,
          paddingVertical: 16,
          paddingHorizontal: 32,
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: 16,
            paddingTop: 16,
            justifyContent: "flex-start",
            alignItems: "stretch",
          }}
        >
          <PrivacyBadge />
          <Text
            style={{
              color: colors.onboardingTitle,
              fontSize: 24,
              lineHeight: 32,
              fontWeight: "bold",
              marginBottom: 20,
              textAlign: "left",
            }}
          >
            {t(`onboarding_step_5_title`)}
          </Text>
          <ListItem delay={100}>{t(`onboarding_step_5_body_2`)}</ListItem>
          <ListItem delay={200}>{t(`onboarding_step_5_body_3`)}</ListItem>
          <ListItem delay={300}>{t(`onboarding_step_5_body_4`)}</ListItem>
          <ListItem delay={400}>{t(`onboarding_step_5_body_5`)}</ListItem>
          <Animated.View
            entering={FadeInRight.delay(500)}
            style={{
              width: "100%",
              marginTop: 16,
              padding: 16,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.cardBackground,
            }}
          >
            <Text
              style={{
                color: colors.onboardingTitle,
                fontSize: 17,
                lineHeight: 24,
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              {t("onboarding_step_5_personal_title")}
            </Text>
            <Text
              style={{
                color: colors.onboardingListItemText,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {t("onboarding_step_5_personal_body")}
            </Text>
            {needsConsent ? null : (
              <Text
                style={{
                  color: colors.onboardingTitle,
                  fontSize: 15,
                  lineHeight: 22,
                  marginTop: 8,
                }}
              >
                {t("onboarding_step_5_analytics_info")}
              </Text>
            )}
          </Animated.View>
        </ScrollView>
        <View style={{ width: "100%" }}>
          {needsConsent ? (
            // Equal buttons: declining must be as easy as agreeing.
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  type="tertiary"
                  onPress={() => choose(false)}
                  testID="analytics-consent-deny"
                >
                  {t("onboarding_step_5_consent_deny")}
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  type="primary"
                  onPress={() => choose(true)}
                  testID="analytics-consent-allow"
                >
                  {t("onboarding_step_5_consent_allow")}
                </Button>
              </View>
            </View>
          ) : (
            <Button onPress={onPress}>{t("onboarding_step_5_button")}</Button>
          )}
          <Text
            style={{
              marginTop: 12,
              color: colors.onboardingPaginationText,
              fontSize: 13,
              lineHeight: 18,
              textAlign: "center",
            }}
          >
            {t("onboarding_step_5_settings_hint")}
          </Text>
        </View>
      </View>
    </View>
  );
};
