import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import useColors from "@/hooks/use-colors";
import { HeaderNavigation } from "./header-navigation";

/** Navigation shared by every question slide. */
export interface QuestionNavigation {
  index: number;
  count: number;
  setIndex: (index: number) => void;
  onSkip: () => void;
}

/**
 * Onboarding question on the sky: back, dots, and skip on top, the question
 * and its answers scrolling in the middle, the action at the bottom.
 */
export const QuestionLayout = ({
  navigation,
  title,
  subtitle,
  children,
  footer,
}: {
  navigation: QuestionNavigation;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  footer: ReactNode;
}) => {
  const colors = useColors();

  return (
    <View style={{ flex: 1 }}>
      <HeaderNavigation {...navigation} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          accessibilityRole="header"
          style={{
            color: colors.onboardingTitle,
            fontSize: 28,
            lineHeight: 34,
            fontWeight: "bold",
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: colors.onboardingBody,
              fontSize: 17,
              lineHeight: 24,
              marginTop: 8,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
        <View style={{ marginTop: 24, gap: 10 }}>{children}</View>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
        {footer}
      </View>
    </View>
  );
};
