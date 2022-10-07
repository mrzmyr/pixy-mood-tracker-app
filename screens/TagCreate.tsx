import { useState } from 'react';
import { Platform, TextInput, TouchableOpacity, View } from 'react-native';
import { Check } from 'react-native-feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import Button from '../components/Button';
import DismissKeyboard from '../components/DismisKeyboard';
import LinkButton from '../components/LinkButton';
import ModalHeader from '../components/ModalHeader';
import { MAX_TAG_LENGTH, MIN_TAG_LENGTH } from '../constants/Config';
import useColors from '../hooks/useColors';
import useHaptics from '../hooks/useHaptics';
import { useLogs } from '../hooks/useLogs';
import { useAnalytics } from '../hooks/useAnalytics';
import { COLOR_NAMES, Tag as ITag } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackScreenProps } from '../types';

const REGEX_EMOJI = /\p{Emoji}/u;

export const TagCreate = ({ navigation, route }: RootStackScreenProps<'TagCreate'>) => {
  const { t } = useTranslation()
  const colors = useColors()
  const haptics = useHaptics()
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics()
  const logs = useLogs()
  
  const [tempTag, setTempTag] = useState<ITag>({
    id: uuidv4(),
    title: '',
    color: Object.keys(colors.tags)[0] as ITag['color'],
  });
  
  const onCreate = () => {
    analytics.track('tag_create', {
      titleLength: tempTag.title.length,
      color: tempTag.color,
      containsEmoji: REGEX_EMOJI.test(tempTag.title)
    })

    setTempTag({
      id: uuidv4(),
      title: '',
      color: Object.keys(colors.tags)[0] as ITag['color'],
    })

    logs.createTag(tempTag)

    navigation.goBack();
  }
  
  return (
    <DismissKeyboard>
      <View style={{
        flex: 1,
        justifyContent: 'flex-start',
        backgroundColor: colors.logBackground,
        marginTop: Platform.OS === 'android' ? insets.top : 0,
      }}>
        <ModalHeader
          title={t('create_tag')}
          left={
            <LinkButton 
              onPress={() => {
                navigation.goBack();
              }}
              type='primary'
              >{t('cancel')}</LinkButton>
          }
        />
          <View 
            style={{ 
              flex: 1, 
              padding: 20,
            }}
          >
          <TextInput
            autoCorrect={false}
            style={{
              fontSize: 17,
              color: colors.textInputText,
              backgroundColor: colors.textInputBackground,
              width: '100%',
              padding: 16,
              borderRadius: 8,
              marginBottom: 16,
            }}
            placeholder={t('tags_add_placeholder')}
            placeholderTextColor={colors.textInputPlaceholder}
            maxLength={MAX_TAG_LENGTH}
            value={tempTag.title}
            onChangeText={text => {
              setTempTag(tempTag => ({
                ...tempTag,
                title: text,
              }))
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              width: '100%',
              padding: 16,
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
            }}
          >
            {COLOR_NAMES.map(colorName => (
              <TouchableOpacity
                key={colorName}
                style={{
                  flex: 1,
                  flexBasis: `${(100 / 7) - 2}%`,
                  maxWidth: `${(100 / 7) - 2}%`,
                  aspectRatio: 1,
                  borderRadius: 100,
                  backgroundColor: colors.tags[colorName].dot,
                  justifyContent: 'center',
                  alignItems: 'center',
                  margin: '1%',
                }}
                onPress={() => {
                  haptics.selection();
                  setTempTag(tempTag => ({
                    ...tempTag,
                    color: colorName,
                  }));
                }}
                activeOpacity={0.8}
              >
                {tempTag.color === colorName && (
                  <Check width={22} height={22} color={colors.tags[colorName].text} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Button
            style={{
              marginTop: 16,
            }}
            onPress={onCreate}
            disabled={tempTag.title.length < MIN_TAG_LENGTH || tempTag.title.length > MAX_TAG_LENGTH}
          >{t('create')}</Button>
        </View>
      </View>
    </DismissKeyboard>
  );
}
