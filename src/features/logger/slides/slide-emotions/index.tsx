import { useSlideMarginTop } from "../margin-top";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { useLogState, getMostUsedEmotions } from "@/features/logs";
import { useLogDraft } from "../../log-draft";
import type { Emotion } from "@/types";
import { LinearGradient } from "expo-linear-gradient";
import keyBy from "lodash/keyBy";
import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import LinkButton from "@/components/link-button";
import { SlideHeadline } from "../../components/slide-headline";
import { PullToSearch } from "../../components/pull-to-search";
import { matchesSearch } from "@/lib/search";
import { EMOTIONS } from "../../config";
import { Footer } from "../footer";
import { EmotionAdvancedGradients } from "./emotion-advanced-gradients";
import { EmotionAdvancedSelection } from "./emotion-advanced-selection";
import { EmotionBasicGradients } from "./emotion-basic-gradients";
import { EmotionBasicSelection } from "./emotion-basic-selection";
import { ExpandButton } from "./expand-button";
import noop from "lodash/noop";
import FlagHighlight from "@/components/flag-highlight";
import { useFeatureFlag } from "@/state/feature-flags";
import { NeedsCheck } from "./needs-check";
import { suggestEmotionsForNeeds } from "./needs";
import type { NeedStates } from "./needs";
import { SuggestedEmotions } from "./suggested-emotions";

type Mode = "basic" | "advanced";

const MAX_BASIC_EMOTIONS = 36;

// The basic grid sorts by good, neutral, and bad only.
const toBasicCategory = (emotion: Emotion): Emotion => ({
  ...emotion,
  category: (
    {
      very_bad: "bad",
      bad: "bad",
      neutral: "neutral",
      good: "good",
      very_good: "good",
    } satisfies Record<Emotion["category"], Emotion["category"]>
  )[emotion.category],
});

const appendMissingEmotions = (
  emotions: Emotion[],
  candidates: Emotion[]
): Emotion[] => {
  if (emotions.length >= MAX_BASIC_EMOTIONS) {
    return emotions;
  }

  const emotionKeys = new Set(emotions.map((emotion) => emotion.key));
  const missingEmotions = candidates
    .filter((d) => !emotionKeys.has(d.key))
    .slice(0, MAX_BASIC_EMOTIONS - emotions.length);

  return [...emotions, ...missingEmotions];
};

/**
 * Headline row of the emotion slide. With the `needs` flag, a link below it
 * switches between all emotions and needs mode. Needs mode hides More.
 */
const EmotionsHeader = ({
  marginTop,
  hasNeeds,
  isNeedsMode,
  isExpanded,
  onToggleMode,
  onToggleNeedsMode,
}: {
  marginTop: number;
  hasNeeds: boolean;
  isNeedsMode: boolean;
  isExpanded: boolean;
  onToggleMode: () => void;
  onToggleNeedsMode: () => void;
}) => (
  <>
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
      <SlideHeadline>
        {t(isNeedsMode ? "log_needs_title" : "log_emotions_question")}
      </SlideHeadline>
      {!isNeedsMode && (
        <ExpandButton expanded={isExpanded} onPress={onToggleMode} />
      )}
    </View>
    {hasNeeds && (
      <FlagHighlight flag="needs">
        <LinkButton
          testID="needs-mode-toggle"
          onPress={onToggleNeedsMode}
          style={{
            alignSelf: "flex-start",
            marginHorizontal: 20,
            marginBottom: 4,
            fontWeight: "400",
          }}
        >
          {t(isNeedsMode ? "log_needs_show_all" : "log_needs_use")}
        </LinkButton>
      </FlagHighlight>
    )}
  </>
);

/**
 * Emotion slide of the logger.
 *
 * Basic mode shows up to 36 emotions: the draft's picks, then the 20 most
 * used, then the predefined basic set. Pulling the list down reveals a
 * search over all emotions, shown in the basic grid. Must render inside
 * `LogDraftProvider` and `LogsProvider`.
 *
 * With the `needs` flag, a link under the headline switches to needs mode:
 * rate needs, pick from suggested emotions only. Needs mode hides More and
 * all emotions. Ratings and picks stay when switching back.
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
  const hasNeeds = useFeatureFlag("needs");
  const [needStates, setNeedStates] = useState<NeedStates>({});
  // Needs mode: rate needs, pick from suggested emotions only.
  const [isNeedsMode, setIsNeedsMode] = useState(false);
  const showNeeds = hasNeeds && isNeedsMode;

  const mostUsedEmotionKeys = new Set(
    getMostUsedEmotions(logState.items)
      .map((d) => d.key)
      .slice(0, 20)
  );
  const mostUsedEmotions = EMOTIONS.filter((d) =>
    mostUsedEmotionKeys.has(d.key)
  );
  const predefinedBasicEmotions = EMOTIONS.filter(
    (e) => e.mode === "basic" && e.disabled !== true
  );

  let basicEmotions = appendMissingEmotions(
    appendMissingEmotions(initialSelectedEmotions, mostUsedEmotions),
    predefinedBasicEmotions
  );

  basicEmotions = basicEmotions.map(toBasicCategory);

  const [query, setQuery] = useState("");
  const isSearching = query.trim() !== "";
  const searchResults: Emotion[] = [];
  for (const emotion of EMOTIONS) {
    if (emotion.disabled !== true && matchesSearch(emotion.label, query)) {
      searchResults.push(toBasicCategory(emotion));
    }
  }

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

  let content: React.ReactNode;
  if (showNeeds && !isSearching) {
    content = (
      <FlagHighlight flag="needs">
        <NeedsCheck
          states={needStates}
          onChange={(key, state) =>
            setNeedStates((current) => ({ ...current, [key]: state }))
          }
        />
        <SuggestedEmotions
          emotions={suggestEmotionsForNeeds(needStates, EMOTIONS)}
          onPress={onPressEmotion}
          selectedEmotions={selectedEmotions}
        />
      </FlagHighlight>
    );
  } else if (isSearching || mode === "basic") {
    content = (
      <EmotionBasicSelection
        emotions={isSearching ? searchResults : basicEmotions}
        onPress={onPressEmotion}
        selectedEmotions={selectedEmotions}
        onRequestEmotion={openRequest}
      />
    );
  } else {
    content = (
      <EmotionAdvancedSelection
        defaultIndex={defaultIndex}
        onPress={onPressEmotion}
        selectedEmotions={selectedEmotions}
        onRequestEmotion={openRequest}
      />
    );
  }

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
          hasNeeds={hasNeeds}
          isNeedsMode={showNeeds}
          isExpanded={mode === "basic"}
          onToggleMode={toggleMode}
          onToggleNeedsMode={() => setIsNeedsMode((current) => !current)}
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
          <PullToSearch
            testID="logger-emotions-search"
            placeholder={t("log_emotions_search")}
            query={query}
            onChangeQuery={setQuery}
          >
            {content}
          </PullToSearch>
          {isSearching || showNeeds || mode === "basic" ? (
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
