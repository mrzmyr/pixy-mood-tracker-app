import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import Button from "@/components/button";
import { CloseButton } from "@/components/close-button";
import { InlineAlert } from "@/components/inline-alert";
import { SheetModal } from "@/components/sheet-modal";
import LinkButton from "@/components/link-button";
import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import Toggle from "@/components/toggle";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { showToast } from "@/lib/toast";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import type { FeedbackSource } from "@/types/feedback";
import { useFeedback } from "../feedback";
import { RADIUS } from "@/constants/radius";

const INPUT_STYLE = {
  borderRadius: RADIUS.sm,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 17,
} as const;

/** What the user asks for. Each kind sends feedback of the same type. */
export type RequestKind = "emotion" | "role";

const COPY = {
  emotion: {
    title: "request_emotion_title",
    subtitle: "request_emotion_subtitle",
    placeholder: "request_emotion_placeholder",
    why: "request_emotion_why",
    description: "request_emotion_description",
  },
  role: {
    title: "request_role_title",
    subtitle: "request_role_subtitle",
    placeholder: "request_role_placeholder",
    why: "request_role_why",
    description: "request_role_description",
  },
} as const satisfies Record<
  RequestKind,
  Record<
    "title" | "subtitle" | "placeholder" | "why" | "description",
    TranslationKey
  >
>;

const SheetHeader = ({
  kind,
  onClose,
}: {
  kind: RequestKind;
  onClose: () => void;
}) => {
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
          {t(COPY[kind].title)}
        </Text>
        <Text
          style={{ marginTop: 4, fontSize: 15, color: colors.textSecondary }}
        >
          {t(COPY[kind].subtitle)}
        </Text>
      </View>
      <CloseButton
        testID={`request-${kind}-close`}
        onPress={onClose}
        style={{ marginTop: -8, marginRight: -10 }}
      />
    </View>
  );
};

const ReplyFields = ({
  kind,
  wantsReply,
  onWantsReplyChange,
  email,
  onEmailChange,
}: {
  kind: RequestKind;
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
          title={t("request_reply")}
          iconRight={
            <Toggle
              testID={`request-${kind}-reply`}
              accessibilityLabel={t("request_reply")}
              value={wantsReply}
              onValueChange={onWantsReplyChange}
            />
          }
        />
      </MenuList>
      {wantsReply && (
        <TextInput
          testID={`request-${kind}-email`}
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
  kind,
  source,
  onClose,
}: {
  kind: RequestKind;
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
      type: kind,
      source,
      message: word.trim(),
      email: replyTo,
      onOk: () => {
        haptics.success();
        onClose();
        showToast({
          title: t("request_sent"),
          message: replyTo ? t("request_sent_reply") : undefined,
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
      <SheetHeader kind={kind} onClose={onClose} />
      <TextInput
        testID={`request-${kind}-word`}
        accessibilityLabel={t(COPY[kind].subtitle)}
        autoFocus
        maxLength={40}
        returnKeyType="done"
        value={word}
        onChangeText={setWord}
        placeholder={t(COPY[kind].placeholder)}
        placeholderTextColor={colors.textInputPlaceholder}
        style={{
          ...INPUT_STYLE,
          marginTop: 20,
          backgroundColor: colors.textInputBackground,
          color: colors.text,
        }}
      />
      <LinkButton
        testID={`request-${kind}-why`}
        onPress={() => setIsWhyOpen((open) => !open)}
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 0,
          paddingBottom: 0,
          marginTop: 8,
          fontWeight: "400",
        }}
      >
        {t(COPY[kind].why)}
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
          {t(COPY[kind].description)}
        </Text>
      )}
      <ReplyFields
        kind={kind}
        wantsReply={wantsReply}
        onWantsReplyChange={setWantsReply}
        email={email}
        onEmailChange={setEmail}
      />
      {status === "failed" && (
        <InlineAlert
          testID={`request-${kind}-error`}
          message={t("request_error")}
          style={{ marginTop: 12 }}
        />
      )}
      <Button
        testID={`request-${kind}-send`}
        disabled={!canSend}
        onPress={send}
        style={{ marginTop: 20 }}
      >
        {status === "sending" ? t("request_sending") : t("request_send")}
      </Button>
    </ScrollView>
  );
};

/**
 * Native page sheet to request a missing emotion or person role. Sends
 * feedback of type `kind` with the typed word. Nothing is added to the list:
 * the request only reaches the developer. On success the sheet closes and a
 * toast confirms. Every opening starts with an empty form.
 */
export const RequestSheet = ({
  kind,
  visible,
  source,
  onClose,
}: {
  kind: RequestKind;
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
      <SheetContent
        key={session}
        kind={kind}
        source={source}
        onClose={onClose}
      />
    </SheetModal>
  );
};
