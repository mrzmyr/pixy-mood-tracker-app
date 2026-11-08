import { useState } from "react";
import { ScrollView, View } from "react-native";
import { EdgeFade } from "@/components/edge-fade";
import { getScrollEdges } from "@/lib/scroll-edges";
import { TAG_COLOR_NAMES } from "@/constants/config";
import { SPACE } from "@/constants/space";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { Tag } from "../tags-provider";
import {
  ColorSwatch,
  SWATCH_DOT_SIZE,
  SWATCH_TARGET_SIZE,
} from "./color-picker";

/** Row inset so the first dot, not its target, lines up with the screen edge. */
const INSET = SPACE.lg - (SWATCH_TARGET_SIZE - SWATCH_DOT_SIZE) / 2;
/** Colors left of the selected one when the row opens. */
const LEAD_COLORS = 2;

/**
 * Tag colors in one row that scrolls sideways, with edge fades. Opens
 * scrolled to the selected color.
 */
export const TagColorRow = ({
  value,
  onChange,
}: {
  value: Tag["color"];
  onChange: (color: Tag["color"]) => void;
}) => {
  const colors = useColors();
  // Opens scrolled to the selected color, so the left fade shows from the start.
  // contentOffset applies on mount only, so later color picks do not scroll.
  const initialOffset = Math.max(
    0,
    (TAG_COLOR_NAMES.indexOf(value) - LEAD_COLORS) * SWATCH_TARGET_SIZE
  );
  const [edges, setEdges] = useState({
    isAtStart: initialOffset === 0,
    isAtEnd: false,
  });

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        accessibilityLabel={t("color")}
        contentContainerStyle={{ paddingHorizontal: INSET }}
        scrollEventThrottle={32}
        onScroll={(event) => setEdges(getScrollEdges(event, "x"))}
        contentOffset={{ x: initialOffset, y: 0 }}
      >
        {TAG_COLOR_NAMES.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            isSelected={value === color}
            onSelect={() => onChange(color)}
          />
        ))}
      </ScrollView>
      <EdgeFade
        edge="left"
        isVisible={!edges.isAtStart}
        color={colors.logBackground}
        transparentColor={colors.logBackgroundTransparent}
      />
      <EdgeFade
        edge="right"
        isVisible={!edges.isAtEnd}
        color={colors.logBackground}
        transparentColor={colors.logBackgroundTransparent}
      />
    </View>
  );
};
