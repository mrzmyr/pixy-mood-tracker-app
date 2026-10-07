import { MoodCharacter } from "@/components/MoodCharacter";
import { useSetting } from "@/state/settings";
import {
  Dimensions,
  Platform,
  Pressable,
  useColorScheme,
  View,
} from "react-native";
import { Check } from "react-native-feather";
import useHaptics from "@/hooks/useHaptics";
import type { LogItem } from "@/features/logs";
import useScale from "@/hooks/useScale";
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
  const moodTheme = useSetting("moodTheme");
  const scale = useScale(scaleType);
  const colorScheme = useColorScheme();

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
      style={({ pressed }) => ({
        backgroundColor: scale.colors[rating].background,
        borderWidth:
          Platform.OS === "android" && colorScheme === "dark" ? 0 : 1,
        borderColor:
          colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)",
        borderRadius: RADIUS.md,
        marginBottom: 8,
        width,
        height,
        opacity: pressed ? 0.8 : 1,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {moodTheme !== "classic" && (
          <MoodCharacter
            theme={moodTheme}
            rating={rating}
            color={scale.colors[rating].background}
            size={height - 4}
          />
        )}
        <Check
          style={
            moodTheme === "classic"
              ? undefined
              : { position: "absolute", right: -28 }
          }
          color={selected ? scale.colors[rating].text : "transparent"}
          width={24}
          height={24}
        />
      </View>
    </Pressable>
  );
};
