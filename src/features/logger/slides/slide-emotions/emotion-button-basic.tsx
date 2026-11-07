import { Chip } from "@/components/chip";
import { CHIP } from "@/constants/chip";
import { useFeatureFlag } from "@/state/feature-flags";
import type { Emotion } from "@/types";
import { useColorScheme } from "react-native";
import type { ChipStyle } from "@/constants/chip";

import { EmotionIndicator } from "./emotions-indicator";

const DEFAULT_STYLE = {};

/** Emotion chip in the basic emotion grid; fills its grid cell. */
export const EmotionButtonBasic = ({
  emotion,
  onPress,
  selected,
  style = DEFAULT_STYLE,
}: {
  emotion: Emotion;
  onPress: (emotion: Emotion) => void;
  selected: boolean;
  style?: ChipStyle;
}) => {
  const colorScheme = useColorScheme();
  const isInk = useFeatureFlag("chip-active-ink");
  // Inverted selected fill: draw the icon for the opposite surface.
  const invertedSurface = colorScheme === "light" ? "dark" : "light";

  return (
    <Chip
      fill
      label={emotion.label}
      accessibilityHint={emotion.description}
      selected={selected}
      onPress={() => onPress(emotion)}
      lead={<EmotionIndicator emotion={emotion} size={CHIP.lead} />}
      leadSelected={
        isInk ? undefined : (
          <EmotionIndicator
            emotion={emotion}
            size={CHIP.lead}
            surface={invertedSurface}
          />
        )
      }
      style={style}
    />
  );
};
