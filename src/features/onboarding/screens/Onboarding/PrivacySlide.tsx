import { ScrollView, Text, View } from "react-native";
import { Lock } from "react-native-feather";
import Animated, { FadeInRight } from "react-native-reanimated";
import Button from "@/components/Button";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { useAnalytics } from "@/state/analytics";
import { DEVICE_REQUIRES_CONSENT } from "@/state/analytics/consent";

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
          borderRadius: 4,
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
      }}
    >
      <View
        style={{
          flex: 1,
          paddingVertical: 32,
          paddingHorizontal: 32,
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: 32,
            paddingBottom: 16,
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.onboardingPrivacyBadgeBackground,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Lock
              width={24}
              height={24}
              color={colors.onboardingPrivacyBadgeVector}
            />
          </View>
          <Text
            style={{
              color: colors.onboardingTitle,
              fontSize: 24,
              lineHeight: 32,
              fontWeight: "bold",
              marginBottom: 20,
              textAlign: "center",
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
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.onboardingBottomBorder,
              backgroundColor: colors.onboardingBottomBackground,
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
            <Text
              style={{
                color: colors.onboardingTitle,
                fontSize: 15,
                lineHeight: 22,
                marginTop: 8,
                fontWeight: needsConsent ? "600" : "normal",
              }}
            >
              {needsConsent
                ? t("onboarding_step_5_consent_question")
                : t("onboarding_step_5_consent_info")}
            </Text>
          </Animated.View>
        </ScrollView>
        {needsConsent ? (
          // Equal buttons: declining must be as easy as agreeing.
          <View style={{ width: "100%", flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button
                type="secondary"
                onPress={() => choose(false)}
                testID="analytics-consent-deny"
              >
                {t("onboarding_step_5_consent_deny")}
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                type="secondary"
                onPress={() => choose(true)}
                testID="analytics-consent-allow"
              >
                {t("onboarding_step_5_consent_allow")}
              </Button>
            </View>
          </View>
        ) : (
          <View
            style={{
              width: "100%",
            }}
          >
            <Button onPress={onPress}>{t("onboarding_step_5_button")}</Button>
          </View>
        )}
      </View>
    </View>
  );
};
