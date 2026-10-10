import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import Button from "@/components/Button";
import { CloseButton } from "@/components/CloseButton";
import { SheetModal } from "@/components/SheetModal";
import LinkButton from "@/components/LinkButton";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import Toggle from "@/components/Toggle";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { showToast } from "@/lib/toast";
import { t } from "@/lib/translation";
import type { FeedbackSource } from "@/types/Feedback";
import { useFeedback } from "../Feedback";
import { RADIUS } from "@/constants/Radius";

const INPUT_STYLE = {
  borderRadius: RADIUS.sm,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 17,
} as const;

const SheetHeader = ({ onClose }: { onClose: () => void }) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <View style={{ flexShrink: 1 }}>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 22, fontWeight: "700", color: colors.text }}
        >
          {t("request_emotion_title")}
        </Text>
        <Text
          style={{ marginTop: 4, fontSize: 15, color: colors.textSecondary }}
        >
          {t("request_emotion_subtitle")}
        </Text>
      </View>
      <CloseButton
        testID="request-emotion-close"
        onPress={onClose}
        style={{ marginTop: -8, marginRight: -10 }}
      />
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
      <MenuList
        style={{ marginTop: 12, backgroundColor: colors.textInputBackground }}
      >
        <MenuListItem
          title={t("request_emotion_reply")}
          iconRight={
            <Toggle
              testID="request-emotion-reply"
              accessibilityLabel={t("request_emotion_reply")}
              value={wantsReply}
              onValueChange={onWantsReplyChange}
            />
          }
        />
      </MenuList>
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
            ...INPUT_STYLE,
            marginTop: 8,
            backgroundColor: colors.textInputBackground,
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
  const haptics = useHaptics();
  const feedback = useFeedback();

  const [word, setWord] = useState("");
  const [isWhyOpen, setIsWhyOpen] = useState(false);
  const [wantsReply, setWantsReply] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "failed">("idle");

  const replyTo = wantsReply && email.trim() ? email.trim() : undefined;

  const send = async () => {
    setStatus("sending");
    await feedback.send({
      type: "emotion",
      source,
      message: word.trim(),
      email: replyTo,
      onOk: () => {
        haptics.success();
        onClose();
        showToast({
          title: t("request_emotion_sent"),
          message: replyTo ? t("request_emotion_sent_reply") : undefined,
        });
      },
      onCancel: () => setStatus("failed"),
    });
  };

  const canSend = word.trim().length > 0 && status !== "sending";

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.feedbackBackground }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24 }}
    >
      <SheetHeader onClose={onClose} />
      <TextInput
        testID="request-emotion-word"
        accessibilityLabel={t("request_emotion_subtitle")}
        autoFocus
        maxLength={40}
        returnKeyType="done"
        value={word}
        onChangeText={setWord}
        placeholder={t("request_emotion_placeholder")}
        placeholderTextColor={colors.textInputPlaceholder}
        style={{
          ...INPUT_STYLE,
          marginTop: 20,
          backgroundColor: colors.textInputBackground,
          color: colors.text,
        }}
      />
      <LinkButton
        testID="request-emotion-why"
        onPress={() => setIsWhyOpen((open) => !open)}
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 0,
          paddingBottom: 0,
          marginTop: 8,
          fontWeight: "400",
        }}
      >
        {t("request_emotion_why")}
      </LinkButton>
      {isWhyOpen && (
        <Text
          style={{
            marginTop: 4,
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
        style={{ marginTop: 20 }}
      >
        {status === "sending"
          ? t("request_emotion_sending")
          : t("request_emotion_send")}
      </Button>
    </ScrollView>
  );
};

/**
 * Native page sheet to request a missing emotion. Sends `emotion` feedback
 * with the typed word. Nothing is added to the emotion list: the request
 * only reaches the developer. On success the sheet closes and a toast
 * confirms. Every opening starts with an empty form.
 */
export const RequestEmotionSheet = ({
  visible,
  source,
  onClose,
}: {
  visible: boolean;
  source: FeedbackSource;
  onClose: () => void;
}) => {
  const colors = useColors();
  // Remount the form on each opening, but keep it during the close animation.
  const [session, setSession] = useState(0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setSession((count) => count + 1);
    }
  }

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      backgroundColor={colors.feedbackBackground}
    >
      <SheetContent key={session} source={source} onClose={onClose} />
    </SheetModal>
  );
};
