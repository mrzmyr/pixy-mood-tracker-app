import { TextInput, View } from "react-native";
import { InlineAlert } from "@/components/inline-alert";
import TextArea from "@/components/text-area";
import { Copy, getInputTextStyle } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import type { FeedackType } from "../feedback";

const PLACEHOLDER_KEYS: Partial<Record<FeedackType, TranslationKey>> = {
  idea: "feedback_modal_message_placeholder_idea",
};

/**
 * Feedback form fields: intro text, message, optional email, help text,
 * and send error. The screen around it owns the header and the send action.
 */
export const FeedbackFields = ({
  type,
  message,
  email,
  messageRef,
  hasFailed = false,
  onMessageChange,
  onEmailChange,
}: {
  type: FeedackType;
  message: string;
  email: string;
  messageRef?: React.Ref<TextInput>;
  /** Shows the send error under the inputs. Send retries. */
  hasFailed?: boolean;
  onMessageChange: (message: string) => void;
  onEmailChange: (email: string) => void;
}) => {
  const colors = useColors();

  return (
    <View style={{ padding: 16 }}>
      <Copy
        size={14}
        style={{
          marginTop: 4,
          marginBottom: 24,
          color: colors.textSecondary,
          lineHeight: 20,
          textAlign: "center",
        }}
      >
        {t("feedback_modal_description")}
      </Copy>
      <TextArea
        ref={messageRef}
        testID="feedback-modal-message"
        style={{ height: 200 }}
        value={message}
        onChange={onMessageChange}
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
          borderCurve: "continuous",
          padding: 16,
          color: colors.text,
          ...getInputTextStyle(16),
        }}
        autoComplete="email"
        keyboardType="email-address"
        placeholderTextColor={colors.textInputPlaceholder}
        value={email}
        onChangeText={onEmailChange}
        placeholder={t("feedback_modal_email_placeholder")}
      />
      <Copy
        size={14}
        style={{
          color: colors.textSecondary,
          padding: 8,
          paddingTop: 0,
          marginTop: 8,
        }}
      >
        {t("feedback_modal_help")}
      </Copy>
      {hasFailed && (
        <InlineAlert
          testID="feedback-modal-error"
          message={t("feedback_modal_error")}
          style={{ marginTop: 8 }}
        />
      )}
    </View>
  );
};
