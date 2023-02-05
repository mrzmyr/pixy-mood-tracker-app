import { RootStackScreenProps } from '../../../types';
import { TagList } from '../../components/TagList';
import useColors from '../../hooks/useColors';
import { Tag, useTagsState } from '../../hooks/useTags';
import Button from '@/components/Button';
import MenuList from '@/components/MenuList';
import MenuListItem from '@/components/MenuListItem';
import { TagListItem } from '@/components/TagListItem';
import { MAX_TAGS } from '@/constants/Config';
import { t } from '@/helpers/translation';
import { LinearGradient } from 'expo-linear-gradient';
import _ from 'lodash';
import { Archive } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SettingsTags = ({ navigation }: RootStackScreenProps<'SettingsTags'>) => {
  const colors = useColors()
  const insets = useSafeAreaInsets();
  const { tags } = useTagsState()

  const _tags = tags.filter((tag: Tag) => !tag.isArchived)

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background,
    }}>
      {
        tags.length < MAX_TAGS && (
          <>
            <LinearGradient
              pointerEvents="none"
              colors={[colors.logBackgroundTransparent, colors.background, colors.background]}
              style={{
                position: 'absolute',
                height: 120 + insets.bottom,
                bottom: 0,
                zIndex: 1,
                width: '100%',
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 16,
                position: 'absolute',
                bottom: insets.bottom + 16,
                width: '100%',
                zIndex: 2,
              }}
            >
              <Button
                style={{
                  marginTop: 16,
                  width: '100%',
                }}
                onPress={() => {
                  navigation.navigate('TagCreate')
                }}
              >{t('create_tag')}</Button>
            </View>
          </>
        )
      }
      <ScrollView>
        <View
          style={{
            marginTop: 16,
            marginHorizontal: 16,
          }}
        >
          <MenuList
            style={{
            }}
          >
            <MenuListItem
              title={t('archive_tag')}
              iconLeft={<Archive size={20} color={colors.text} />}
              isLink
              isLast
              onPress={() => {
                navigation.navigate('SettingsTagsArchive')
              }}
            />
          </MenuList>
        </View>

        <TagList tags={_tags} />
        <View
          style={{
            width: '100%',
            height: insets.bottom + 56,
          }}
        />
      </ScrollView>
    </View>
  );
}

export const SettingsTagsArchive = ({ navigation }: RootStackScreenProps<'SettingsTagsArchive'>) => {
  const colors = useColors()
  const insets = useSafeAreaInsets();
  const { tags } = useTagsState()

  const _tags = _.sortBy(tags.filter((tag: Tag) => tag.isArchived), 'title')

  const onEdit = async (tag: Tag) => {
    navigation.navigate('TagEdit', { id: tag.id })
  }

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background,
    }}>
      <ScrollView
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            paddingTop: 16,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          {_tags.length < 1 && (
            <View
              style={{
                padding: 32,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                }}
              >{t('tags_archive_empty')}</Text>
            </View>
          )}
          <MenuList
            style={{
              marginBottom: 40
            }}
          >
            {_tags.map((tag, index) => (
              <TagListItem
                key={tag.id}
                tag={tag}
                isLast={index === _tags.length - 1}
                onPress={() => onEdit(tag)} />
            ))}
          </MenuList>
        </View>
        <View
          style={{
            width: '100%',
            height: insets.bottom + 56,
          }}
        />
      </ScrollView>
    </View>
  );
}