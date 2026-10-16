import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import { MenstruationIcon } from "@/components/MenstruationIcon";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import usePressRipple from "@/hooks/usePressRipple";
import { t } from "@/lib/translation";
import { MenstruationFlowSchema } from "@/types";
import type { MenstruationFlow } from "@/types";
import { SlideHeadline } from "../components/SlideHeadline";
import { useLogDraft } from "../logDraft";
import { Footer } from "./Footer";
import { getSlideMarginTop } from "./marginTop";

const FlowOption = ({
  flow,
  selected,
  onPress,
}: {
  flow: MenstruationFlow;
  selected: boolean;
  onPress: () => void;
}) => {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const ripple = usePressRipple();
  return (
    <Pressable
      testID={`menstruation-flow-${flow}`}
      accessibilityRole="button"
      accessibilityLabel={t(`menstruation_flow_${flow}`)}
      accessibilityState={{ selected }}
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      android_ripple={ripple}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        gap: 12,
        borderRadius: RADIUS.sm,
        borderWidth: 2,
        borderColor: selected || isFocused ? colors.tint : colors.logCardBorder,
        backgroundColor: colors.logCardBackground,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <MenstruationIcon flow={flow} />
      <Text style={{ flex: 1, fontSize: 17, color: colors.text }}>
        {t(`menstruation_flow_${flow}`)}
      </Text>
    </Pressable>
  );
};

/** Selection advances; tapping the current value removes it and stays here. */
export const SlideMenstruation = ({
  onSelect,
  onDisableStep,
  showDisable,
}: {
  onSelect: () => void;
  onDisableStep: () => void;
  showDisable: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { draft, setMenstruationFlow } = useLogDraft();
  const selected = draft.menstruation?.flow;
  return (
    <View
      testID="slide-menstruation"
      style={{
        flex: 1,
        width: "100%",
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 20,
        marginTop: getSlideMarginTop(),
      }}
    >
      <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 80 }}>
        <SlideHeadline>{t("log_menstruation_question")}</SlideHeadline>
        <View style={{ gap: 8, marginTop: 24 }}>
          {MenstruationFlowSchema.options.map((flow) => (
            <FlowOption
              key={flow}
              flow={flow}
              selected={selected === flow}
              onPress={() => {
                haptics.selection();
                if (selected === flow) {
                  setMenstruationFlow(null);
                  return;
                }
                setMenstruationFlow(flow);
                // Same deferred advance as Sleep: draft updates before the carousel moves.
                requestAnimationFrame(onSelect);
              }}
            />
          ))}
        </View>
      </ScrollView>
      <Footer>
        {showDisable && (
          <LinkButton
            testID="menstruation-disable"
            type="secondary"
            onPress={onDisableStep}
          >
            {t("log_menstruation_disable")}
          </LinkButton>
        )}
      </Footer>
    </View>
  );
};
