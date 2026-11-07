import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import FlagHighlight from "@/components/flag-highlight";
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
import { SPACE } from "@/constants/space";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";
import type { Emotion } from "@/types";

/**
 * Grid inside the section card: edges at 16 like the card title. Right
 * padding holds one extra cell gap. No footer, unlike the logger slide.
 */
const GRID_STYLE = {
  marginBottom: 0,
  paddingTop: SPACE.xs,
  paddingLeft: SPACE.lg,
  paddingRight: SPACE.xxl,
};

/**
 * Emotions of the quick check-in with the components of the logger emotion
 * step. Basic grid first; More shows all emotions by category. With flag
 * `needs`, a link switches to needs mode: rate needs, pick from the feelings
 * of each rated need. Picks and need ratings stay when switching.
 */
export const QuickCheckInEmotions = ({
  picked,
  rating,
  items,
  onToggle,
}: {
  picked: string[];
  rating: LogItem["rating"] | null;
  items: LogItem[];
  onToggle: (key: string) => void;
}) => {
  const router = useRouter();
  const hasNeeds = useFeatureFlag("needs");
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [isNeedsMode, setIsNeedsMode] = useState(false);
  const [needStates, setNeedStates] = useState<NeedStates>({});

  const showNeeds = hasNeeds && isNeedsMode;
  const selected = EMOTIONS.filter((emotion) => picked.includes(emotion.key));
  const onPress = (emotion: Emotion) => onToggle(emotion.key);
  const openRequest = () =>
    router.push({ pathname: "/request", params: { kind: "emotion" } });

  let content: React.ReactNode;
  if (showNeeds) {
    content = (
      <FlagHighlight flag="needs">
        <NeedsCheck
          states={needStates}
          onChange={(key, state) =>
            setNeedStates((current) => ({ ...current, [key]: state }))
          }
          emotions={EMOTIONS}
          selectedEmotions={selected}
          onPressEmotion={onPress}
        />
      </FlagHighlight>
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
          // LinkButton and ExpandButton pad 8: both line up with the grid.
          paddingHorizontal: SPACE.sm,
          minHeight: 40,
        }}
      >
        {hasNeeds ? (
          <FlagHighlight flag="needs">
            <LinkButton
              testID="quick-check-in-needs-toggle"
              onPress={() => setIsNeedsMode((current) => !current)}
              style={{ fontWeight: "400" }}
            >
              {t(showNeeds ? "log_needs_show_all" : "log_needs_use")}
            </LinkButton>
          </FlagHighlight>
        ) : (
          <View />
        )}
        {!showNeeds && (
          <ExpandButton
            expanded={!isAdvanced}
            onPress={() => setIsAdvanced((current) => !current)}
          />
        )}
      </View>
      {content}
    </View>
  );
};
