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

const SCREEN_HEIGHT = Dimensions.get("screen").height;
// Share of the screen height for all 7 buttons. Compact buttons leave room
// for the attachment tray below them.
const HEIGHT_SHARE = 0.48;
const COMPACT_HEIGHT_SHARE = 0.4;

/**
 * Rating button on the mood slide, colored from the user's scale. Height
 * scales with the screen height measured at module load; `isCompact` makes
 * the button smaller.
 */
export const SlideMoodButton = ({
  rating,
  selected,
  isCompact,
  onPress,
}: {
  rating: LogItem["rating"];
  selected: boolean;
  isCompact?: boolean;
  onPress: () => void;
}) => {
  const haptics = useHaptics();
  const scaleType = useSetting("scaleType");
  const scale = useScale(scaleType);
  const colorScheme = useColorScheme();

  const share = isCompact ? COMPACT_HEIGHT_SHARE : HEIGHT_SHARE;
  const height = Math.max(40, (SCREEN_HEIGHT * share) / 7);
  const width = height * 2.4;

  return (
    <Pressable
      testID={`mood-${rating}`}
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
        borderRadius: 12,
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
        <Check
          color={selected ? scale.colors[rating].text : "transparent"}
          width={24}
          height={24}
        />
      </View>
    </Pressable>
  );
};
