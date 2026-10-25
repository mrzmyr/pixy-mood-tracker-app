import { useSlideMarginTop } from "./margin-top";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { SLEEP_QUALITY_KEYS } from "@/constants/ratings";
import { useLogDraft } from "../log-draft";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/link-button";
import { SlideHeadline } from "../components/slide-headline";
import { Footer } from "./footer";
import { SlideSleepButton } from "./slide-sleep-button";

// Worst to best, so "Not at all" sits left and "Great" right.
const SLEEP_QUALITIES = [...SLEEP_QUALITY_KEYS].reverse();

/**
 * Sleep quality slide. Picking a quality calls `onNext`; picking the
 * selected quality again clears it and stays on the slide. Skip clears the
 * quality for this entry only and calls `onNext`; the step stays on.
 */
export const SlideSleep = ({
  onNext,
  onDisableStep,
  showDisable,
}: {
  onNext: () => void;
  onDisableStep: () => void;
  showDisable: boolean;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { draft, setSleepQuality } = useLogDraft();
  const selected = draft.sleep?.quality ?? null;

  const marginTop = useSlideMarginTop();

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
              // Moving the carousel in the same press as the draft update
              // leaves it on this slide. Advance on the next frame.
              requestAnimationFrame(onNext);
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
        <LinkButton
          type="secondary"
          onPress={() => {
            setSleepQuality(null);
            requestAnimationFrame(onNext);
          }}
          style={{ fontWeight: "400", minHeight: 44 }}
          testID="sleep-skip"
        >
          {t("log_sleep_skip")}
        </LinkButton>
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
