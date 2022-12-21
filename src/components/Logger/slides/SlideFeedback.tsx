import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { language, t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { IQuestion, useQuestioner } from "@/hooks/useQuestioner";
import LinkButton from "../../LinkButton";
import { SlideHeadline } from "../components/SlideHeadline";
import { Footer } from "./Footer";

const AnswerSelector = ({
  answer,
  selected,
  onPress,
}: {
  answer: IQuestion['answers'][0];
  selected: boolean;
  onPress: (answer) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  const answerText = answer.text ? answer.text[language] || answer.text['en'] : null;

  return (
    <Pressable
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        borderRadius: 8,
        backgroundColor: colors.logActionBackground,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderWidth: 2,
        borderColor: selected ? colors.logActionBorder : 'transparent',
        aspectRatio: 1,
        width: 150,
        marginHorizontal: 8,
      })}
      onPress={async () => {
        await haptics.selection()
        onPress(answer)
      }}
    >
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 32,
            textAlign: 'center',
          }}
        >
          {answer.emoji}
        </Text>
      </View>
      {![undefined, '', null].includes(answerText) && (
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              color: colors.logActionText,
              textAlign: 'center',
            }}
          >
            {answerText}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

export const SlideFeedback = ({
  question,
  onPress,
  onDisableStep,
}: {
  question: IQuestion;
  onPress: () => void,
  onDisableStep: () => void,
}) => {
  const questioner = useQuestioner()
  const insets = useSafeAreaInsets()

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const onAnswer = (answer: IQuestion['answers'][0]) => {
    setSelectedIds([answer.id])
    questioner.submit(question, [answer])
    onPress()
  }

  return (
    <View style={{
      flex: 1,
      width: '100%',
      paddingHorizontal: 20,
      paddingBottom: insets.bottom + 20,
    }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SlideHeadline>{question.text[language] || question.text.en}</SlideHeadline>
        <View
          style={{
            padding: 32,
          }}
        >
          <View style={{
            flexDirection: 'row',
          }}>
            {question.answers.slice(0, 2).map((answer) => (
              <AnswerSelector
                key={answer.id}
                answer={answer}
                selected={selectedIds.includes(answer.id)}
                onPress={onAnswer}
              />
            ))}
          </View>
          <View style={{
            marginTop: 16,
            flexDirection: 'row',
          }}>
            {question.answers.slice(2, 4).map((answer) => (
              <AnswerSelector
                key={answer.id}
                answer={answer}
                selected={selectedIds.includes(answer.id)}
                onPress={onAnswer}
              />
            ))}
          </View>
        </View>
      </View>
      <Footer
        style={{
          justifyContent: 'center',
        }}
      >
        <LinkButton
          type="secondary"
          onPress={onDisableStep}
          style={{
            fontWeight: '400',
          }}
        >{t('log_feedback_disable')}</LinkButton>
      </Footer>
    </View>
  )
}