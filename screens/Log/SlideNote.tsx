import { useKeyboard } from "@react-native-community/hooks";
import { useRef } from "react";
import { View } from "react-native";
import { Check } from "react-native-feather";
import DismissKeyboard from "../../components/DismisKeyboard";
import TextArea from "../../components/TextArea";
import useColors from "../../hooks/useColors";
import { useTemporaryLog } from "../../hooks/useTemporaryLog";
import { useTranslation } from "../../hooks/useTranslation";
import { FloatButton } from "./FloatButton";
import { SlideHeadline } from "./SlideHeadline";

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const MAX_LENGTH = 10 * 1000;

export const SlideNote = ({
  save
}: {
  save: () => void
}) => {
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const { t } = useTranslation()

  const placeholder = useRef(t(`log_modal_message_placeholder_${randomInt(1, 6)}`))

  const onChange = (text: string) => {
    tempLog.set(data => ({
      ...data,
      message: text
    }))
  }
  const keyboard = useKeyboard()

  const nextButton = (
    <FloatButton onPress={() => save()}>
      <Check color={colors.primaryButtonText} width={24} />
    </FloatButton>
  )

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
              marginTop: 64,
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
                value={tempLog.data.message}
                onChange={onChange}
                maxLength={MAX_LENGTH}
              />
            </View>
          </View>
        </View>
      </DismissKeyboard>
    </>
  )
}