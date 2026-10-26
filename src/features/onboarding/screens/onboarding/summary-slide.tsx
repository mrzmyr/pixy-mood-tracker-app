import { Pressable, Text, View } from "react-native";
import Button from "@/components/button";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t, tDynamic } from "@/lib/translation";
import { getCatalogCategoryTitle, getCatalogTagTitle } from "@/features/tags";
import type { CategorySuggestion } from "../../personalization";
import { QuestionLayout } from "./question-layout";
import type { QuestionNavigation } from "./question-layout";

const Section = ({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) => {
  const colors = useColors();
  return (
    <View
      style={{
        padding: 16,
        borderRadius: RADIUS.md,
        borderWidth: 2,
        borderColor: colors.onboardingCardBorder,
        backgroundColor: colors.onboardingCardBackground,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          color: colors.onboardingTitle,
          fontSize: 17,
          lineHeight: 22,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
      {note ? (
        <Text
          style={{
            color: colors.onboardingBody,
            fontSize: 14,
            lineHeight: 19,
            marginTop: 2,
          }}
        >
          {note}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
        }}
      >
        {children}
      </View>
    </View>
  );
};

const Chip = ({
  label,
  isOn = true,
  onPress,
  testID,
}: {
  label: string;
  isOn?: boolean;
  onPress?: () => void;
  testID?: string;
}) => {
  const colors = useColors();
  const content = (
    <Text
      style={{
        color: isOn ? colors.onboardingTitle : colors.onboardingBody,
        fontSize: 15,
        textDecorationLine: isOn ? "none" : "line-through",
      }}
    >
      {label}
    </Text>
  );
  const style = {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 32,
    justifyContent: "center" as const,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: isOn ? colors.tint : colors.onboardingCardBorder,
    opacity: isOn ? 1 : 0.6,
  };
  // Steps are not tappable here: flat chips, no outline.
  if (!onPress) {
    return (
      <View
        style={{
          ...style,
          borderColor: "transparent",
          backgroundColor: colors.onboardingCardBorder,
        }}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isOn }}
      onPress={onPress}
      hitSlop={6}
      style={style}
    >
      {content}
    </Pressable>
  );
};

/**
 * What onboarding set up: the check-in steps and suggested tags, each
 * category with the answers that brought it. Tapping a tag leaves it out.
 */
export const SummarySlide = ({
  navigation,
  name,
  steps,
  suggestions,
  removedTagKeys,
  onToggleTag,
  onNext,
}: {
  navigation: QuestionNavigation;
  name: string;
  /** Labels of the check-in steps, in order. */
  steps: string[];
  suggestions: CategorySuggestion[];
  removedTagKeys: ReadonlySet<string>;
  onToggleTag: (key: string) => void;
  onNext: () => void;
}) => (
  <QuestionLayout
    navigation={navigation}
    title={
      name
        ? t("onboarding_summary_title_named", { name })
        : t("onboarding_summary_title")
    }
    subtitle={
      suggestions.length > 0
        ? t("onboarding_summary_body")
        : t("onboarding_summary_body_default")
    }
    footer={
      <Button testID="onboarding-summary-next" onPress={onNext}>
        {t("onboarding_summary_button")}
      </Button>
    }
  >
    <Section title={t("onboarding_summary_steps")}>
      {steps.map((step) => (
        <Chip key={step} label={step} />
      ))}
    </Section>
    {suggestions.map((suggestion) => (
      <Section
        key={suggestion.kind}
        title={getCatalogCategoryTitle(suggestion.kind)}
        note={
          suggestion.reasons.length > 0
            ? t("onboarding_summary_because", {
                reasons: suggestion.reasons
                  .map((reason) => tDynamic(`onboarding_struggle_${reason}`))
                  .join(", "),
              })
            : t("onboarding_summary_because_goal")
        }
      >
        {suggestion.tags.map((item) => (
          <Chip
            key={item.key}
            testID={`onboarding-tag-${item.key}`}
            label={getCatalogTagTitle(item)}
            isOn={!removedTagKeys.has(item.key)}
            onPress={() => onToggleTag(item.key)}
          />
        ))}
      </Section>
    ))}
  </QuestionLayout>
);
