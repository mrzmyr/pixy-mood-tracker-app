import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Check from "lucide-react-native/icons/check";
import MenuList from "@/components/menu-list";
import { Label } from "@/components/typography";
import { TAG_COLOR_NAMES } from "@/constants/config";
import { SPACE } from "@/constants/space";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t, tDynamic } from "@/lib/translation";

/** Touch target of one color. */
export const SWATCH_TARGET_SIZE = 48;
/** Visible dot of one color. */
export const SWATCH_DOT_SIZE = 30;
const RING_GAP = 2;
const RING_WIDTH = 2;
const RING_SIZE = SWATCH_DOT_SIZE + 2 * (RING_GAP + RING_WIDTH);
const GAP = 8;

const styles = StyleSheet.create({
  // Matches the Name label in TagNameField.
  label: { paddingBottom: 8 },
  // Android lists run edge to edge, so swatches keep Material's 16dp inset.
  card: Platform.select({
    android: { paddingHorizontal: 16, paddingVertical: 12 },
    default: { padding: 12 },
  }),
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: GAP },
  cell: { alignItems: "center" },
  target: {
    width: SWATCH_TARGET_SIZE,
    height: SWATCH_TARGET_SIZE,
    borderRadius: SWATCH_TARGET_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderWidth: RING_WIDTH,
    borderRadius: RING_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: SWATCH_DOT_SIZE,
    height: SWATCH_DOT_SIZE,
    borderRadius: SWATCH_DOT_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

/**
 * One tag color: 30 pt dot in a 48 pt target. Selected: check tinted with
 * the tag's text shade. Keyboard focus adds a ring in text color. Shared by
 * {@link ColorPicker} and the color row of the tag icon picker.
 */
export const ColorSwatch = ({
  color,
  isSelected,
  onSelect,
}: {
  color: (typeof TAG_COLOR_NAMES)[number];
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Pressable
      accessibilityLabel={tDynamic(`tag_color_${color}`)}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      testID={`tag-color-${color}`}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      android_ripple={{
        color: colors.backgroundSecondary,
        borderless: false,
      }}
      style={({ pressed }) => [styles.target, { opacity: pressed ? 0.7 : 1 }]}
      onPress={() => {
        if (isSelected) {
          return;
        }
        onSelect();
        haptics.selection();
      }}
    >
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.ring,
          { borderColor: isFocused ? colors.text : "transparent" },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: colors.tags[color].dot }]}>
          {isSelected && (
            <Check
              width={18}
              height={18}
              strokeWidth={3}
              color={colors.tags[color].text}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
};

/**
 * Fixed tag palette in a grouped card, like iOS Reminders list colors.
 * Columns spread across the card width. Targets stay 48 points and never shrink.
 * Selected color: check tinted with the tag's text shade. Keyboard focus adds
 * a ring in text color.
 */
export const ColorPicker = ({
  value,
  onChange,
}: {
  value: (typeof TAG_COLOR_NAMES)[number];
  onChange: (color: (typeof TAG_COLOR_NAMES)[number]) => void;
}) => {
  const colors = useColors();
  const [gridWidth, setGridWidth] = useState(0);

  const columns = Math.max(
    1,
    Math.floor((gridWidth + GAP) / (SWATCH_TARGET_SIZE + GAP))
  );
  const cellWidth =
    gridWidth > 0 ? gridWidth / columns : SWATCH_TARGET_SIZE + GAP;

  return (
    // Section gap to the category picker below.
    <View style={{ marginBottom: SPACE.xxl }}>
      <Label
        size={13}
        strong
        accessibilityRole="header"
        style={[styles.label, { color: colors.textSecondary }]}
      >
        {t("color")}: {tDynamic(`tag_color_${value}`)}
      </Label>
      <MenuList style={styles.card}>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t("color")}
          onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
          style={styles.grid}
        >
          {TAG_COLOR_NAMES.map((color) => (
            <View key={color} style={[styles.cell, { width: cellWidth }]}>
              <ColorSwatch
                color={color}
                isSelected={value === color}
                onSelect={() => onChange(color)}
              />
            </View>
          ))}
        </View>
      </MenuList>
    </View>
  );
};
