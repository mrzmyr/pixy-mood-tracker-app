import { Pressable, Text, View } from 'react-native';
import { MoreHorizontal } from 'react-native-feather';
import { t } from '@/helpers/translation';
import useColors from '../useColors';
import { FeedackType } from '../useFeedback';
import useHaptics from '../useHaptics';

export function TypeSelector({
  selected, onPress,
}: {
  selected: FeedackType;
  onPress: (type: FeedackType) => void;
}) {
  const colors = useColors();
  const haptics = useHaptics();

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      marginBottom: 10,
      width: '100%',
    }}>
      <Pressable
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          borderRadius: 8,
          backgroundColor: colors.feedbackSelectionBackground,
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 15,
          marginRight: 10,
          borderWidth: 2,
          borderColor: selected === 'issue' ? colors.tint : colors.feedbackSelectionBackground,
          maxHeight: 100,
        })}
        onPress={async () => {
          await haptics.selection();
          onPress('issue');
        }}
        testID='feedback-modal-issue'
      >
        <Text
          numberOfLines={1}
          style={{ fontSize: 32, color: colors.feedbackSelectionText, textAlign: 'center' }}
        >
          ⚠️
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 17,
            color: colors.feedbackSelectionText,
            marginTop: 5,
            textAlign: 'center'
          }}
        >
          {t('issue')}
        </Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          borderRadius: 8,
          backgroundColor: colors.feedbackSelectionBackground,
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 15,
          marginRight: 10,
          borderWidth: 2,
          borderColor: selected === 'idea' ? colors.tint : colors.feedbackSelectionBackground,
          maxHeight: 100,
        })}
        onPress={async () => {
          await haptics.selection();
          onPress('idea');
        }}
        testID='feedback-modal-idea'
      >
        <Text
          numberOfLines={1}
          style={{ fontSize: 32, color: colors.feedbackSelectionText, textAlign: 'center' }}
        >
          💡
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 17,
            color: colors.feedbackSelectionText,
            marginTop: 5,
            textAlign: 'center'
          }}
        >
          {t('idea')}
        </Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          borderRadius: 8,
          backgroundColor: colors.feedbackSelectionBackground,
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 15,
          borderWidth: 2,
          borderColor: selected === 'other' ? colors.tint : colors.feedbackSelectionBackground,
          maxHeight: 100,
        })}
        onPress={async () => {
          await haptics.selection();
          onPress('other');
        }}
        testID='feedback-modal-other'
      >
        <MoreHorizontal height={40} color={colors.feedbackSelectionText} />
        <Text
          numberOfLines={1}
          style={{ fontSize: 17, color: colors.feedbackSelectionText, marginTop: 5, textAlign: 'center' }}
        >
          {t('other')}
        </Text>
      </Pressable>
    </View>
  );
}
