import { isEqual } from 'lodash';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Trash2 } from 'react-native-feather';
import { v4 as uuidv4 } from 'uuid';
import Button from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import LinkButton from '../../components/LinkButton';
import MenuList from '../../components/MenuList';
import MenuListItem from '../../components/MenuListItem';
import ModalHeader from '../../components/ModalHeader';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';
import { useLogs } from '../../hooks/useLogs';
import { useSegment } from '../../hooks/useSegment';
import { Tag, useSettings } from '../../hooks/useSettings';
import { useTemporaryLog } from '../../hooks/useTemporaryLog';
import { useTranslation } from '../../hooks/useTranslation';
import { RootStackScreenProps } from '../../types';
import { ColorInput } from './ColorInput';
import { TitleInput } from './TitleInput';

export const TagsModal = ({ navigation, route }: RootStackScreenProps<'Log'>) => {
  const haptics = useHaptics()
  const { settings, setSettings } = useSettings()
  const colors = useColors()
  const i18n = useTranslation()
  const segment = useSegment()
  const tempLog = useTemporaryLog();
  const { t } = useTranslation()
  const { state: { items }, dispatch } = useLogs();

  const scrollView = useRef(null)
  
  const [keyboardShown, setKeyboardShown] = useState(false)
  const [tags, setTags] = useState<Tag[]>(settings.tags);
  const [selectedTagIds, setSelectedTagIds] = useState<Tag['id'][]>([]);

  const [tempTag, setTempTag] = useState<Tag>({
    id: uuidv4(),
    title: '',
    color: Object.keys(colors.tags)[0] as Tag['color'],
  });
  
  useEffect(() => {
    if(
      Platform.OS === 'ios' &&
      keyboardShown && 
      scrollView.current
    ) {
      scrollView.current.scrollToEnd()
    }
  }, [keyboardShown])
  
  useEffect(() => {
    if(tempLog.data.tags?.length > 0) {
      setSelectedTagIds(tempLog.data.tags?.map(tag => tag.id))
    }

    const showSubscription = Keyboard.addListener('keyboardWillShow', () => {
      console.log('keyboardWillShow')
      setKeyboardShown(true)
    })

    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardShown(false)
    })
    
    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  const onDelete = (id: Tag['id']) => {
    const newTags = tags.filter((tag: Tag) => tag.id !== id)
    
    setSelectedTagIds(selectedTagIds.filter((tagId: Tag['id']) => tagId !== id))
    setTags(newTags)
    setSettings(settings => ({ ...settings, tags: newTags }))

    const changingItems = Object.keys(items)
      .filter((itemDate) => {
        const tagIds = items[itemDate].tags?.map((tag: Tag) => tag.id) || []
        return tagIds.includes(id);
      })

    changingItems.map(itemDate => {
      dispatch({
        type: 'edit',
        payload: {
          ...items[itemDate],
          tags: items[itemDate].tags?.filter((tag: Tag) => tag.id !== id) || [],
        }
      })
    })
  }

  const onSave = () => {
    tempLog.set(log => ({ ...log, tags: tags.filter(tag => selectedTagIds.includes(tag.id)) }))
    // performance: don't save if tags are the same
    if(!isEqual(tags, settings.tags)) {
      setSettings(settings => ({ ...settings, tags }))
    }
  }
  
  const askToDelete = (tag: Tag) => {
    haptics.selection()
    
    segment.track('delete_tag_asked')

    if(Platform.OS === 'web') {
      alert(i18n.t('delete_tag_confirm_title'))
      onDelete(tag.id)
      return;
    }
    
    Alert.alert(
      i18n.t('delete_tag_confirm_title'),
      i18n.t('delete_tag_confirm_message'),
      [
        {
          text: i18n.t('delete'),
          onPress: () => {
            const regexEmoji = /\p{Emoji}/u;
            segment.track('tag_delete_success', {
              titleLength: tag.title,
              color: tag.color,
              containsEmoji: regexEmoji.test(tag.title),      
            })
            onDelete(tag.id)
          },
          style: "destructive"
        },
        { 
          text: i18n.t('cancel'), 
          onPress: () =>  {
            segment.track('tag_delete_cancelled')
          },
          style: "cancel"
        }
      ],
      { cancelable: true }
    );
  }

  const onSubmitTag = () => {
    const regexEmoji = /\p{Emoji}/u;
    
    segment.track('tag_submit_success', {
      titleLength: tempTag.title.length,
      color: tempTag.color,
      containsEmoji: regexEmoji.test(tempTag.title)
    })
    
    setTags([...tags, tempTag])
    setSelectedTagIds([...selectedTagIds, tempTag.id])
    setTempTag({
      id: uuidv4(),
      title: '',
      color: Object.keys(colors.tags)[0] as Tag['color'],
    })

    Keyboard.dismiss();
  }
  
  return (
    <View style={{
      flex: 1,
      justifyContent: 'flex-start',
      backgroundColor: colors.background,
    }}>
      <ModalHeader
        title={'Tags'}
        right={
          <LinkButton 
            testID='tags-modal-submit' 
            onPress={() => {
              onSave()
              navigation.goBack();
            }}
            type='primary'
          >{t('save')}</LinkButton>
        }
        left={
          <LinkButton 
            testID='tags-modal-cancel' 
            onPress={() => {
              navigation.goBack();
            }}
            type='secondary'
            >{t('cancel')}</LinkButton>
        }
      />
      <ScrollView
        keyboardShouldPersistTaps='handled'
        ref={scrollView}
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            marginBottom: keyboardShown && Platform.OS === 'ios' ? 400 : 0,
          }}
        >
          <View
            style={{
              paddingTop: 16,
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            { tags.length < 1 && (
              <View
                style={{
                  padding: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    opacity: 0.5,
                    color: colors.text,
                  }}
                >{t('tags_empty')}. 👻</Text>
              </View>
            )}
            <MenuList>
              {tags.map((tag, index) => (
                <MenuListItem
                  key={`${tag}-${index}`}
                  onPress={() => {
                    if (selectedTagIds.includes(tag.id)) {
                      setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id))
                    } else {
                      setSelectedTagIds([...selectedTagIds, tag.id])
                    }
                  }}
                  isLast={index === tags.length - 1}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      {selectedTagIds.includes(tag.id) ? 
                        <Checkbox checked={true} /> :
                        <Checkbox checked={false} />
                      }
                    </View>
                    <View
                      style={{
                        flex: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                      }}
                    >
                      <Text style={{
                        fontSize: 17,
                        color: colors.text,
                      }}>{tag.title}</Text>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 100,
                          backgroundColor: colors.tags[tag.color].dot,
                          marginLeft: 8,
                        }}
                      />
                    </View>
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Pressable onPress={() => askToDelete(tag)}>
                        <Trash2 width={22} color={colors.tint} />
                      </Pressable>
                    </View>
                  </View>
                </MenuListItem>
              ))}
            </MenuList>
          </View>
          <Text
            style={{
              paddingLeft: 32,
              paddingRight: 32,
              paddingTop: 32,
              color: colors.textSecondary,
            }}
          >
            {t('tags_add')}
          </Text>
          <MenuList
            style={{
              marginTop: 8,
              marginLeft: 16,
              marginRight: 16,
            }}
          >
            <View
              style={{
                padding: 16,
                paddingBottom: 0,
              }}
            >
              <View
                style={{
                  borderBottomColor: colors.menuListItemBorder,
                  borderBottomWidth: 1,
                  paddingBottom: 8,
                }}
              >
                <ColorInput
                  value={tempTag.color}
                  onChange={(colorName) => setTempTag(tag => ({ ...tag, color: colorName }))}
                />
              </View>
            </View>
            <View
              style={{
                padding: 16,
              }}
            >
              <TitleInput
                value={tempTag.title}
                onChange={text => {
                  setTempTag(tag => ({ ...tag, title: text }))
                }}
                onSubmit={onSubmitTag}
              />
            </View>
          </MenuList>
          <View
            style={{
              marginTop: -8,
              padding: 16,
            }}
          >
            <Button 
              type='primary'
              onPress={onSubmitTag}
              disabled={tempTag.title.length < 1}
            >
              <Text>{t('tags_add')}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
