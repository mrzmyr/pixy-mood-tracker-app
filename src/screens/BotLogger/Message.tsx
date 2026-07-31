import { BotMessage } from "@/hooks/useBot";
import useColors from "@/hooks/useColors";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

export const Message = ({
  message,
}: {
  message: BotMessage;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexWrap: 'wrap',
        flexDirection: 'row',
        justifyContent: message.author === 'bot' ? 'flex-start' : 'flex-end',
      }}
    >
      <Animated.View
        entering={FadeInDown.springify().damping(20).stiffness(300)}
        style={{
          backgroundColor: message.author === 'bot' ? colors.chatBotMessageBackground : colors.chatUserMessageBackground,
          paddingVertical: 8,
          paddingHorizontal: 16,
          marginTop: 8,
          borderRadius: 16,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            color: message.author === 'bot' ? colors.chatBotMessageText : colors.chatUserMessageText,
            lineHeight: 24,
          }}
        >{message.text}</Text>
      </Animated.View>
    </View>
  );
};
