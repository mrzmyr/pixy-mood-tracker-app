import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/link-button";
import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import { MenstruationIcon } from "@/components/menstruation-icon";
import RadioMark from "@/components/radio-mark";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { MenstruationFlowSchema } from "@/types";
import type { MenstruationFlow } from "@/types";
import { SlideHeadline } from "../components/slide-headline";
import { useLogDraft } from "../log-draft";
import { Footer } from "./footer";
import { useSlideMarginTop } from "./margin-top";

const IS_ANDROID = Platform.OS === "android";

/**
 * One flow choice as a platform radio row. iOS: grouped row, droplet leads,
 * check trails. Android: Material list row, radio leads, droplet trails.
 */
const FlowRow = ({
  flow,
  selected,
  onPress,
}: {
  flow: MenstruationFlow;
  selected: boolean;
  onPress: () => void;
}) => {
  const colors = useColors();
  const mark = <RadioMark selected={selected} onSelect={onPress} />;
  const icon = <MenstruationIcon flow={flow} />;
  return (
    <MenuListItem
      testID={`menstruation-flow-${flow}`}
      title={t(`menstruation_flow_${flow}`)}
      checked={selected}
      onPress={onPress}
      iconLeft={IS_ANDROID ? mark : icon}
      iconRight={IS_ANDROID ? icon : mark}
      dividerColor={colors.logCardBorder}
    />
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
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { draft, setMenstruationFlow } = useLogDraft();
  const selected = draft.menstruation?.flow;
  const marginTop = useSlideMarginTop();
  return (
    <View
      testID="slide-menstruation"
      style={{
        flex: 1,
        width: "100%",
        paddingBottom: insets.bottom + 20,
        marginTop,
      }}
    >
      {/* Padding sits inside the ScrollView: Android lists bleed to the
          screen edges, and a padded ScrollView would clip them. */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
      >
        <SlideHeadline>{t("log_menstruation_question")}</SlideHeadline>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t("log_menstruation_question")}
          style={{ marginTop: 24 }}
        >
          {/* iOS card sits on the logger background like entry cards;
              Android rows sit on the surface, as Material lists do. */}
          <MenuList
            style={{
              backgroundColor: IS_ANDROID
                ? "transparent"
                : colors.logCardBackground,
            }}
          >
            {MenstruationFlowSchema.options.map((flow) => (
              <FlowRow
                key={flow}
                flow={flow}
                selected={selected === flow}
                onPress={() => {
                  void haptics.selection();
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
          </MenuList>
        </View>
      </ScrollView>
      <Footer style={{ paddingHorizontal: 20 }}>
        {showDisable && (
          <LinkButton
            testID="menstruation-disable"
            type="secondary"
            onPress={onDisableStep}
            style={{ fontWeight: "400" }}
          >
            {t("log_menstruation_disable")}
          </LinkButton>
        )}
      </Footer>
    </View>
  );
};
