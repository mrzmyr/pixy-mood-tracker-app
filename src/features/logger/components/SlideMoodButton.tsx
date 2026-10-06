import { useSetting } from "@/state/settings";
import { Dimensions, Pressable, View } from "react-native";
import { Check } from "react-native-feather";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import type { LogItem } from "@/features/logs";
import useScale from "@/hooks/useScale";
import { BEZEL, getBezelEdgeColor, getBezelRadius } from "@/constants/Bezel";
import { getRatingLabel } from "@/lib/ratingLabel";
import { RADIUS } from "@/constants/Radius";

const SCREEN_HEIGHT = Dimensions.get("screen").height;

/**
 * Rating button on the mood slide, colored from the user's scale. Height
 * scales with the screen height measured at module load.
 */
export const SlideMoodButton = ({
  rating,
  selected,
  onPress,
}: {
  rating: LogItem["rating"];
  selected: boolean;
  onPress: () => void;
}) => {
  const haptics = useHaptics();
  const scaleType = useSetting("scaleType");
  const scale = useScale(scaleType);
  const colors = useColors();
  const { background } = scale.colors[rating];

  const height = Math.max(40, (SCREEN_HEIGHT * 0.48) / 7);
  const width = height * 2.4;

  return (
    <Pressable
      testID={`mood-${rating}`}
      accessibilityRole="radio"
      accessibilityLabel={getRatingLabel(rating)}
      accessibilityState={{ selected }}
      onPress={async () => {
        await haptics.selection();
        onPress();
      }}
      // Bezel shell keeps the button size; the mood color is the inner
      // surface.
      style={({ pressed }) => ({
        padding: BEZEL.gap,
        borderRadius: getBezelRadius(RADIUS.sm, BEZEL.gap),
        borderWidth: BEZEL.borderWidth,
        borderColor: colors.bezelBorder,
        backgroundColor: colors.bezelBackground,
        boxShadow: colors.bezelShadow,
        marginBottom: 8,
        width,
        height,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: RADIUS.sm,
          borderWidth: BEZEL.borderWidth,
          borderColor: getBezelEdgeColor(background),
          backgroundColor: background,
        }}
      >
        <Check
          color={selected ? scale.colors[rating].text : "transparent"}
          width={24}
          height={24}
        />
      </View>
    </Pressable>
  );
};
