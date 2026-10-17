import { Platform } from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Check from "lucide-react-native/icons/check";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { FloatButton } from "@/components/FloatButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// iOS keyboard height includes the home indicator area, which the button
// padding already covers.
const KEYBOARD_OVERLAP = Platform.OS === "ios" ? 20 : 0;

/**
 * Floating next/save button of the logger. It follows the native keyboard
 * frame on the UI thread, so it moves in sync with the keyboard; `hidden`
 * renders nothing.
 */
export const SlideAction = ({
  type,
  disabled,
  onPress,
}: {
  type: "next" | "save" | "hidden";
  disabled?: boolean;
  onPress?: () => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const keyboard = useAnimatedKeyboard();

  const keyboardStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: -Math.max(keyboard.height.get() - KEYBOARD_OVERLAP, 0),
      },
    ],
  }));

  if (type === "hidden") {
    return null;
  }

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          justifyContent: "flex-end",
          alignItems: "flex-end",
          paddingBottom: insets.bottom + 16,
          paddingRight: 32,
          position: "absolute",
          bottom: 0,
          right: 0,
          zIndex: 999,
        },
        keyboardStyle,
      ]}
    >
      <FloatButton
        testID={`logger-${type}`}
        accessibilityLabel={type === "save" ? t("save") : t("a11y_next")}
        onPress={() => {
          if (disabled) {
            return;
          }
          onPress?.();
        }}
        disabled={disabled}
      >
        {type === "save" && (
          <Check
            color={
              disabled
                ? colors.primaryButtonTextDisabled
                : colors.primaryButtonText
            }
            width={24}
          />
        )}
        {type === "next" && (
          <ArrowRight
            color={
              disabled
                ? colors.primaryButtonTextDisabled
                : colors.primaryButtonText
            }
            width={24}
          />
        )}
      </FloatButton>
    </Animated.View>
  );
};
