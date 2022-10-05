import { useState } from 'react';
import { Alert, Platform, TextInput, TouchableOpacity, View } from 'react-native';
import { Check } from 'react-native-feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import Button from '../components/Button';
import DismissKeyboard from '../components/DismisKeyboard';
import LinkButton from '../components/LinkButton';
import ModalHeader from '../components/ModalHeader';
import TextInputLabel from '../components/TextInputLabel';
import useColors from '../hooks/useColors';
import useHaptics from '../hooks/useHaptics';
import { useLogs } from '../hooks/useLogs';
import { useSegment } from '../hooks/useSegment';
import { COLOR_NAMES, Tag as ITag, useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackScreenProps } from '../types';

const REGEX_EMOJI = /\p{Emoji}/u;

export const TagEdit = ({ navigation, route }: RootStackScreenProps<'TagEdit'>) => {
  const { t } = useTranslation()
  const colors = useColors()
  const haptics = useHaptics()
  const insets = useSafeAreaInsets();
  const { setSettings } = useSettings()
  const { state: { items }, dispatch } = useLogs()
  const segment = useSegment()
  
  const tagExists = route.params.tag !== undefined;
  const defaultTag = tagExists ? route.params.tag : {
    id: uuidv4(),
    title: '',
    color: 'slate',
  } as ITag;
  
  const [tag, setTag] = useState(tagExists ? route.params.tag : defaultTag);
  
  const edit = () => {
    const newItems = Object.keys(items)
      .map(key => {
        const item = items[key];
        const tags = item?.tags?.map(itemTag => {
          if (itemTag.id === tag.id) {
            return tag;
          }
          return itemTag;
        }) || [];
        return {
          ...item,
          tags
        }
      })

    dispatch({
      type: 'batchEdit',
      payload: {
        items: newItems
      }
    })

    setSettings(settings => ({
      ...settings,
      tags: settings.tags.map((itemTag: ITag) => {
        return (itemTag.id === tag.id ? tag : itemTag)
      }
    )}))
  }

  const askToDelete = async (tag: ITag) => {
    await haptics.selection()
    
    segment.track('delete_tag_ask', {
      titleLength: tag.title,
      color: tag.color,
      containsEmoji: REGEX_EMOJI.test(tag.title),
    })
    
    Alert.alert(
      t('delete_tag_confirm_title'),
      t('delete_tag_confirm_message'),
      [
        {
          text: t('delete'),
          onPress: () => {
            segment.track('tag_delete_success', {
              titleLength: tag.title,
              color: tag.color,
              containsEmoji: REGEX_EMOJI.test(tag.title),      
            })
            onDelete(tag.id)
          },
          style: "destructive"
        },
        { 
          text: t('cancel'), 
          onPress: () =>  {
            segment.track('tag_delete_cancelled')
          },
          style: "cancel"
        }
      ],
      { cancelable: true }
    );
  }
  
  const onDelete = (id: ITag['id']) => {
    setSettings(settings => ({ 
      ...settings, 
      tags: settings.tags.filter((tag: ITag) => tag.id !== id) 
    }))

    const newItems = Object.keys(items)
      .map(key => {
        const item = items[key];
        const tags = item?.tags?.filter(itemTag => itemTag.id !== id) || [];
        return {
          ...item,
          tags
        }
      })

    dispatch({
      type: 'batchEdit',
      payload: {
        items: newItems
      }
    })

    navigation.goBack()
  }
  
  const onSubmit = () => {
    edit()
    navigation.goBack();
  }
  
  return (
    <DismissKeyboard>
      <View style={{
        flex: 1,
        justifyContent: 'flex-start',
        backgroundColor: colors.background,
        marginTop: Platform.OS === 'android' ? insets.top : 0,
      }}>
        <ModalHeader
          title={t('edit_tag')}
          right={
            <LinkButton 
              onPress={onSubmit}
              disabled={tag.title.length === 0 || tag.title.length > 30}
              type='primary'
            >{t('save')}</LinkButton>
          }
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
          <TextInputLabel>{t('title')}</TextInputLabel>
          <TextInput
            autoCorrect={false}
            style={{
              fontSize: 17,
              color: colors.textInputText,
              backgroundColor: colors.textInputBackground,
              width: '100%',
              padding: 16,
              borderRadius: 8,
            }}
            placeholder={t('tags_add_placeholder')}
            placeholderTextColor={colors.textInputPlaceholder}
            maxLength={30}
            value={tag.title}
            onChangeText={text => {
              setTag(tag => ({
                ...tag,
                title: text,
              }))
            }}
          />
          <TextInputLabel>{t('color')}</TextInputLabel>
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
                onPress={async () => {
                  await haptics.selection();
                  setTag(tag => ({
                    ...tag,
                    color: colorName,
                  }));
                }}
                activeOpacity={0.8}
              >
                {tag.color === colorName && (
                  <Check width={20} height={20} color={colors.tags[colorName].text} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            <Button
              style={{
                flex: 1,
                width: '100%',
              }}
              onPress={() => askToDelete(tag)}
              type='danger'
            >{t('delete')}</Button>
          </View>
        </View>
      </View>
    </DismissKeyboard>
  );
}
