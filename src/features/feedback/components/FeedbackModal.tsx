import { useRef } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import type { TextInputInstance } from "react-native";
import LinkButton from "@/components/LinkButton";
import ModalHeader from "@/components/ModalHeader";
import { SheetModal } from "@/components/SheetModal";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import type { FeedackType } from "../Feedback";
import { useFeedbackForm } from "../hooks/useFeedbackForm";
import { getFeedbackTitle } from "../feedbackTitle";
import { FeedbackFields } from "./FeedbackFields";

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
  const messageRef = useRef<TextInputInstance>(null);

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
      backgroundColor={colors.logHeaderBackground}
    >
      <ModalHeader
        title={getFeedbackTitle(type)}
        left={
          <LinkButton
            testID="feedback-modal-cancel"
            onPress={cancel}
            type="primary"
            disabled={form.isSending}
          >
            {t("cancel")}
          </LinkButton>
        }
        right={
          form.isSending ? (
            <ActivityIndicator
              accessibilityLabel={t("send")}
              color={colors.loadingIndicator}
            />
          ) : (
            <LinkButton
              testID="feedback-modal-send"
              onPress={send}
              type="primary"
              disabled={!form.canSend}
            >
              {t("send")}
            </LinkButton>
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
