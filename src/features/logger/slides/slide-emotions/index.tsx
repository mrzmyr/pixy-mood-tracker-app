import { useSlideMarginTop } from "../margin-top";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { useLogState } from "@/features/logs";
import { useLogDraft } from "../../log-draft";
import type { Emotion } from "@/types";
import { LinearGradient } from "expo-linear-gradient";
import keyBy from "lodash/keyBy";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import LinkButton from "@/components/link-button";
import { SlideHeadline } from "../../components/slide-headline";
import { EMOTIONS } from "../../config";
import { Footer } from "../footer";
import { EmotionAdvancedGradients } from "./emotion-advanced-gradients";
import { EmotionAdvancedSelection } from "./emotion-advanced-selection";
import { EmotionBasicGradients } from "./emotion-basic-gradients";
import { EmotionBasicSelection } from "./emotion-basic-selection";
import { ExpandButton } from "./expand-button";
import noop from "lodash/noop";
import { getBasicEmotions } from "./basic-emotions";

type Mode = "basic" | "advanced";

/** Headline row of the emotion slide with the More toggle. */
const EmotionsHeader = ({
  marginTop,
  isExpanded,
  onToggleMode,
}: {
  marginTop: number;
  isExpanded: boolean;
  onToggleMode: () => void;
}) => (
  <View
    style={{
      width: "100%",
      paddingHorizontal: 20,
      marginTop,
      marginBottom: 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <SlideHeadline>{t("log_emotions_question")}</SlideHeadline>
    <ExpandButton expanded={isExpanded} onPress={onToggleMode} />
  </View>
);

/**
 * Emotion slide of the logger.
 *
 * Basic mode shows up to 36 emotions: the draft's picks, then the 20 most
 * used, then the predefined basic set. Must render inside `LogDraftProvider`
 * and `LogsProvider`.
 */
export const SlideEmotions = ({
  defaultIndex,
  onDisableStep = noop,
  initialMode = "basic",
  onModeChange = noop,
  showDisable,
}: {
  defaultIndex?: number;
  onDisableStep?: () => void;
  initialMode?: Mode;
  onModeChange?: (mode: Mode) => void;
  showDisable: boolean;
}) => {
  const colors = useColors();
  const marginTop = useSlideMarginTop();
  const { draft, setEmotions } = useLogDraft();
  const logState = useLogState();
  const router = useRouter();
  const openRequest = () =>
    router.push({ pathname: "/request", params: { kind: "emotion" } });

  const EMOTIONS_BY_KEY = keyBy(EMOTIONS, "key");

  const [initialSelectedEmotions, setInitialSelectedEmotions] = useState<
    Emotion[]
  >(() => draft.emotions.map((d) => EMOTIONS_BY_KEY[d]));
  const [selectedEmotions, setSelectedEmotions] = useState<Emotion[]>(() =>
    EMOTIONS.filter((d) => draft.emotions.includes(d.key))
  );

  const _setSelectedEmotions = (emotions: Emotion[]) => {
    setSelectedEmotions(emotions);
    setEmotions(emotions.map((emotion) => emotion.key));
  };

  const [mode, setMode] = useState<Mode>(initialMode);

  const basicEmotions = getBasicEmotions(
    initialSelectedEmotions,
    logState.items
  );

  const onPressEmotion = (emotion: Emotion) => {
    if (selectedEmotions.map((d) => d.key).includes(emotion.key)) {
      _setSelectedEmotions(
        selectedEmotions.filter((e) => e.key !== emotion.key)
      );
    } else {
      _setSelectedEmotions([...selectedEmotions, emotion]);
    }
  };

  const toggleMode = () => {
    const nextMode = mode === "basic" ? "advanced" : "basic";
    setMode(nextMode);
    onModeChange(nextMode);

    setInitialSelectedEmotions(selectedEmotions);
  };

  const content =
    mode === "basic" ? (
      <EmotionBasicSelection
        emotions={basicEmotions}
        onPress={onPressEmotion}
        selectedEmotions={selectedEmotions}
        onRequestEmotion={openRequest}
      />
    ) : (
      <EmotionAdvancedSelection
        defaultIndex={defaultIndex}
        onPress={onPressEmotion}
        selectedEmotions={selectedEmotions}
        onRequestEmotion={openRequest}
      />
    );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
        width: "100%",
      }}
    >
      <View
        style={{
          flex: 1,
          position: "relative",
        }}
      >
        <EmotionsHeader
          marginTop={marginTop}
          isExpanded={mode === "basic"}
          onToggleMode={toggleMode}
        />
        <View
          style={{
            position: "relative",
            flex: 1,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[colors.logBackground, colors.logBackgroundTransparent]}
            style={{
              position: "absolute",
              height: 12,
              top: 0,
              zIndex: 1,
              width: "100%",
            }}
          />
          <ScrollView>{content}</ScrollView>
          {mode === "basic" ? (
            <EmotionBasicGradients />
          ) : (
            <EmotionAdvancedGradients />
          )}
        </View>
        <Footer
          style={{
            marginHorizontal: 16,
          }}
        >
          {showDisable && selectedEmotions.length === 0 && (
            <LinkButton
              type="secondary"
              onPress={onDisableStep}
              style={{
                fontWeight: "400",
              }}
            >
              {t("log_emotions_disable")}
            </LinkButton>
          )}
        </Footer>
      </View>
    </View>
  );
};
