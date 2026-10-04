import { Platform, Pressable, StyleSheet } from "react-native";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import useColors from "@/hooks/useColors";

// Press feedback: 0.97 scale in 120 ms, strong ease-out. Same as the
// calendar float button.
const PRESS_MS = 120;
const PRESS_SCALE = 0.97;

// iOS 26+: native Liquid Glass with its own shadow and press response.
const HAS_GLASS = Platform.OS === "ios" && isGlassEffectAPIAvailable();
// Android: Material 3 FAB, 56 dp, 16 dp corners, elevation 6, ripple.
const IS_ANDROID = Platform.OS === "android";
const SIZE = IS_ANDROID ? 56 : 54;
const RADIUS = IS_ANDROID ? 16 : SIZE / 2;

/**
 * Primary floating action button. Liquid Glass on iOS 26, Material 3 FAB on
 * Android, soft shadow on older iOS. `disabled` only changes the color;
 * presses still call `onPress`.
 */
export const FloatButton = ({
  onPress,
  disabled,
  children,
  testID,
}: {
  onPress: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
  testID?: string;
}) => {
  const colors = useColors();
  const isReducedMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const background = disabled
    ? colors.primaryButtonBackgroundDisabled
    : colors.primaryButtonBackground;

  const setPressed = (value: 0 | 1) =>
    pressed.set(
      withTiming(value, {
        duration: PRESS_MS,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
        reduceMotion: ReduceMotion.Never,
      })
    );

  // Glass and ripple bring their own press response. Elsewhere reduced
  // motion dims instead of scaling.
  const ownsPress = !HAS_GLASS && !IS_ANDROID;
  const pressStyle = useAnimatedStyle(() => ({
    opacity: ownsPress && isReducedMotion ? 1 - pressed.get() * 0.3 : 1,
    transform: [
      {
        scale:
          !ownsPress || isReducedMotion
            ? 1
            : interpolate(pressed.get(), [0, 1], [1, PRESS_SCALE]),
      },
    ],
  }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => setPressed(1)}
      onPressOut={() => setPressed(0)}
      android_ripple={{ color: "rgba(255, 255, 255, 0.24)", foreground: true }}
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: RADIUS,
        // Android draws elevation from the background and clips the ripple.
        ...(IS_ANDROID && {
          backgroundColor: background,
          elevation: 6,
          overflow: "hidden",
        }),
      }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: RADIUS,
            justifyContent: "center",
            alignItems: "center",
          },
          !HAS_GLASS &&
            !IS_ANDROID && {
              backgroundColor: background,
              shadowColor: "#000",
              shadowOpacity: 0.16,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            },
          pressStyle,
        ]}
      >
        {HAS_GLASS && (
          <GlassView
            isInteractive
            tintColor={background}
            style={[StyleSheet.absoluteFill, { borderRadius: RADIUS }]}
          />
        )}
        {children}
      </Animated.View>
    </Pressable>
  );
};
