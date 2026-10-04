import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { X } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import useScale from "@/hooks/useScale";
import { t } from "@/lib/translation";
import { useSetting } from "@/state/settings";
import type { FeedbackSource } from "@/types/Feedback";
import { useFeedback } from "../Feedback";
import { PixelBurst } from "./PixelBurst";

const MOODS = ["good", "mixed", "hard"] as const;
type Mood = (typeof MOODS)[number];

/** How long the thank-you stays before the sheet closes itself. */
const SUCCESS_CLOSE_MS = 1800;

const MoodChip = ({
  mood,
  selected,
  onPress,
}: {
  mood: Mood;
  selected: boolean;
  onPress: () => void;
}) => {
  const colors = useColors();
  const scale = useScale(useSetting("scaleType"));
  const dot = {
    good: scale.colors.very_good.background,
    mixed: scale.colors.neutral.background,
    hard: scale.colors.very_bad.background,
  }[mood];
  const label = t(`request_emotion_mood_${mood}`);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      testID={`request-emotion-mood-${mood}`}
      onPress={onPress}
      hitSlop={6}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: selected ? 2 : 1,
        margin: selected ? 0 : 1,
        borderColor: selected ? colors.tint : colors.menuListItemBorder,
        backgroundColor: colors.logCardBackground,
      }}
    >
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }}
      />
      <Text style={{ fontSize: 15, color: colors.text }}>{label}</Text>
    </Pressable>
  );
};

const SentMessage = () => {
  const colors = useColors();
  const isReducedMotion = useReducedMotion();

  return (
    <View
      testID="request-emotion-sent"
      style={{ alignItems: "center", paddingVertical: 32 }}
    >
      {!isReducedMotion && <PixelBurst />}
      <Text
        accessibilityLiveRegion="polite"
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
        }}
      >
        {t("request_emotion_success_title")}
      </Text>
      <Text
        style={{
          marginTop: 6,
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: "center",
        }}
      >
        {t("request_emotion_success_message")}
      </Text>
    </View>
  );
};

const SheetHeader = ({ onClose }: { onClose: () => void }) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ fontSize: 22, fontWeight: "700", color: colors.text }}
      >
        {t("request_emotion_title")}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("cancel")}
        testID="request-emotion-close"
        onPress={onClose}
        hitSlop={12}
        style={({ pressed }) => ({
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.textInputBackground,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <X width={18} height={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
};

const ReplyFields = ({
  wantsReply,
  onWantsReplyChange,
  email,
  onEmailChange,
}: {
  wantsReply: boolean;
  onWantsReplyChange: (next: boolean) => void;
  email: string;
  onEmailChange: (next: string) => void;
}) => {
  const colors = useColors();

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          minHeight: 44,
        }}
      >
        <Text style={{ fontSize: 15, color: colors.text }}>
          {t("request_emotion_reply")}
        </Text>
        <Switch
          testID="request-emotion-reply"
          accessibilityLabel={t("request_emotion_reply")}
          value={wantsReply}
          onValueChange={onWantsReplyChange}
        />
      </View>
      {wantsReply && (
        <TextInput
          testID="request-emotion-email"
          accessibilityLabel={t("feedback_modal_email_placeholder")}
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={onEmailChange}
          placeholder={t("feedback_modal_email_placeholder")}
          placeholderTextColor={colors.textInputPlaceholder}
          style={{
            marginTop: 4,
            backgroundColor: colors.textInputBackground,
            borderRadius: 10,
            padding: 14,
            fontSize: 17,
            color: colors.text,
          }}
        />
      )}
    </>
  );
};

const SheetContent = ({
  source,
  onClose,
}: {
  source: FeedbackSource;
  onClose: () => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const feedback = useFeedback();
  const isReducedMotion = useReducedMotion();

  const [word, setWord] = useState("");
  const [mood, setMood] = useState<Mood>("mixed");
  const [isWhyOpen, setIsWhyOpen] = useState(false);
  const [wantsReply, setWantsReply] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">(
    "idle"
  );

  // KeyboardAvoidingView does not lift content inside a transparent Modal on
  // iOS, so the panel follows the keyboard frame itself. Android resizes.
  // Focus only after subscribing, else the first keyboard event is missed.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const wordRef = useRef<TextInput>(null);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", (event) =>
      setKeyboardHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener("keyboardWillHide", () =>
      setKeyboardHeight(0)
    );
    const frame = requestAnimationFrame(() => wordRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      show.remove();
      hide.remove();
    };
  }, []);

  // Slide in with a transform: a layout `entering` animation would freeze the
  // panel's layout and ignore the keyboard padding.
  const offset = useSharedValue(isReducedMotion ? 0 : 400);
  useEffect(() => {
    offset.set(withSpring(0, { damping: 22 }));
  }, [offset]);
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() }],
  }));

  useEffect(() => {
    if (status !== "sent") {
      return;
    }
    const timer = setTimeout(onClose, SUCCESS_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [status, onClose]);

  const send = async () => {
    setStatus("sending");
    await feedback.send({
      type: "emotion",
      source,
      message: word.trim(),
      email: wantsReply && email.trim() ? email.trim() : undefined,
      details: { mood },
      onOk: () => {
        haptics.success();
        setStatus("sent");
      },
      onCancel: () => setStatus("failed"),
    });
  };

  const canSend = word.trim().length > 0 && status !== "sending";

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "flex-end",
        paddingBottom: Platform.OS === "ios" ? keyboardHeight : 0,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("cancel")}
        testID="request-emotion-scrim"
        onPress={close}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
      />
      <Animated.View
        accessibilityViewIsModal
        style={[
          slideStyle,
          {
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom:
              Platform.OS === "ios" && keyboardHeight > 0
                ? 16
                : insets.bottom + 16,
          },
        ]}
      >
        <View
          style={{
            alignSelf: "center",
            width: 36,
            height: 5,
            borderRadius: 3,
            backgroundColor: colors.menuListItemBorder,
            marginBottom: 14,
          }}
        />
        {status === "sent" ? (
          <SentMessage />
        ) : (
          <>
            <SheetHeader onClose={close} />
            <Text
              style={{
                marginTop: 4,
                fontSize: 15,
                color: colors.textSecondary,
              }}
            >
              {t("request_emotion_subtitle")}
            </Text>
            <TextInput
              testID="request-emotion-word"
              accessibilityLabel={t("request_emotion_subtitle")}
              ref={wordRef}
              maxLength={40}
              returnKeyType="done"
              value={word}
              onChangeText={setWord}
              placeholder={t("request_emotion_placeholder")}
              placeholderTextColor={colors.textInputPlaceholder}
              style={{
                marginTop: 16,
                backgroundColor: colors.textInputBackground,
                borderRadius: 10,
                padding: 14,
                fontSize: 17,
                color: colors.text,
              }}
            />
            <View
              accessibilityRole="radiogroup"
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                marginTop: 12,
              }}
            >
              {MOODS.map((option) => (
                <MoodChip
                  key={option}
                  mood={option}
                  selected={mood === option}
                  onPress={() => setMood(option)}
                />
              ))}
            </View>
            <LinkButton
              testID="request-emotion-why"
              onPress={() => setIsWhyOpen((open) => !open)}
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 0,
                marginTop: 8,
                fontWeight: "400",
              }}
            >
              {t("request_emotion_why")}
            </LinkButton>
            {isWhyOpen && (
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 20,
                  color: colors.textSecondary,
                }}
              >
                {t("request_emotion_description")}
              </Text>
            )}
            <ReplyFields
              wantsReply={wantsReply}
              onWantsReplyChange={setWantsReply}
              email={email}
              onEmailChange={setEmail}
            />
            {status === "failed" && (
              <Text
                accessibilityLiveRegion="polite"
                testID="request-emotion-error"
                style={{ marginTop: 12, fontSize: 15, color: colors.text }}
              >
                {t("request_emotion_error")}
              </Text>
            )}
            <Button
              testID="request-emotion-send"
              disabled={!canSend}
              onPress={send}
              style={{ marginTop: 16 }}
            >
              {status === "sending"
                ? t("request_emotion_sending")
                : t("request_emotion_send")}
            </Button>
          </>
        )}
      </Animated.View>
    </View>
  );
};

/**
 * Bottom sheet to request a missing emotion. Sends `emotion` feedback with
 * the typed word and its mood. Nothing is added to the emotion list: the
 * request only reaches the developer. Shows a thank-you, then closes. The
 * form mounts on open, so every request starts empty.
 */
export const RequestEmotionSheet = ({
  visible,
  source,
  onClose,
}: {
  visible: boolean;
  source: FeedbackSource;
  onClose: () => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    {visible && <SheetContent source={source} onClose={onClose} />}
  </Modal>
);
