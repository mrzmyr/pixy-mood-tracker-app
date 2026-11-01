import { useRef } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import type { TextInput } from "react-native";
import { HeaderButton } from "@/components/header-button";
import ModalHeader from "@/components/modal-header";
import { SheetModal } from "@/components/sheet-modal";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import type { FeedackType } from "../feedback";
import { useFeedbackForm } from "../hooks/use-feedback-form";
import { getFeedbackTitle } from "../feedback-title";
import { FeedbackFields } from "./feedback-fields";

/**
 * Feedback form in a React Native `Modal`, for screens outside the router
 * stack. Only the storage error screen uses it: it replaces the whole stack,
 * so it cannot open the `/feedback` route. Everywhere else, open the route.
 *
 * Send stays disabled while the message is empty and shows a spinner while
 * sending. The modal closes only after the server accepted the feedback.
 */
export const FeedbackModal = ({
  visible,
  type,
  onClose,
}: {
  visible: boolean;
  type: FeedackType;
  onClose: () => void;
}) => {
  const colors = useColors();
  const analytics = useAnalytics();
  const form = useFeedbackForm(type);
  const messageRef = useRef<TextInput>(null);

  const cancel = () => {
    analytics.track("feedback:modal_closed");
    onClose();
  };

  const send = async () => {
    if (await form.send()) {
      onClose();
    }
  };

  return (
    <SheetModal
      visible={visible}
      onClose={cancel}
      onShow={() => {
        analytics.track("feedback:modal_opened", { type });
        messageRef.current?.focus();
      }}
      backgroundColor={colors.feedbackBackground}
    >
      <ModalHeader
        title={getFeedbackTitle(type)}
        left={
          <HeaderButton
            kind="cancel"
            label={t("cancel")}
            testID="feedback-modal-cancel"
            onPress={cancel}
            disabled={form.isSending}
          />
        }
        right={
          form.isSending ? (
            <ActivityIndicator
              accessibilityLabel={t("send")}
              color={colors.loadingIndicator}
            />
          ) : (
            <HeaderButton
              kind="send"
              label={t("send")}
              testID="feedback-modal-send"
              onPress={send}
              disabled={!form.canSend}
            />
          )
        }
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.feedbackBackground }}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <FeedbackFields
          type={type}
          message={form.message}
          email={form.email}
          messageRef={messageRef}
          hasFailed={form.hasFailed}
          onMessageChange={form.handleMessageChange}
          onEmailChange={form.handleEmailChange}
        />
      </ScrollView>
    </SheetModal>
  );
};
