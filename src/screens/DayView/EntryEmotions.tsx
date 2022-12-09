import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { t } from "@/helpers/translation";
import useColors from "../../hooks/useColors";
import { LogItem } from "../../hooks/useLogs";
import { Emotion } from "@/types";
import useHaptics from "@/hooks/useHaptics";

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
        padding: 10,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        backgroundColor: colors.logCardBackground,
        borderColor: colors.logCardBorder,
        borderWidth: 1,
        marginRight: 8,
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
  const haptics = useHaptics();

  const onPress = () => {
    haptics.selection();
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
        marginBottom: 12,
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
