import { BotMessage } from "@/hooks/useBot";
import useColors from "@/hooks/useColors";
import { Motion } from "@legendapp/motion";
import { Text, View } from "react-native";

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
      <Motion.View
        style={{
          backgroundColor: message.author === 'bot' ? colors.chatBotMessageBackground : colors.chatUserMessageBackground,
          paddingVertical: 8,
          paddingHorizontal: 16,
          marginTop: 8,
          borderRadius: 16,
        }}
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 300,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            color: message.author === 'bot' ? colors.chatBotMessageText : colors.chatUserMessageText,
            lineHeight: 24,
          }}
        >{message.text}</Text>
      </Motion.View>
    </View>
  );
};
