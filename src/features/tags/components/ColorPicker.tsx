import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "react-native-feather";
import { TAG_COLOR_NAMES } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";

const styles = StyleSheet.create({
  label: { fontSize: 17, fontWeight: "600", marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  target: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderRadius: 24,
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

/** Fixed tag palette. Targets stay 48 points wide and wrap without shrinking. */
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

  return (
    <View>
      <Text
        accessibilityRole="header"
        style={[styles.label, { color: colors.text }]}
      >
        {t("color")}: {t(`tag_color_${value}`)}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("color")}
        style={styles.grid}
      >
        {TAG_COLOR_NAMES.map((color) => {
          const isSelected = value === color;
          return (
            <Pressable
              key={color}
              accessibilityLabel={t(`tag_color_${color}`)}
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
          );
        })}
      </View>
    </View>
  );
};
