import { Pressable, View } from "react-native";
import { TAG_COLOR_NAMES } from "@/constants/Config";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";

const TOUCH_TARGET = 44;
const SWATCH_SIZE = 32;
const RING_GAP = 2;
const RING_WIDTH = 2;

/**
 * Tag color choice. Swatches are radio buttons with a 44 pt touch target. The
 * selected swatch gets a ring: 2 px gap, then 2 px in text color.
 */
const TagColorPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (colorName: string) => void;
}) => {
  const colors = useColors();

  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: "row", flexWrap: "wrap", width: "100%" }}
    >
      {TAG_COLOR_NAMES.map((colorName) => {
        const selected = value === colorName;

        return (
          <Pressable
            key={colorName}
            accessibilityLabel={colorName}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            testID={`tag-color-${colorName}`}
            onPress={() => onChange(colorName)}
            style={({ pressed }) => ({
              width: `${100 / 7}%`,
              minWidth: TOUCH_TARGET,
              height: TOUCH_TARGET,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                padding: RING_GAP,
                borderWidth: RING_WIDTH,
                borderRadius: RADIUS.full,
                borderColor: selected ? colors.text : "transparent",
              }}
            >
              <View
                style={{
                  width: SWATCH_SIZE,
                  height: SWATCH_SIZE,
                  borderRadius: RADIUS.full,
                  backgroundColor: colors.tags[colorName].dot,
                }}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

export default TagColorPicker;
