import { Camera, ImagePlus } from "lucide-react-native";
import { useEffect, useEffectEvent, useMemo } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { MAX_PHOTOS_PER_ENTRY } from "@/features/photos";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

const BUTTON_SIZE = 44;
const ICON_SIZE = 24;
const DISABLED_OPACITY = 0.4;
const PULSE_SCALE = 1.2;
const PULSE_STEP_MS = 300;
const PULSE_COUNT = 3;
// Waits for the slide transition to end, so the pulse is seen.
const PULSE_DELAY_MS = 400;

/**
 * Runs the one-time hint pulse on the add-photo button. The caller decides
 * when; reduce motion is checked before `isPulsing` turns `true`.
 * `onPulseEnd` runs only when the pulse played in full.
 */
const usePulse = ({
  isPulsing,
  onPulseEnd,
}: {
  isPulsing: boolean;
  onPulseEnd: () => void;
}) => {
  const scale = useMemo(() => new Animated.Value(1), []);

  // Effect event: the latest callback, without restarting the pulse.
  const handlePulseEnd = useEffectEvent(onPulseEnd);

  useEffect(() => {
    if (!isPulsing) {
      return;
    }
    const step = (toValue: number) =>
      Animated.timing(scale, {
        toValue,
        duration: PULSE_STEP_MS,
        useNativeDriver: true,
      });
    const pulse = Animated.sequence([
      Animated.delay(PULSE_DELAY_MS),
      Animated.loop(Animated.sequence([step(PULSE_SCALE), step(1)]), {
        iterations: PULSE_COUNT,
      }),
    ]);
    pulse.start(({ finished }) => {
      if (finished) {
        handlePulseEnd();
      } else {
        scale.setValue(1);
      }
    });
    return () => pulse.stop();
  }, [isPulsing, scale]);

  return scale;
};

const ToolbarButton = ({
  label,
  testID,
  disabled,
  onPress,
  children,
}: {
  label: string;
  testID: string;
  disabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    testID={testID}
    style={({ pressed }) => ({
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      alignItems: "center",
      justifyContent: "center",
      opacity: pressed ? 0.6 : 1,
    })}
  >
    {children}
  </Pressable>
);

/**
 * Photo row under the note input: add from library, take photo, and the
 * "3 of 6" count once the draft has photos. Both buttons turn off at 40%
 * opacity when the entry is full or while an add runs.
 *
 * `reservedEnd` keeps the row clear of the floating next/save button.
 */
export const PhotoToolbar = ({
  count,
  disabled,
  isPulsing,
  reservedEnd,
  onPulseEnd,
  onLibrary,
  onCamera,
}: {
  count: number;
  disabled: boolean;
  /** Plays the one-time hint pulse on the add-photo button. */
  isPulsing: boolean;
  reservedEnd: number;
  /** The hint pulse played in full. */
  onPulseEnd: () => void;
  onLibrary: () => void;
  onCamera: () => void;
}) => {
  const colors = useColors();
  const scale = usePulse({ isPulsing, onPulseEnd });
  const isFull = count >= MAX_PHOTOS_PER_ENTRY;
  const isDisabled = disabled || isFull;
  const iconColor = isPulsing ? colors.tint : colors.textSecondary;

  return (
    <View
      testID="log-photo-toolbar"
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: BUTTON_SIZE,
        marginLeft: -10,
        paddingRight: reservedEnd,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          opacity: isDisabled ? DISABLED_OPACITY : 1,
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <ToolbarButton
            label={t("photos_add")}
            testID="log-photo-library"
            disabled={isDisabled}
            onPress={onLibrary}
          >
            <ImagePlus color={iconColor} size={ICON_SIZE} />
          </ToolbarButton>
        </Animated.View>
        <ToolbarButton
          label={t("photos_take_photo")}
          testID="log-photo-camera"
          disabled={isDisabled}
          onPress={onCamera}
        >
          <Camera color={colors.textSecondary} size={ICON_SIZE} />
        </ToolbarButton>
      </View>
      {count > 0 && (
        <Text
          testID="log-photo-count"
          style={{
            flex: 1,
            textAlign: "right",
            color: colors.textSecondary,
            fontSize: 15,
            fontVariant: ["tabular-nums"],
          }}
        >
          {t("photos_count_of", { count, max: MAX_PHOTOS_PER_ENTRY })}
        </Text>
      )}
    </View>
  );
};
