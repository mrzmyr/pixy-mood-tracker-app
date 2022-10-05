import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import LinkButton from '../../components/LinkButton';
import MenuList from '../../components/MenuList';
import ModalHeader from '../../components/ModalHeader';
import useColors from '../../hooks/useColors';
import { Tag, useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { RootStackScreenProps } from '../../types';
import { TagListItem } from './TagListItem';

export const Tags = ({ navigation, route }: RootStackScreenProps<'Tags'>) => {
  const { settings } = useSettings()
  const colors = useColors()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets();

  const [tags, setTags] = useState<Tag[]>(settings.tags);

  useEffect(() => setTags(settings.tags), [JSON.stringify(settings.tags)])

  const onEdit = async (tag: Tag) => {
    navigation.navigate('TagEdit', { tag })
  }

  return (
    <View style={{
      flex: 1,
      justifyContent: 'flex-start',
      backgroundColor: colors.background,
      marginTop: Platform.OS === 'android' ? insets.top : 0,
    }}>
      <ModalHeader
        title={t('tags')}
        right={
          <LinkButton
            onPress={() => {
              navigation.goBack();
            }}
            type='primary'
          >{t('done')}</LinkButton>
        }
      />
      <View
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            backgroundColor: colors.background,
          }}
        >
          <View
            style={{
              paddingTop: 16,
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            {settings.tags.length < 1 && (
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
              {settings.tags.map((tag, index) => (
                <TagListItem
                  key={tag.id}
                  tag={tag}
                  isLast={index === tags.length - 1}
                  onPress={() => onEdit(tag)}
                />
              ))}
            </MenuList>
          <Button
            style={{
              marginTop: 16,
            }}
            onPress={() => {
              navigation.navigate('TagCreate')
            }}
          >{t('create_tag')}</Button>
          </View>
        </View>
      </View>
    </View>
  );
}
