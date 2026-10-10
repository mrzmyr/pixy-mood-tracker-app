import { useEffect, useState } from "react";
import { Keyboard, Platform, View } from "react-native";
import { ArrowRight, Check } from "react-native-feather";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { FloatButton } from "@/components/FloatButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

// Feather has no keyboard icon. Drawn in Feather's 24 px grid and 2 px
// stroke: keyboard with a down chevron, like iOS "hide keyboard".
const KeyboardHideIcon = ({ color }: { color: string }) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Rect x={2} y={2} width={20} height={13} rx={2} />
    <Path d="M6 6.5h.01M10 6.5h.01M14 6.5h.01M18 6.5h.01M8 11h8" />
    <Path d="M9 19l3 3 3-3" />
  </Svg>
);

const ON_EVENT_NAME =
  Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const OFF_EVENT_NAME =
  Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

/**
 * Floating next/save button of the logger. It moves above the keyboard
 * while the keyboard is open, with a hide keyboard button next to it;
 * `hidden` renders nothing.
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
        flexDirection: "row",
        gap: 12,
      }}
    >
      {keyboardHeight > 0 && (
        <FloatButton
          testID="logger-hide-keyboard"
          accessibilityLabel={t("a11y_hide_keyboard")}
          onPress={() => Keyboard.dismiss()}
        >
          <KeyboardHideIcon color={colors.primaryButtonText} />
        </FloatButton>
      )}
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
    </View>
  );
};
