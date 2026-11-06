import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { useLogDraft } from "../log-draft";
import { forwardRef, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import type { TextInput } from "react-native";
import {
  KeyboardState,
  useAnimatedKeyboard,
  useAnimatedReaction,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import DismissKeyboard from "@/components/dismis-keyboard";
import LinkButton from "@/components/link-button";
import TextArea from "@/components/text-area";
import { TextWrap } from "@/components/text-wrap";
import { LOGGER_HEADER_ICON_INSET } from "../components/logger-header";
import { Footer } from "./footer";
import { MAX_MESSAGE_LENGTH } from "@/constants/config";

const SLIDE_MARGIN_TOP = 8;

// The note text wraps around the floating next/save button with this space.
const BUTTON_GAP = 8;
const BUTTON_TEST_IDS = ["logger-next", "logger-save"];

// Reads the native keyboard state, the same source as the floating
// next/save button, so the footer and the button switch together. Flips when
// the keyboard starts to open or close, on iOS and Android.
// No LayoutAnimation here: configureNext is global, so it also animated the
// logger teardown on close and crashed Fabric (PIXY-APP-PRODUCTION-QM).
const useKeyboardVisible = () => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const keyboard = useAnimatedKeyboard();

  useAnimatedReaction(
    () => {
      const state = keyboard.state.get();
      return state === KeyboardState.OPENING || state === KeyboardState.OPEN;
    },
    (visible, previous) => {
      if (visible !== previous) {
        scheduleOnRN(setKeyboardVisible, visible);
      }
    }
  );

  return keyboardVisible;
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
  const { draft, typeMessage, flushMessage } = useLogDraft();
  // Uncontrolled: the native input owns the text, so typing re-renders
  // neither the logger nor the other slides. Keep the start text fixed;
  // a changing `defaultValue` would push text back into the input.
  // oxlint-disable-next-line react/hook-use-state -- start text never changes, so no setter
  const [initialMessage] = useState(draft.message);

  // Slide changes dismiss the keyboard, so `onBlur` publishes the text. This
  // covers an unmount with the keyboard still open.
  useEffect(() => flushMessage, [flushMessage]);
  const keyboardVisible = useKeyboardVisible();

  // The footer only exists while the disable link shows and the keyboard is
  // hidden, so typing gets the full height between header and keyboard.
  const footerVisible = showDisable && !keyboardVisible;

  return (
    <KeyboardAvoidingView
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
            paddingBottom: keyboardVisible ? 8 : insets.bottom + 16,
          }}
        >
          <TextWrap
            avoidTestIDs={BUTTON_TEST_IDS}
            gap={BUTTON_GAP}
            style={{
              flex: 1,
              marginTop: SLIDE_MARGIN_TOP,
            }}
          >
            <TextArea
              ref={ref}
              accessibilityLabel={t("log_note_question")}
              testID="log-message"
              placeholder={t("log_note_question")}
              defaultValue={initialMessage}
              onChange={typeMessage}
              onBlur={flushMessage}
              maxLength={MAX_MESSAGE_LENGTH}
              style={{
                flex: 1,
                marginBottom: 0,
                borderWidth: 0,
                backgroundColor: "transparent",
                paddingHorizontal: 0,
                paddingTop: 8,
                paddingBottom: 16,
                fontSize: 18,
                lineHeight: 26,
              }}
            />
          </TextWrap>
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
