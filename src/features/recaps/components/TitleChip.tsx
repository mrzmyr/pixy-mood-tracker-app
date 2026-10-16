import { Fragment } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { getTypeMetrics } from "@/components/typeMetrics";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { CHIP } from "../chipMarker";

/**
 * Emotion or tag inside a card title: marker plus name, on the chip surface
 * of the check-in. Sits inline, so the title wraps around it.
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
        gap: 6,
        paddingHorizontal: 10,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.tagBackground,
        transform: [{ translateY: 4 }],
      }}
    >
      {marker}
      <Text style={{ fontSize, fontWeight, color: colors.text }}>{label}</Text>
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
