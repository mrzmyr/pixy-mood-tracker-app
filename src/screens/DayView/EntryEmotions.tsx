import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, Text, useColorScheme, View } from "react-native";
import { t } from "@/helpers/translation";
import useColors from "../../hooks/useColors";
import { LogItem } from "../../hooks/useLogs";
import { Emotion } from "@/types";
import useHaptics from "@/hooks/useHaptics";
import useScale from "@/hooks/useScale";
import { EMOTIONS } from "@/components/Logger/config";

const EmotionItem = ({
  emotion,
  onPress,
}: {
  emotion: Emotion['key'],
  onPress: () => void,
}) => {
  const colors = useColors();
  const colorScheme = useColorScheme();

  const scale = useScale()
  const colorMapping = {
    very_good: scale.colors.very_good,
    good: scale.colors.very_good,
    neutral: scale.colors.neutral,
    bad: scale.colors.very_bad,
    very_bad: scale.colors.very_bad,
  }

  const _emotion = EMOTIONS.find((e) => e.key === emotion)

  const color = _emotion ? colorMapping[_emotion.category] : {
    background: colors.cardBackground,
    text: colors.text,
  }

  return (
    <Pressable
      style={{
        paddingVertical: 10,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderColor: colors.entryBorder,
        borderWidth: 1,
        backgroundColor: colors.entryItemBackground,
        // backgroundColor: color.background,
        marginRight: 8,
        borderRadius: 10,
        marginBottom: 8,
      }}
      onPress={onPress}
    >
      <View
        style={{
          width: 8,
          height: 10,
          backgroundColor: color.background,
          borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
          borderWidth: 1,
          borderRadius: 100,
          marginRight: 10,
          paddingRight: 8,
        }}
      />
      <Text
        style={{
          // color: color.text,
          color: colors.text,
          fontSize: 17,
        }}
        numberOfLines={1}
      >{t(`log_emotion_${emotion}`).replace('\n', ' ')}</Text>
    </Pressable>
  )
}

export const EntryEmotions = ({
  item,
  isExpanded,
}: {
  item: LogItem;
  isExpanded: boolean;
}) => {
  const navigation = useNavigation();
  const haptics = useHaptics();

  const onPress = () => {
    haptics.selection();
    navigation.navigate('LogView', {
      id: item.id,
    });
  }

  const content = (
    <View
      style={{
        paddingLeft: 16,
        paddingRight: 16,
        flexDirection: 'row',
        flexWrap: isExpanded ? 'wrap' : 'nowrap',
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
  )

  return (
    <View
      style={{
        flexDirection: 'row',
        marginLeft: -16,
        marginRight: -16,
        marginBottom: 12,
      }}
    >
      {isExpanded && content}
      {!isExpanded && (
        <ScrollView
          horizontal
        >
          {content}
        </ScrollView>
      )}
    </View>
  );
};
