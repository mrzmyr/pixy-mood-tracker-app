import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Check } from "react-native-feather";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import { TAG_COLOR_NAMES } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t, tDynamic } from "@/lib/translation";

const TARGET_SIZE = 48;
const GAP = 8;

const styles = StyleSheet.create({
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
    borderWidth: 2,
    borderRadius: TARGET_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});

/**
 * Fixed tag palette in a grouped section, like iOS Reminders list colors.
 * Columns spread across the card width. Targets stay 48 points and never shrink.
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
  const [gridWidth, setGridWidth] = useState(0);

  const columns = Math.max(
    1,
    Math.floor((gridWidth + GAP) / (TARGET_SIZE + GAP))
  );
  const cellWidth = gridWidth > 0 ? gridWidth / columns : TARGET_SIZE + GAP;

  return (
    <View>
      <MenuListHeadline style={{ marginTop: 8 }}>
        {t("color")}: {tDynamic(`tag_color_${value}`)}
      </MenuListHeadline>
      <MenuList style={styles.card}>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t("color")}
          onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
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
                    {
                      borderColor:
                        isSelected || focusedColor === color
                          ? colors.text
                          : "transparent",
                      opacity: pressed ? 0.7 : 1,
                    },
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
                      styles.swatch,
                      { backgroundColor: colors.tags[color].dot },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.check,
                          { backgroundColor: colors.palette.white },
                        ]}
                      >
                        <Check
                          width={16}
                          height={16}
                          color={colors.palette.black}
                        />
                      </View>
                    )}
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
