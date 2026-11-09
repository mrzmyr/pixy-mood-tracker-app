import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import type { SharedValue } from "react-native-reanimated";
import Check from "lucide-react-native/icons/check";
import Mic from "lucide-react-native/icons/mic";
import Pause from "lucide-react-native/icons/pause";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import { SHADOW } from "@/constants/shadow";
import { SPACE } from "@/constants/space";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { VoiceWaveform } from "./voice-waveform";

const PILL_HEIGHT = 64;
const BUTTON_SIZE = 48;
const TICK_MS = 250;
// iOS 26+: Liquid Glass capsule, like the float buttons. Elsewhere a plain
// fill with the float shadow.
const HAS_GLASS = Platform.OS === "ios" && isGlassEffectAPIAvailable();

const formatElapsed = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

/** Listening time. Counts only while listening, holds while paused. */
const useElapsed = (isListening: boolean) => {
  const [elapsed, setElapsed] = useState(0);
  const total = useRef(0);
  useEffect(() => {
    if (!isListening) {
      return;
    }
    const startedAt = Date.now();
    const base = total.current;
    const id = setInterval(() => {
      total.current = base + Date.now() - startedAt;
      setElapsed(total.current);
    }, TICK_MS);
    return () => {
      total.current = base + Date.now() - startedAt;
      clearInterval(id);
    };
  }, [isListening]);
  return elapsed;
};

/**
 * Voice mode controls in one capsule, like a chat voice input: pause or
 * resume left, scrolling waveform and listening time, done right. Waveform
 * scrolls in from the right; silence shows as dots.
 */
export const VoiceInputPill = ({
  isRunning,
  canResume,
  isListening,
  hasText,
  level,
  doneLabel = t("voice_done"),
  onPause,
  onResume,
  onDone,
}: {
  /** Listening or getting ready: the left button pauses. */
  isRunning: boolean;
  /** Paused: the left button resumes. */
  canResume: boolean;
  isListening: boolean;
  hasText: boolean;
  level: SharedValue<number>;
  /** Accessibility label of the check. */
  doneLabel?: string;
  onPause: () => void;
  onResume: () => void;
  onDone: () => void;
}) => {
  const colors = useColors();
  const elapsed = useElapsed(isListening);
  const buttonFill = colors.menuListItemBackground;

  return (
    <View
      style={{
        height: PILL_HEIGHT,
        borderRadius: RADIUS.full,
        flexDirection: "row",
        alignItems: "center",
        gap: SPACE.md,
        paddingHorizontal: SPACE.sm,
        ...(!HAS_GLASS && {
          backgroundColor: colors.background,
          boxShadow: SHADOW.float,
        }),
      }}
    >
      {HAS_GLASS && (
        <GlassView
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.full }]}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isRunning ? t("voice_pause") : t("voice_resume")}
        testID="voice-pause"
        disabled={!isRunning && !canResume}
        onPress={isRunning ? onPause : onResume}
        style={({ pressed }) => ({
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: RADIUS.full,
          alignItems: "center",
          justifyContent: "center",
          // On glass the icon sits on the capsule, like a toolbar button.
          backgroundColor: HAS_GLASS ? undefined : buttonFill,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {isRunning ? (
          <Pause
            width={22}
            height={22}
            color={colors.text}
            fill={colors.text}
          />
        ) : (
          <Mic width={22} height={22} color={colors.text} />
        )}
      </Pressable>
      <View style={{ flex: 1, overflow: "hidden", alignItems: "flex-end" }}>
        <VoiceWaveform
          level={level}
          isActive={isListening}
          color={colors.text}
        />
      </View>
      <Label
        size={14}
        style={{ color: colors.textSecondary, fontVariant: ["tabular-nums"] }}
        accessibilityElementsHidden
        importantForAccessibility="no"
        testID="voice-elapsed"
      >
        {formatElapsed(elapsed)}
      </Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={doneLabel}
        accessibilityState={{ disabled: !hasText }}
        testID="voice-done"
        disabled={!hasText}
        onPress={onDone}
        style={({ pressed }) => ({
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: RADIUS.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: hasText
            ? colors.text
            : colors.primaryButtonBackgroundDisabled,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Check width={24} height={24} color={buttonFill} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
};
