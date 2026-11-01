import { Fragment } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { getTypeMetrics } from "@/components/type-metrics";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { EmotionIndicator, EMOTIONS } from "@/features/logger";
import type { Tag } from "@/features/tags";
import { tDynamic } from "@/lib/translation";
import { CHIP } from "../chip-marker";

/**
 * Emotion or tag inside a card title: marker plus name on the muted gray.
 * No border, so it does not read as a tappable tag. Sits inline, so the
 * title wraps around it.
 */
export const TitleChip = ({
  marker,
  label,
}: {
  marker: ReactNode;
  label: string;
}) => {
  const colors = useColors();
  const { title } = getTypeMetrics();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 8,
        borderRadius: RADIUS.full,
        backgroundColor: colors.recapMutedBackground,
        // Inline views sit on the line bottom; this moves the chip text onto
        // the title baseline.
        transform: [{ translateY: 4 }],
      }}
    >
      {marker}
      <Text
        style={{
          // oxlint-disable-next-line pixy-standards/typography-components -- matches the platform `Title` of the recap card it sits inline in
          fontSize: title.fontSize,
          fontWeight: title.fontWeight,
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

const TagDot = ({ tag }: { tag: Tag }) => {
  const colors = useColors();
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 2,
        backgroundColor: colors.tags[tag.color]?.dot,
      }}
    />
  );
};

/** Tag with its color dot, as a title chip. */
export const TagChip = ({ tag }: { tag: Tag }) => (
  <TitleChip marker={<TagDot tag={tag} />} label={tag.title} />
);

/**
 * Tag or emotion in a card row or list: same gray chip as in titles, at body
 * size. Replaces the colored check-in tag, which competes with the chart
 * colors on a white card.
 */
export const RowChip = ({
  marker,
  label,
}: {
  marker: ReactNode;
  label: string;
}) => {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        flexShrink: 1,
        gap: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
        borderCurve: "continuous",
        backgroundColor: colors.recapMutedBackground,
      }}
    >
      {marker}
      <Text
        numberOfLines={1}
        style={{
          ...getTypeMetrics().secondary,
          flexShrink: 1,
          color: colors.text,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

/** Tag as a gray row chip with its color dot. */
export const RowTagChip = ({ tag }: { tag: Tag }) => (
  <RowChip marker={<TagDot tag={tag} />} label={tag.title} />
);

/** Emotion as a gray row chip with its category marker. */
export const RowEmotionChip = ({ emotionKey }: { emotionKey: string }) => {
  const emotion = EMOTIONS.find((item) => item.key === emotionKey);
  return emotion ? (
    <RowChip
      marker={<EmotionIndicator emotion={emotion} compact />}
      label={tDynamic(`log_emotion_${emotion.key}`)}
    />
  ) : null;
};
