import { Stack } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { Section } from "@/components/type";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";

// Android renders only image icons in native toolbars; iOS uses SF Symbols.
const ICONS =
  Platform.OS === "ios"
    ? ({ previous: "chevron.left", next: "chevron.right" } as const)
    : {
        previous: require("../../../../assets/images/icons/chevron-left.png"),
        next: require("../../../../assets/images/icons/chevron-right.png"),
      };

interface PeriodStepperProps {
  /** Current period, for example "November 2026". */
  label: string;
  /** Current period has no next one: Next is disabled. */
  isCurrent: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

/** Web has no native toolbar: plain row with arrows. */
const PeriodRow = ({
  label,
  isCurrent,
  onPrevious,
  onNext,
}: PeriodStepperProps) => {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: colors.background,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("recaps_period_previous")}
        hitSlop={12}
        onPress={onPrevious}
        testID="recaps-period-previous"
      >
        <ChevronLeft width={24} height={24} color={colors.text} />
      </Pressable>
      <Section
        accessibilityRole="header"
        testID="recaps-period-label"
        style={{ fontWeight: "700", fontVariant: ["tabular-nums"] }}
      >
        {label}
      </Section>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("recaps_period_next")}
        accessibilityState={{ disabled: isCurrent }}
        disabled={isCurrent}
        hitSlop={12}
        onPress={onNext}
        testID="recaps-period-next"
        style={{ opacity: isCurrent ? 0.3 : 1 }}
      >
        <ChevronRight width={24} height={24} color={colors.text} />
      </Pressable>
    </View>
  );
};

/**
 * Previous and next period with the period label between them. Native bottom
 * toolbar: one Liquid Glass capsule on iOS 26, Material floating toolbar on
 * Android. Flexible spacers center the capsule on iOS; Android centers the
 * toolbar by itself and allows only fixed-width spacers. Render outside the
 * page's ScrollView: the toolbar host is a native view.
 */
export const PeriodStepper = (props: PeriodStepperProps) => {
  const colors = useColors();
  if (Platform.OS === "web") {
    return <PeriodRow {...props} />;
  }
  const isIos = Platform.OS === "ios";
  return (
    <Stack.Toolbar placement="bottom">
      {isIos && <Stack.Toolbar.Spacer />}
      <Stack.Toolbar.Button
        icon={ICONS.previous}
        accessibilityLabel={t("recaps_period_previous")}
        onPress={props.onPrevious}
      />
      <Stack.Toolbar.View>
        <Text
          accessibilityRole="header"
          testID="recaps-period-label"
          style={{
            color: colors.text,
            fontSize: 17,
            fontWeight: "600",
            fontVariant: ["tabular-nums"],
            paddingHorizontal: 8,
          }}
        >
          {props.label}
        </Text>
      </Stack.Toolbar.View>
      <Stack.Toolbar.Button
        icon={ICONS.next}
        accessibilityLabel={t("recaps_period_next")}
        disabled={props.isCurrent}
        onPress={props.onNext}
      />
      {isIos && <Stack.Toolbar.Spacer />}
    </Stack.Toolbar>
  );
};
