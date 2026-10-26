import { KeyboardAvoidingView, Platform, TextInput } from "react-native";
import Button from "@/components/button";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { QuestionLayout } from "./question-layout";
import type { QuestionNavigation } from "./question-layout";

/** First question: what Pixy calls the user. Stays on this device. */
export const NameSlide = ({
  navigation,
  name,
  onChangeName,
  onNext,
}: {
  navigation: QuestionNavigation;
  name: string;
  onChangeName: (name: string) => void;
  onNext: () => void;
}) => {
  const colors = useColors();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <QuestionLayout
        navigation={navigation}
        title={t("onboarding_name_title")}
        subtitle={t("onboarding_name_body")}
        footer={
          <Button testID="onboarding-name-next" onPress={onNext}>
            {name.trim() ? t("onboarding_next") : t("onboarding_not_now")}
          </Button>
        }
      >
        <TextInput
          testID="onboarding-name"
          value={name}
          onChangeText={onChangeName}
          placeholder={t("onboarding_name_placeholder")}
          placeholderTextColor={colors.onboardingBody}
          accessibilityLabel={t("onboarding_name_title")}
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          maxLength={40}
          onSubmitEditing={onNext}
          style={{
            color: colors.onboardingTitle,
            fontSize: 20,
            minHeight: 56,
            paddingHorizontal: 16,
            borderRadius: RADIUS.md,
            borderWidth: 2,
            borderColor: colors.onboardingCardBorder,
            backgroundColor: colors.onboardingCardBackground,
          }}
        />
      </QuestionLayout>
    </KeyboardAvoidingView>
  );
};
