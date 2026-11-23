import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import LinkButton from "@/components/link-button";
import {
  EMOTIONS,
  EmotionAdvancedSelection,
  EmotionBasicSelection,
  ExpandButton,
  getBasicEmotions,
  getEmotionPageIndex,
  NeedsCheck,
} from "@/features/logger";
import type { NeedStates } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";
import type { Emotion } from "@/types";

/** No footer below the grid, unlike the logger slide. */
const GRID_STYLE = { marginBottom: 0 };

/**
 * Emotions of the quick check-in with the components of the logger emotion
 * step. Basic grid first; More shows all emotions by category. With flag
 * `needs`, needs mode comes first: rate needs, pick from the feelings of
 * each rated need. A link switches to all emotions and back. Picks and need
 * ratings stay when switching. `onPagingChange` tells while the emotion
 * pages, which swipe sideways, show.
 */
export const QuickCheckInEmotions = ({
  picked,
  rating,
  items,
  onToggle,
  onPagingChange,
}: {
  picked: string[];
  rating: LogItem["rating"] | null;
  items: LogItem[];
  onToggle: (key: string) => void;
  onPagingChange: (isPaging: boolean) => void;
}) => {
  const router = useRouter();
  const hasNeeds = useFeatureFlag("needs");
  const [isAdvanced, setIsAdvanced] = useState(false);
  // Starts in needs mode; without flag `needs`, `showNeeds` stays false.
  const [isNeedsMode, setIsNeedsMode] = useState(true);
  const [needStates, setNeedStates] = useState<NeedStates>({});

  const showNeeds = hasNeeds && isNeedsMode;
  // Folding the section unmounts the pages: swiping comes back.
  useEffect(() => () => onPagingChange(false), [onPagingChange]);
  const handleNeedsToggle = () => {
    setIsNeedsMode(!isNeedsMode);
    onPagingChange(isNeedsMode && isAdvanced);
  };
  const handleExpand = () => {
    setIsAdvanced(!isAdvanced);
    onPagingChange(!showNeeds && !isAdvanced);
  };
  const selected = EMOTIONS.filter((emotion) => picked.includes(emotion.key));
  const onPress = (emotion: Emotion) => onToggle(emotion.key);
  const openRequest = () =>
    router.push({ pathname: "/request", params: { kind: "emotion" } });

  let content: React.ReactNode;
  if (showNeeds) {
    content = (
      <NeedsCheck
        states={needStates}
        onChange={(key, state) =>
          setNeedStates((current) => ({ ...current, [key]: state }))
        }
        emotions={EMOTIONS}
        selectedEmotions={selected}
        onPressEmotion={onPress}
      />
    );
  } else if (isAdvanced) {
    content = (
      <EmotionAdvancedSelection
        defaultIndex={getEmotionPageIndex(rating)}
        onPress={onPress}
        selectedEmotions={selected}
        onRequestEmotion={openRequest}
      />
    );
  } else {
    content = (
      <EmotionBasicSelection
        emotions={getBasicEmotions(selected, items)}
        onPress={onPress}
        selectedEmotions={selected}
        onRequestEmotion={openRequest}
        style={GRID_STYLE}
      />
    );
  }

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          // LinkButton pads 8: text lines up with the grid at 20.
          paddingLeft: 12,
          paddingRight: 20,
          minHeight: 40,
        }}
      >
        {hasNeeds ? (
          <LinkButton
            testID="quick-check-in-needs-toggle"
            onPress={handleNeedsToggle}
            style={{ fontWeight: "400" }}
          >
            {t(showNeeds ? "log_needs_show_all" : "log_needs_use")}
          </LinkButton>
        ) : (
          <View />
        )}
        {!showNeeds && (
          <ExpandButton expanded={!isAdvanced} onPress={handleExpand} />
        )}
      </View>
      {content}
    </View>
  );
};
