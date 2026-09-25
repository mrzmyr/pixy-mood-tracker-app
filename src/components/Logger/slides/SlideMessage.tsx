import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import type { LogItem } from "@/hooks/useLogs";
import { useTemporaryLog } from "@/hooks/useTemporaryLog";
import { forwardRef, useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, View } from "react-native";
import type { TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DismissKeyboard from "@/components/DismisKeyboard";
import LinkButton from "@/components/LinkButton";
import TextArea from "@/components/TextArea";
import { SlideHeadline } from "@/components/Logger/components/SlideHeadline";
import { Footer } from "./Footer";

const MAX_LENGTH = 10 * 1000;

const SlideMessageComponent = (
  {
    onChange,
    onDisableStep,
    showDisable,
  }: {
    onChange: (text: LogItem["message"]) => void;
    onDisableStep: () => void;
    showDisable: boolean;
  },
  ref: React.ForwardedRef<TextInput>
) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const marginTop = getLogEditMarginTop();

  const [shouldExpand, setShouldExpand] = useState(false);

  useEffect(() => {
    const r1 = Keyboard.addListener("keyboardWillShow", () =>
      setShouldExpand(true)
    );
    const r2 = Keyboard.addListener("keyboardWillHide", () =>
      setShouldExpand(false)
    );

    return () => {
      r1.remove();
      r2.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      keyboardVerticalOffset={marginTop + insets.top + 16}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1,
      }}
    >
      <DismissKeyboard>
        <View
          style={{
            flex: 1,
            justifyContent: "space-around",
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.logBackground,
              width: "100%",
              position: "relative",
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 16 + (shouldExpand ? 24 : 0),
            }}
          >
            <View
              style={{
                flex: 1,
                marginTop,
              }}
            >
              <SlideHeadline>{t("log_note_question")}</SlideHeadline>
              <View
                style={{
                  flexDirection: "column",
                  width: "100%",
                  marginTop: 16,
                  flex: 1,
                }}
              >
                <TextArea
                  ref={ref}
                  value={tempLog?.data?.message}
                  onChange={onChange}
                  maxLength={MAX_LENGTH}
                  style={{
                    flex: 1,
                    marginBottom: 0,
                  }}
                />
              </View>
            </View>
            <Footer>
              {showDisable && (
                <LinkButton
                  type="secondary"
                  onPress={onDisableStep}
                  style={{
                    fontWeight: "400",
                  }}
                >
                  {t("log_message_disable")}
                </LinkButton>
              )}
            </Footer>
          </View>
        </View>
      </DismissKeyboard>
    </KeyboardAvoidingView>
  );
};

/**
 * Free-text note slide. The ref points at the text input so the logger can
 * focus it.
 */
export const SlideMessage = forwardRef(SlideMessageComponent);
