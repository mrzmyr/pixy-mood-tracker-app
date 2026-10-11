import { Fragment } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { getTypeMetrics } from "@/components/typeMetrics";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { EmotionIndicator, EMOTIONS } from "@/features/logger";
import type { Tag } from "@/features/tags";
import { tDynamic } from "@/lib/translation";
import { CHIP } from "../chipMarker";

/**
 * Emotion or tag inside a card title: marker plus name on a faint text-color
 * tint. No border, so it does not read as a tappable tag. Sits inline, so
 * the title wraps around it.
 */
export const TitleChip = ({
  marker,
  label,
}: {
  marker: ReactNode;
  label: string;
}) => {
  const colors = useColors();
  const { fontSize, fontWeight } = getTypeMetrics().title;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 8,
        borderRadius: RADIUS.full,
        backgroundColor: colors.titleChipBackground,
        // Inline views sit on the line bottom; this moves the chip text onto
        // the title baseline.
        transform: [{ translateY: 4 }],
      }}
    >
      {marker}
      <Text
        style={{
          fontSize,
          fontWeight,
          letterSpacing: -0.25,
          color: colors.text,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

/** `text` with `chip` placed where it holds {@link CHIP}. */
export const ChipText = ({ text, chip }: { text: string; chip: ReactNode }) => (
  <>
    {text.split(CHIP).map((part, index) => (
      // Parts never reorder; the index is their identity.
      // oxlint-disable-next-line react/no-array-index-key -- see comment above.
      <Fragment key={index}>
        {index > 0 && chip}
        {part}
      </Fragment>
    ))}
  </>
);

/** Emotion with its category marker, as a title chip. */
export const EmotionChip = ({ emotionKey }: { emotionKey: string }) => {
  const emotion = EMOTIONS.find((item) => item.key === emotionKey);
  return emotion ? (
    <TitleChip
      marker={<EmotionIndicator emotion={emotion} compact />}
      label={tDynamic(`log_emotion_${emotion.key}`)}
    />
  ) : null;
};

/** Tag with its color dot, as a title chip. */
export const TagChip = ({ tag }: { tag: Tag }) => {
  const colors = useColors();
  return (
    <TitleChip
      marker={
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: RADIUS.sm,
            backgroundColor: colors.tags[tag.color]?.dot,
          }}
        />
      }
      label={tag.title}
    />
  );
};
