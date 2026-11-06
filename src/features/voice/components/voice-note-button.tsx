import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  KeyboardState,
  useAnimatedKeyboard,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import Mic from "lucide-react-native/icons/mic";
import Pause from "lucide-react-native/icons/pause";
import { FLOAT_BUTTON_SIZE } from "@/constants/float-button";
import { SHADOW } from "@/constants/shadow";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { showToast } from "@/lib/toast";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { blockedCopy } from "../blocked-copy";
import { useVoiceTranscription } from "../use-voice-transcription";
import { VoiceWaveform } from "./voice-waveform";

const HAS_GLASS = Platform.OS === "ios" && isGlassEffectAPIAvailable();
const IS_ANDROID = Platform.OS === "android";
const SIZE = FLOAT_BUTTON_SIZE;
const RADIUS = IS_ANDROID ? 16 : SIZE / 2;
// Space to the logger save button below, same as the calendar float buttons.
const GAP = 12;
// Same keyboard handling as `SlideAction`, so both buttons move together.
const KEYBOARD_OVERLAP = Platform.OS === "ios" ? 20 : 0;
const SETTLE_DURATION = 120;

/** Test ID of the button, for `TextWrap` and e2e flows. */
export const VOICE_NOTE_BUTTON_TEST_ID = "logger-voice-note";

const joinNote = (note: string, spoken: string) => {
  if (spoken === "") {
    return note;
  }
  if (note.trim() === "") {
    return spoken;
  }
  return /\s$/u.test(note) ? `${note}${spoken}` : `${note} ${spoken}`;
};

/**
 * Mic button above the logger save button. Tap: listens on device and
 * appends the spoken words to the note, live. Tap again: stops. The parent
 * shows `onText` text in the note input while listening.
 */
export const VoiceNoteButton = ({
  getNote,
  onStart,
  onText,
  onStop,
}: {
  /** Current note text, read when listening starts. */
  getNote: () => string;
  /** Listening starts. Dismiss the keyboard here. */
  onStart: () => void;
  /** Full note text with the spoken words, on every result. */
  onText: (note: string) => void;
  /** Listening ends with this full note text. */
  onStop: (note: string) => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const analytics = useAnalytics();
  const keyboard = useAnimatedKeyboard();
  // Note before this session, and transcript length before it. The hook
  // keeps the transcript of earlier sessions, so each session reads only
  // the text after `spokenOffset`.
  const [session, setSession] = useState({
    note: "",
    spokenOffset: 0,
    startedAt: 0,
  });

  const voice = useVoiceTranscription({
    onPermissionDenied: (kind) => {
      analytics.track("voice:permission_denied", { kind });
      const copy = blockedCopy("denied", undefined);
      showToast({
        title: copy.title,
        message: copy.body,
        action: {
          label: t("voice_open_settings"),
          onPress: () => Linking.openSettings(),
        },
      });
    },
    onFailed: (error) => {
      analytics.track("voice:failed", { status: error.status });
      const copy = blockedCopy("failed", error.status);
      showToast({ title: copy.title, message: copy.body });
    },
  });

  const isRunning =
    voice.status === "requesting" ||
    voice.status === "preparing" ||
    voice.status === "listening";
  const spoken = voice.text.slice(session.spokenOffset).trim();
  const note = joinNote(session.note, spoken);

  const callbacks = useRef({ onText, onStop });
  useEffect(() => {
    callbacks.current = { onText, onStop };
  }, [onText, onStop]);

  useEffect(() => {
    if (isRunning) {
      callbacks.current.onText(note);
    }
  }, [isRunning, note]);

  // Failure or denied permission ends the session with the words so far.
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !isRunning && voice.status !== "paused") {
      callbacks.current.onStop(note);
    }
    wasRunning.current = isRunning;
  }, [isRunning, note, voice.status]);

  const start = () => {
    setSession({
      note: getNote(),
      spokenOffset: voice.text.length,
      startedAt: Date.now(),
    });
    haptics.selection();
    onStart();
    analytics.track("voice:note_started");
    // Permissions are asked on the first start and after a failure.
    if (voice.status === "paused") {
      voice.resume();
    } else {
      voice.start();
    }
  };

  const stop = () => {
    const text = voice.stop();
    const sessionSpoken = text.slice(session.spokenOffset).trim();
    wasRunning.current = false;
    haptics.selection();
    analytics.track("voice:note_finished", {
      duration_ms: Date.now() - session.startedAt,
      transcript_length: sessionSpoken.length,
    });
    onStop(joinNote(session.note, sessionSpoken));
  };

  const keyboardStyle = useAnimatedStyle(() => {
    const lift = -Math.max(keyboard.height.get() - KEYBOARD_OVERLAP, 0);
    const settled = keyboard.state.get() === KeyboardState.OPEN;
    return {
      transform: [
        {
          translateY: settled
            ? withTiming(lift, { duration: SETTLE_DURATION })
            : lift,
        },
      ],
    };
  });

  const Icon = isRunning ? Pause : Mic;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          right: 32,
          bottom: insets.bottom + 16 + SIZE + GAP,
          flexDirection: "row",
          alignItems: "center",
          gap: GAP,
          zIndex: 999,
        },
        keyboardStyle,
      ]}
    >
      {isRunning && (
        <VoiceWaveform
          getLevel={voice.getLevel}
          isActive={voice.status === "listening"}
          color={colors.primaryButtonBackground}
        />
      )}
      <Pressable
        testID={VOICE_NOTE_BUTTON_TEST_ID}
        accessibilityRole="button"
        accessibilityLabel={isRunning ? t("voice_pause") : t("voice_note")}
        onPress={isRunning ? stop : start}
        android_ripple={{ color: "rgba(0, 0, 0, 0.12)", foreground: true }}
        style={({ pressed }) => ({
          width: SIZE,
          height: SIZE,
          borderRadius: RADIUS,
          opacity: !HAS_GLASS && !IS_ANDROID && pressed ? 0.7 : 1,
          ...(IS_ANDROID && {
            backgroundColor: colors.tertiaryButtonBackground,
            boxShadow: SHADOW.float,
            overflow: "hidden",
          }),
        })}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: RADIUS,
              justifyContent: "center",
              alignItems: "center",
            },
            !HAS_GLASS &&
              !IS_ANDROID && {
                backgroundColor: colors.tertiaryButtonBackground,
                boxShadow: SHADOW.float,
              },
          ]}
        >
          {HAS_GLASS && (
            <GlassView
              isInteractive
              style={[StyleSheet.absoluteFill, { borderRadius: RADIUS }]}
            />
          )}
          <Icon width={22} height={22} color={colors.tertiaryButtonText} />
        </View>
      </Pressable>
    </Animated.View>
  );
};
