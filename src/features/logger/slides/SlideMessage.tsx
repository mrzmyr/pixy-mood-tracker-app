import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { useLogDraft } from "../logDraft";
import { forwardRef, useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, View } from "react-native";
import type { TextInput } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import DismissKeyboard from "@/components/DismisKeyboard";
import LinkButton from "@/components/LinkButton";
import TextArea from "@/components/TextArea";
import { LOGGER_HEADER_ICON_INSET } from "../components/LoggerHeader";
import { Footer } from "./Footer";
import { getActionHeightAboveKeyboard } from "../components/slideActionLayout";
import { ScrollingNoteInput } from "./ScrollingNoteInput";
import { MAX_MESSAGE_LENGTH } from "@/constants/Config";

const SLIDE_MARGIN_TOP = 8;

// Space between the caret line and the floating next/save button on iOS.
const BUTTON_GAP = 8;
// Keeps the last lines above the floating next/save button while typing.
const INPUT_BOTTOM_PADDING_TYPING = 72;

const ON_EVENT_NAME =
  Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const OFF_EVENT_NAME =
  Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

// No LayoutAnimation here: configureNext is global, so it also animated the
// logger teardown on close and crashed Fabric (PIXY-APP-PRODUCTION-QM).
const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(ON_EVENT_NAME, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(OFF_EVENT_NAME, () => {
      setKeyboardHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboardHeight;
};

const SlideMessageComponent = (
  {
    onDisableStep,
    showDisable,
  }: {
    onDisableStep: () => void;
    showDisable: boolean;
  },
  ref: React.ForwardedRef<TextInput>
) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { draft, setMessage } = useLogDraft();
  const keyboardHeight = useKeyboardHeight();
  const keyboardVisible = keyboardHeight > 0;
  const isIos = Platform.OS === "ios";

  // The footer only exists while the disable link shows and the keyboard is
  // hidden, so typing gets the full height between header and keyboard.
  const footerVisible = showDisable && !keyboardVisible;

  // iOS: the slide ends exactly at the keyboard top, from the keyboard height
  // like the button. The keyboard avoiding view measures from the wrong origin
  // inside the sheet and left the input 24 pt behind the keyboard.
  const keyboardPaddingBottom = isIos ? keyboardHeight : 8;
  const slidePaddingBottom = keyboardVisible
    ? keyboardPaddingBottom
    : insets.bottom + 16;

  return (
    <KeyboardAvoidingView
      enabled={!isIos}
      keyboardVerticalOffset={SLIDE_MARGIN_TOP + insets.top + 16}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1,
      }}
    >
      <DismissKeyboard>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.logBackground,
            width: "100%",
            paddingHorizontal: LOGGER_HEADER_ICON_INSET,
            paddingBottom: slidePaddingBottom,
          }}
        >
          <View
            style={{
              flex: 1,
              marginTop: SLIDE_MARGIN_TOP,
            }}
          >
            {isIos ? (
              <ScrollingNoteInput
                ref={ref}
                accessibilityLabel={t("log_note_question")}
                testID="log-message"
                placeholder={t("log_note_question")}
                value={draft.message}
                onChange={setMessage}
                maxLength={MAX_MESSAGE_LENGTH}
                bottomInset={
                  keyboardVisible
                    ? getActionHeightAboveKeyboard(insets.bottom) + BUTTON_GAP
                    : 0
                }
              />
            ) : (
              <TextArea
                ref={ref}
                accessibilityLabel={t("log_note_question")}
                testID="log-message"
                placeholder={t("log_note_question")}
                value={draft.message}
                onChange={setMessage}
                maxLength={MAX_MESSAGE_LENGTH}
                style={{
                  flex: 1,
                  marginBottom: 0,
                  borderWidth: 0,
                  backgroundColor: "transparent",
                  paddingHorizontal: 0,
                  paddingTop: 8,
                  paddingBottom: keyboardVisible
                    ? INPUT_BOTTOM_PADDING_TYPING
                    : 16,
                  fontSize: 18,
                  lineHeight: 26,
                }}
              />
            )}
          </View>
          {footerVisible && (
            <Footer>
              <LinkButton
                type="secondary"
                onPress={onDisableStep}
                style={{
                  fontWeight: "400",
                }}
              >
                {t("log_message_disable")}
              </LinkButton>
            </Footer>
          )}
        </View>
      </DismissKeyboard>
    </KeyboardAvoidingView>
  );
};

/**
 * Free-text note slide. The question is the input placeholder and the text
 * fills the slide without a box. The ref points at the text input so the
 * logger can focus it.
 */
export const SlideMessage = forwardRef(SlideMessageComponent);
