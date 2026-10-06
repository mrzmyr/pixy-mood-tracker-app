import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import DismissKeyboard from "@/components/DismisKeyboard";
import LinkButton from "@/components/LinkButton";
import ModalHeader from "@/components/ModalHeader";
import TextArea from "@/components/TextArea";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import { useFeedback } from "../Feedback";
import type { FeedackType } from "../Feedback";
import { RADIUS } from "@/constants/Radius";

const TITLE_KEYS: Partial<Record<FeedackType, TranslationKey>> = {
  issue: "report_a_bug",
  idea: "request_a_feature",
};

const PLACEHOLDER_KEYS: Partial<Record<FeedackType, TranslationKey>> = {
  idea: "feedback_modal_message_placeholder_idea",
};

const FeedbackModalContent = ({
  visible,
  type,
  hide,
  close,
}: {
  visible: boolean;
  type: FeedackType;
  hide: () => void;
  close: () => void;
}) => {
  const colors = useColors();
  const feedback = useFeedback();

  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messageRef = useRef<TextInput>(null);

  const setMessageProxy = (nextMessage: string) => {
    setMessage(nextMessage);
  };

  const send = async () => {
    setIsLoading(true);

    try {
      await feedback.send({
        type,
        message,
        email,
        source: "modal",
        onCancel: () => {
          close();
        },
      });
      close();
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
    setIsLoading(false);
  };

  return (
    <Modal
      animationType={Platform.OS === "web" ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={() => hide()}
      // Focus once the sheet finished sliding in: `autoFocus` during the
      // presentation animation is flaky on iOS.
      onShow={() => messageRef.current?.focus()}
      visible={visible}
      style={{
        position: "relative",
      }}
    >
      <DismissKeyboard>
        <KeyboardAvoidingView
          keyboardVerticalOffset={32}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            flex: 1,
          }}
        >
          {isLoading && (
            <View
              style={{
                flex: 1,
                backgroundColor: colors.feedbackBackground,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                position: "absolute",
                zIndex: 99,
              }}
            >
              <ActivityIndicator size="small" color={colors.loadingIndicator} />
            </View>
          )}
          <View
            style={{
              flex: 1,
              justifyContent: "flex-start",
              backgroundColor: colors.feedbackBackground,
            }}
          >
            <ModalHeader
              title={t(TITLE_KEYS[type] ?? "feedback_modal_title")}
              left={
                <LinkButton
                  testID="feedback-modal-cancel"
                  onPress={hide}
                  type="primary"
                >
                  {t("cancel")}
                </LinkButton>
              }
              right={
                <LinkButton
                  testID="feedback-modal-send"
                  onPress={send}
                  type="primary"
                  disabled={!message.length}
                >
                  {t("send")}
                </LinkButton>
              }
            />
            <View
              style={{
                padding: 16,
                flex: 1,
              }}
            >
              <Text
                style={{
                  marginTop: 4,
                  marginBottom: 24,
                  color: colors.textSecondary,
                  fontSize: 15,
                  lineHeight: 20,
                  textAlign: "center",
                }}
              >
                {t("feedback_modal_description")}
              </Text>
              <TextArea
                ref={messageRef}
                testID="feedback-modal-message"
                style={{
                  height: 200,
                }}
                value={message}
                onChange={(text) => setMessageProxy(text)}
                placeholder={t(
                  PLACEHOLDER_KEYS[type] ?? "feedback_modal_message_placeholder"
                )}
              />
              <TextInput
                accessibilityLabel={t("feedback_modal_email_placeholder")}
                testID="feedback-modal-email"
                style={{
                  marginTop: 8,
                  backgroundColor: colors.textInputBackground,
                  borderRadius: RADIUS.sm,
                  padding: 16,
                  color: colors.text,
                  fontSize: 17,
                }}
                autoComplete="email"
                keyboardType="email-address"
                placeholderTextColor={colors.textInputPlaceholder}
                value={email}
                onChangeText={(text) => setEmail(text)}
                placeholder={t("feedback_modal_email_placeholder")}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  padding: 8,
                  paddingTop: 0,
                  marginTop: 8,
                }}
              >
                {t("feedback_modal_help")}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </DismissKeyboard>
    </Modal>
  );
};

/**
 * Feedback form modal. Render the returned `Modal` once in the host screen;
 * `show` opens it for one feedback type, which sets title and placeholder.
 */
export default function useFeedbackModal() {
  const [visible, setVisible] = useState(false);
  const analytics = useAnalytics();

  const [type, setType] = useState<FeedackType>("issue");

  const show = ({ type: nextType = "issue" }: { type: FeedackType }) => {
    analytics.track("feedback:modal_opened", { type: nextType });
    setType(nextType);
    setVisible(true);
  };
  const hide = () => {
    analytics.track("feedback:modal_closed");
    setVisible(false);
  };

  // Recreated on every render of the owner, so the form state resets each
  // time the modal is shown (and whenever the owner re-renders).
  const ModalElement = (_props: { data?: object }) => (
    <FeedbackModalContent
      visible={visible}
      type={type}
      hide={hide}
      close={() => setVisible(false)}
    />
  );

  return {
    Modal: ModalElement,
    show,
    hide,
  };
}
