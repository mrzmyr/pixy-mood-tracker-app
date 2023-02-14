import { MiniButton } from "@/components/MiniButton";
import { Motion } from "@legendapp/motion";
import { View } from "react-native";
import { RatingAnswer } from "./RatingAnswer";
import { SleepQualityAnswer } from "./SleepQualityAnswer";
import { TextAnswer } from "./TextAnswer";
import { BotAnswer } from "./useBotQuestions";

export const Answers = ({
  answers,
}: {
  answers: BotAnswer[];
}) => {

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        width: '100%',
        paddingHorizontal: answers.some(answer => answer.type === 'text') ? 0 : 16,
      }}
    >
      {answers.map((answer, index) => (
        <Motion.View
          key={index}
          style={{
            flexDirection: 'row',
          }}
          initial={{
            opacity: 0,
            translateX: 100,
          }}
          animate={{
            opacity: 1,
            translateX: 0,
          }}
        >
          {answer.type === 'button_primary' && (
            <MiniButton
              variant="primary"
              onPress={() => {
                // @ts-ignore
                answer.action({
                  data: {}
                });
              }}
              style={{
                minWidth: 80,
              }}
            >{answer.buttonText}</MiniButton>
          )}
          {answer.type === 'button_secondary' && (
            <MiniButton
              variant="tertiary"
              onPress={() => {
                // @ts-ignore
                answer.action({
                  data: {}
                });
              }}
              style={{
                minWidth: 80,
              }}
            >{answer.buttonText}</MiniButton>
          )}
          {answer.type === 'text' && (
            <TextAnswer
              onPress={(text) => {
                // @ts-ignore
                answer.action({
                  data: {
                    text,
                  }
                });
              }} />
          )}
          {answer.type === 'rating' && (
            <RatingAnswer
              onPress={(key) => {
                // @ts-ignore
                answer.action({
                  data: {
                    rating: key,
                  }
                });
              }} />
          )}
          {answer.type === 'sleep_quality' && (
            <SleepQualityAnswer
              onPress={(key) => {
                // @ts-ignore
                answer.action({
                  data: {
                    quality: key,
                  }
                });
              }} />
          )}
        </Motion.View>
      ))}
    </View>
  );
};
