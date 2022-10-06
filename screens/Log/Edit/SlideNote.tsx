import { useEffect, useRef, useState } from "react";
import { Keyboard, View } from "react-native";
import DismissKeyboard from "../../../components/DismisKeyboard";
import TextArea from "../../../components/TextArea";
import useColors from "../../../hooks/useColors";
import { LogItem } from "../../../hooks/useLogs";
import { useTemporaryLog } from "../../../hooks/useTemporaryLog";
import { useTranslation } from "../../../hooks/useTranslation";
import { SlideHeadline } from "./SlideHeadline";

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const MAX_LENGTH = 10 * 1000;

export const SlideNote = ({
  marginTop,
  onChange
}: {
  marginTop: number;
  onChange: (text: LogItem['message']) => void
}) => {
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const { t } = useTranslation()

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
        <View style={{ 
          flex: 1, 
          backgroundColor: colors.logBackground,
          width: '100%',
          position: 'relative',
        }}>
          <View
            style={{
              flex: 1,
              marginTop: marginTop,
            }}
          >
            <View
              style={{
                width: '100%',
              }}
            >
              <SlideHeadline>{t('log_note_question')}</SlideHeadline>
            </View>

            <View
              style={{
                flexDirection: 'row',
                marginTop: 16,
                flex: 1,
              }}
            >
              <TextArea
                placeholder={placeholder.current}
                value={tempLog?.data?.message}
                onChange={onChange}
                maxLength={MAX_LENGTH}
                style={{
                  flex: 1,
                  marginBottom: 0,
                  height: !shouldExpand ? '100%' : 240,
                }}
              />
            </View>
          </View>
          <View
            style={{
              height: 50,
              width: 50,
              marginBottom: 32,
            }}
          />
        </View>
      </DismissKeyboard>
    </>
  )
}