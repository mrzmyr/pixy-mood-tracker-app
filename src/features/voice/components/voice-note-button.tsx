import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  KeyboardState,
  SlideInDown,
  SlideOutDown,
  useAnimatedKeyboard,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import Mic from "lucide-react-native/icons/mic";
import { FLOAT_BUTTON_SIZE } from "@/constants/float-button";
import { DURATION, getEasing } from "@/constants/motion";
import { SHADOW } from "@/constants/shadow";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { showToast } from "@/lib/toast";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { blockedCopy } from "../blocked-copy";
import { useVoiceTranscription } from "../use-voice-transcription";
import { VoiceInputPill } from "./voice-input-pill";

const HAS_GLASS = Platform.OS === "ios" && isGlassEffectAPIAvailable();
const IS_ANDROID = Platform.OS === "android";
const SIZE = FLOAT_BUTTON_SIZE;
const RADIUS = IS_ANDROID ? 16 : SIZE / 2;
// Space to the logger save button below, same as the calendar float buttons.
const GAP = 12;
// Same keyboard handling as `SlideAction`, so both buttons move together.
const KEYBOARD_OVERLAP = Platform.OS === "ios" ? 20 : 0;
const SETTLE_DURATION = 120;
// Pill height, from `VoiceInputPill`. Centers the pill on the save button.
const PILL_HEIGHT = 64;
const PILL_INSET = 16;

/** Test ID of the mic button, for `TextWrap` and e2e flows. */
export const VOICE_NOTE_BUTTON_TEST_ID = "logger-voice-note";
/** Test ID of the voice input pill, for `TextWrap` and e2e flows. */
export const VOICE_NOTE_PILL_TEST_ID = "logger-voice-note-pill";

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
 * Mic button above the logger save button. Tap: the voice input pill slides
 * up from the bottom and the spoken words join the note, live. The pill
 * pauses, resumes, and ends with its check, then slides back down. The
 * parent shows `onText` text in the note input and hides its save button
 * while the pill shows.
 */
export const VoiceNoteButton = ({
  getNote,
  onStart,
  onText,
  onStop,
}: {
  /** Current note text, read when listening starts. */
  getNote: () => string;
  /** The pill opens. Dismiss the keyboard and hide the save button here. */
  onStart: () => void;
  /** Full note text with the spoken words, on every result. */
  onText: (note: string) => void;
  /** The pill closes with this full note text. */
  onStop: (note: string) => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const analytics = useAnalytics();
  const keyboard = useAnimatedKeyboard();
  const [isOpen, setIsOpen] = useState(false);
  const callbacks = useRef({ onText, onStop });
  // Note before this session, and transcript length before it. The hook
  // keeps the transcript of earlier sessions, so each session reads only
  // the text after `spokenOffset`.
  const [session, setSession] = useState({
    note: "",
    spokenOffset: 0,
    startedAt: 0,
  });

  // Latest full note text, for closing from the voice error callbacks.
  const latestNote = useRef("");
  // Failure or denied permission closes the pill with the words so far.
  const close = () => {
    setIsOpen(false);
    callbacks.current.onStop(latestNote.current);
  };

  const voice = useVoiceTranscription({
    onPermissionDenied: (kind) => {
      close();
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
      close();
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

  useEffect(() => {
    callbacks.current = { onText, onStop };
  }, [onText, onStop]);

  useEffect(() => {
    latestNote.current = note;
    if (isOpen) {
      callbacks.current.onText(note);
    }
  }, [isOpen, note]);

  const start = () => {
    setSession({
      note: getNote(),
      spokenOffset: voice.text.length,
      startedAt: Date.now(),
    });
    setIsOpen(true);
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

  const finish = () => {
    const text = voice.stop();
    const sessionSpoken = text.slice(session.spokenOffset).trim();
    setIsOpen(false);
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

  if (isOpen) {
    return (
      <Animated.View
        testID={VOICE_NOTE_PILL_TEST_ID}
        entering={SlideInDown.duration(DURATION.base).easing(getEasing("out"))}
        exiting={SlideOutDown.duration(DURATION.base).easing(getEasing("move"))}
        style={{
          position: "absolute",
          left: PILL_INSET,
          right: PILL_INSET,
          bottom: insets.bottom + 16 - (PILL_HEIGHT - SIZE) / 2,
          zIndex: 999,
        }}
      >
        <VoiceInputPill
          isRunning={isRunning}
          canResume={voice.status === "paused"}
          isListening={voice.status === "listening"}
          hasText={note.trim() !== ""}
          level={voice.level}
          doneLabel={t("done")}
          onPause={() => {
            haptics.selection();
            voice.pause();
          }}
          onResume={() => {
            haptics.selection();
            voice.resume();
          }}
          onDone={finish}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          right: 32,
          bottom: insets.bottom + 16 + SIZE + GAP,
          zIndex: 999,
        },
        keyboardStyle,
      ]}
    >
      <Pressable
        testID={VOICE_NOTE_BUTTON_TEST_ID}
        accessibilityRole="button"
        accessibilityLabel={t("voice_note")}
        onPress={start}
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
          <Mic width={22} height={22} color={colors.tertiaryButtonText} />
        </View>
      </Pressable>
    </Animated.View>
  );
};
