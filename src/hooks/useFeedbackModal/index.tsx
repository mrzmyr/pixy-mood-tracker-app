import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  View
} from "react-native";
import DismissKeyboard from "@/components/DismisKeyboard";
import LinkButton from "@/components/LinkButton";
import ModalHeader from "@/components/ModalHeader";
import TextArea from "@/components/TextArea";
import { t } from "@/helpers/translation";
import { useAnalytics } from "../useAnalytics";
import useColors from "../useColors";
import { FeedackType, useFeedback } from "../useFeedback";
import { TypeSelector } from "./TypeSelector";

export default function useFeedbackModal() {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const analytics = useAnalytics();
  const feedback = useFeedback();

  const [defaultType, setDefaultType] = useState<FeedackType>("issue");

  const show = ({ type = "issue" }: { type: FeedackType }) => {
    analytics.track("feedback_open");
    setDefaultType(type);
    setVisible(true);
  };
  const hide = () => {
    analytics.track("feedback_close");
    setVisible(false);
  };

  const ModalElement = ({ data = {} }: { data?: any }) => {
    const [type, setType] = useState<FeedackType>(defaultType);
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const setTypeProxy = (type: FeedackType) => {
      analytics.track("feedback_type_change", { type });
      setType(type);
    };

    const setMessageProxy = (message: string) => {
      setMessage(message);
    };

    const send = async () => {
      setIsLoading(true);

      feedback
        .send({
          type,
          message,
          email,
          source: "modal",
          onCancel: () => {
            setVisible(false);
          },
        })
        .then((resp) => {
          setVisible(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
    };

    return (
      <Modal
        animationType={Platform.OS === "web" ? "none" : "slide"}
        presentationStyle="pageSheet"
        onRequestClose={() => hide()}
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
                <ActivityIndicator
                  size={"small"}
                  color={colors.loadingIndicator}
                />
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
                title={t('feedback_modal_title')}
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
                    testID="feedback-modal-cancel"
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
                    textAlign: 'center'
                  }}
                >
                  {t("feedback_modal_description")}
                </Text>
                <TypeSelector
                  selected={type}
                  onPress={(type) => setTypeProxy(type)}
                />
                <View
                  style={{
                    flexDirection: "row",
                    width: "100%",
                    marginTop: 8,
                  }}
                >
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: colors.textInputBackground,
                      borderRadius: 8,
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
                </View>
                <View
                  style={{
                    flexDirection: "column",
                    width: "100%",
                    marginTop: 8,
                    marginBottom: 8,
                    flex: 1,
                  }}
                >
                  <TextArea
                    testID="feedback-modal-message"
                    style={{
                      flex: 1,
                      height: '100%',
                      maxHeight: 240,
                    }}
                    value={message}
                    onChange={(text) => setMessageProxy(text)}
                    placeholder={t("feedback_modal_message_placeholder")}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      padding: 8,
                      paddingTop: 0,
                      marginTop: 4,
                    }}
                  >
                    {t("feedback_modal_help")}
                  </Text>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </DismissKeyboard>
      </Modal>
    );
  };

  return {
    Modal: ModalElement,
    show,
    hide,
  };
}
