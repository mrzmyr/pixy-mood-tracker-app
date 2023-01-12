import { useState } from 'react';
import { Platform, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { Check } from 'react-native-feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import Alert from '@/components/Alert';
import Button from '@/components/Button';
import DismissKeyboard from '@/components/DismisKeyboard';
import LinkButton from '@/components/LinkButton';
import ModalHeader from '@/components/ModalHeader';
import { MAX_TAG_LENGTH, MIN_TAG_LENGTH, TAG_COLOR_NAMES } from '@/constants/Config';
import { t } from '@/helpers/translation';
import { useAnalytics } from '../hooks/useAnalytics';
import useColors from '../hooks/useColors';
import useHaptics from '../hooks/useHaptics';
import { Tag as ITag, useTagsState, useTagsUpdater } from '../hooks/useTags';
import { RootStackScreenProps } from '../../types';
import MenuList from '@/components/MenuList';
import MenuListItem from '@/components/MenuListItem';
import TextInfo from '@/components/TextInfo';

const REGEX_EMOJI = /\p{Emoji}/u;

export const TagEdit = ({ navigation, route }: RootStackScreenProps<'TagEdit'>) => {
  const colors = useColors()
  const haptics = useHaptics()
  const insets = useSafeAreaInsets();
  const tagState = useTagsState()
  const tagsUpdater = useTagsUpdater()
  const analytics = useAnalytics()

  const tagExists = tagState.tags.find(tag => tag.id === route.params.id)
  const defaultTag = tagExists ? tagExists : {
    id: uuidv4(),
    title: '',
    color: 'slate',
  } as ITag;

  const [tag, setTag] = useState(tagExists ? tagExists : defaultTag);

  const askToDelete = async (tag: ITag) => {
    await haptics.selection()

    analytics.track('delete_tag_ask', {
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
            analytics.track('tag_delete_success', {
              titleLength: tag.title,
              color: tag.color,
              containsEmoji: REGEX_EMOJI.test(tag.title),
            })
            onDelete(tag)
          },
          style: "destructive"
        },
        {
          text: t('cancel'),
          onPress: () => {
            analytics.track('tag_delete_cancelled')
          },
          style: "cancel"
        }
      ],
      { cancelable: true }
    );
  }

  const onDelete = (tag: ITag) => {
    tagsUpdater.deleteTag(tag.id)
    navigation.goBack()
  }

  const onSubmit = (tag: ITag) => {
    tagsUpdater.updateTag(tag)
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
            value={tag.title}
            onChangeText={text => {
              setTag(tag => ({
                ...tag,
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
            }}
          >
            {TAG_COLOR_NAMES.map(colorName => (
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
                  <Check width={20} height={20} color={colors.palette.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <MenuList
            style={{
              marginTop: 16,
            }}
          >
            <MenuListItem
              title={t('archive_tag_enabled')}
              iconRight={
                <Switch
                  ios_backgroundColor={colors.backgroundSecondary}
                  onValueChange={() => {
                    setTag(tag => ({
                      ...tag,
                      isArchived: !tag.isArchived,
                    }));
                  }}
                  value={tag.isArchived}
                />
              }
              isLast
            />
          </MenuList>
          <TextInfo>{t('archive_tag_description')}</TextInfo>

          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 32,
            }}
          >
            <Button
              style={{
                width: '100%',
              }}
              onPress={() => onSubmit(tag)}
              type='primary'
              disabled={tag?.title?.length < MIN_TAG_LENGTH || tag?.title?.length > MAX_TAG_LENGTH}
            >{t('save')}</Button>
            <Button
              style={{
                marginTop: 12,
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
