import { forwardRef, useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import { LogItem } from "@/hooks/useLogs";
import { useTemporaryLog } from "@/hooks/useTemporaryLog";
import DismissKeyboard from "../../DismisKeyboard";
import LinkButton from "../../LinkButton";
import TextArea from "../../TextArea";
import { SlideHeadline } from "../components/SlideHeadline";
import { Footer } from "./Footer";

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const MAX_LENGTH = 10 * 1000;

export const SlideMessage = forwardRef(({
  onChange,
  onDisableStep,
  showDisable,
}: {
  onChange: (text: LogItem['message']) => void
  onDisableStep: () => void
  showDisable: boolean
}, ref: any) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const marginTop = getLogEditMarginTop()

  const placeholder = useRef(t(`log_modal_message_placeholder_${randomInt(1, 6)}`))

  const [shouldExpand, setShouldExpand] = useState(false);

  useEffect(() => {
    const r1 = Keyboard.addListener('keyboardWillShow', () => setShouldExpand(true))
    const r2 = Keyboard.addListener('keyboardWillHide', () => setShouldExpand(false))

    return () => {
      r1.remove()
      r2.remove()
    }
  }, [])

  return (
    <>
      <DismissKeyboard>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            flex: 1,
          }}
        >
          <View style={{
            flex: 1,
            backgroundColor: colors.logBackground,
            width: '100%',
            position: 'relative',
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20 + (shouldExpand ? 112 : 0),
          }}>
            <View
              style={{
                flex: 1,
                marginTop: marginTop,
              }}
            >
              <SlideHeadline>{t('log_note_question')}</SlideHeadline>

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
                  placeholder={placeholder.current}
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
                >{t('log_message_disable')}</LinkButton>
              )}
            </Footer>
          </View>
        </KeyboardAvoidingView>
      </DismissKeyboard>
    </>
  )
})