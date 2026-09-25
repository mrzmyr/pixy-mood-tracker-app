import { useEffect, useState } from "react";
import { Keyboard, Platform, View } from "react-native";
import { ArrowRight, Check } from "react-native-feather";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { FloatButton } from "../../FloatButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ON_EVENT_NAME =
  Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const OFF_EVENT_NAME =
  Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

/**
 * Floating next/save button of the logger. It moves above the keyboard
 * while the keyboard is open; `hidden` renders nothing.
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
  const haptics = useHaptics();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const r1 = Keyboard.addListener(ON_EVENT_NAME, (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const r2 = Keyboard.addListener(OFF_EVENT_NAME, () => setKeyboardHeight(0));

    return () => {
      r1.remove();
      r2.remove();
    };
  }, []);

  if (type === "hidden") {
    return null;
  }

  const bottom = keyboardHeight
    ? Math.round(keyboardHeight) - (Platform.OS === "ios" ? 20 : 0)
    : 0;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "flex-end",
        alignItems: "flex-end",
        paddingBottom: insets.bottom + 16,
        paddingRight: 32,
        position: "absolute",
        bottom,
        right: 0,
        zIndex: 999,
      }}
    >
      <FloatButton
        testID={`logger-${type}`}
        onPress={async () => {
          if (disabled) {
            return;
          }
          await haptics.selection();
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
    </View>
  );
};
