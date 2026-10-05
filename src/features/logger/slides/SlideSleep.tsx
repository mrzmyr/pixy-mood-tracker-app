import { getSlideMarginTop } from "./marginTop";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { SLEEP_QUALITY_KEYS } from "@/constants/Ratings";
import { useLogDraft } from "../logDraft";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import { SlideHeadline } from "../components/SlideHeadline";
import { Footer } from "./Footer";
import { SlideSleepButton } from "./SlideSleepButton";

// Worst to best, so "Not at all" sits left and "Great" right.
const SLEEP_QUALITIES = [...SLEEP_QUALITY_KEYS].reverse();

/**
 * Sleep quality slide. Picking a quality calls `onSelect`; picking the
 * selected quality again clears it and stays on the slide.
 */
export const SlideSleep = ({
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
  const { draft, setSleepQuality } = useLogDraft();
  const selected = draft.sleep?.quality ?? null;

  const marginTop = getSlideMarginTop();

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 20,
        marginTop,
      }}
    >
      <SlideHeadline>{t("log_sleep_question")}</SlideHeadline>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 32,
        }}
      >
        {SLEEP_QUALITIES.map((key) => (
          <SlideSleepButton
            key={key}
            value={key}
            selected={selected === key}
            onPress={() => {
              if (selected === key) {
                setSleepQuality(null);
                return;
              }
              setSleepQuality(key);
              onSelect();
            }}
          />
        ))}
      </View>
      <View
        style={{
          flex: 1,
          marginTop: 8,
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            flex: 5,
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {t("logger_step_sleep_low")}
        </Text>
        <View style={{ flex: 15 }} />
        <Text
          style={{
            flex: 5,
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {t("logger_step_sleep_high")}
        </Text>
      </View>
      <Footer>
        {showDisable && (
          <LinkButton
            type="secondary"
            onPress={onDisableStep}
            style={{
              fontWeight: "400",
            }}
          >
            {t("log_sleep_disable")}
          </LinkButton>
        )}
      </Footer>
    </View>
  );
};
