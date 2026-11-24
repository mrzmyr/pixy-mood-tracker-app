import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import {
  EMOTIONS,
  EmotionAdvancedSelection,
  EmotionBasicSelection,
  ExpandButton,
  getBasicEmotions,
  getEmotionPageIndex,
} from "@/features/logger";
import type { LogItem } from "@/features/logs";
import type { Emotion } from "@/types";

/** No footer below the grid, unlike the logger slide. */
const GRID_STYLE = { marginBottom: 0 };

/**
 * Emotions of the quick check-in with the components of the logger emotion
 * step. Basic grid first; More shows all emotions by category.
 * `onPagingChange` tells while the emotion pages, which swipe sideways, show.
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
  const [isAdvanced, setIsAdvanced] = useState(false);

  // Folding the section unmounts the pages: swiping comes back.
  useEffect(() => () => onPagingChange(false), [onPagingChange]);
  const handleExpand = () => {
    setIsAdvanced(!isAdvanced);
    onPagingChange(!isAdvanced);
  };
  const selected = EMOTIONS.filter((emotion) => picked.includes(emotion.key));
  const onPress = (emotion: Emotion) => onToggle(emotion.key);
  const openRequest = () =>
    router.push({ pathname: "/request", params: { kind: "emotion" } });

  const content = isAdvanced ? (
    <EmotionAdvancedSelection
      defaultIndex={getEmotionPageIndex(rating)}
      onPress={onPress}
      selectedEmotions={selected}
      onRequestEmotion={openRequest}
    />
  ) : (
    <EmotionBasicSelection
      emotions={getBasicEmotions(selected, items)}
      onPress={onPress}
      selectedEmotions={selected}
      onRequestEmotion={openRequest}
      style={GRID_STYLE}
    />
  );

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingHorizontal: 20,
          minHeight: 40,
        }}
      >
        <ExpandButton expanded={!isAdvanced} onPress={handleExpand} />
      </View>
      {content}
    </View>
  );
};
