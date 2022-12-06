import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Emotion } from "@/components/Logger/config";
import { t } from "@/helpers/translation";
import useColors from "../../hooks/useColors";
import { LogItem } from "../../hooks/useLogs";

const EmotionItem = ({
  emotion,
  onPress,
}: {
  emotion: Emotion['key'],
  onPress: () => void,
}) => {
  const colors = useColors();
  return (
    <Pressable
      style={{
        padding: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        backgroundColor: colors.logCardBackground,
        borderColor: colors.logCardBorder,
        borderWidth: 1,
        marginRight: 8,
        marginTop: 4,
        borderRadius: 8,
      }}
      onPress={onPress}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
        }}
        numberOfLines={1}
      >{t(`log_emotion_${emotion}`).replace('\n', ' ')}</Text>
    </Pressable>
  )
}

export const EntryEmotions = ({
  item
}: {
  item: LogItem;
}) => {
  const navigation = useNavigation();
  const onPress = () => {
    navigation.navigate('LogView', {
      id: item.id,
    });
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        marginLeft: -16,
        marginRight: -16,
        marginBottom: 16,
      }}
    >
      <ScrollView
        horizontal
      >
        <View
          style={{
            paddingLeft: 16,
            paddingRight: 16,
            flexDirection: 'row',
          }}
        >
          {item.emotions.map((emotion) => {
            return (
              <EmotionItem
                key={emotion}
                emotion={emotion}
                onPress={onPress}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
