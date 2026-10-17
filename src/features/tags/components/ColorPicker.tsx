import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "react-native-feather";
import MenuList from "@/components/MenuList";
import { TAG_COLOR_NAMES } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { useMeasuredSize } from "@/hooks/useMeasuredSize";
import { t, tDynamic } from "@/lib/translation";

const TARGET_SIZE = 48;
const DOT_SIZE = 30;
const RING_GAP = 2;
const RING_WIDTH = 2;
const RING_SIZE = DOT_SIZE + 2 * (RING_GAP + RING_WIDTH);
const GAP = 8;

const styles = StyleSheet.create({
  // Matches the Name label in TagNameField.
  label: { fontSize: 13, fontWeight: "600", paddingBottom: 8 },
  // Android lists run edge to edge, so swatches keep Material's 16dp inset.
  card: Platform.select({
    android: { paddingHorizontal: 16, paddingVertical: 12 },
    default: { padding: 12 },
  }),
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: GAP },
  cell: { alignItems: "center" },
  target: {
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    borderRadius: TARGET_SIZE / 2,
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
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

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
  value: string;
  onChange: (color: string) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const [focusedColor, setFocusedColor] = useState<string | null>(null);
  // Known before the first paint, also after the Android list bleed: the
  // swatches never shift sideways.
  const {
    ref: gridRef,
    size: { width: gridWidth },
    onLayout: handleGridLayout,
  } = useMeasuredSize();

  const columns = Math.max(
    1,
    Math.floor((gridWidth + GAP) / (TARGET_SIZE + GAP))
  );
  const cellWidth = gridWidth > 0 ? gridWidth / columns : TARGET_SIZE + GAP;

  return (
    <View>
      <Text
        accessibilityRole="header"
        style={[styles.label, { color: colors.textSecondary }]}
      >
        {t("color")}: {tDynamic(`tag_color_${value}`)}
      </Text>
      <MenuList style={styles.card}>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t("color")}
          ref={gridRef}
          onLayout={handleGridLayout}
          style={styles.grid}
        >
          {TAG_COLOR_NAMES.map((color) => {
            const isSelected = value === color;
            return (
              <View key={color} style={[styles.cell, { width: cellWidth }]}>
                <Pressable
                  accessibilityLabel={tDynamic(`tag_color_${color}`)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  testID={`tag-color-${color}`}
                  onFocus={() => setFocusedColor(color)}
                  onBlur={() => setFocusedColor(null)}
                  android_ripple={{
                    color: colors.backgroundSecondary,
                    borderless: false,
                  }}
                  style={({ pressed }) => [
                    styles.target,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      return;
                    }
                    onChange(color);
                    haptics.selection();
                  }}
                >
                  <View
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                      styles.ring,
                      {
                        borderColor:
                          focusedColor === color ? colors.text : "transparent",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: colors.tags[color].dot },
                      ]}
                    >
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
              </View>
            );
          })}
        </View>
      </MenuList>
    </View>
  );
};
