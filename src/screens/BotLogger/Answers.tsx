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
