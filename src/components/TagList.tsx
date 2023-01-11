import { Text, View } from 'react-native';
import MenuList from '@/components/MenuList';
import { MAX_TAGS } from '@/constants/Config';
import { t } from '@/helpers/translation';
import useColors from '../hooks/useColors';
import { Tag } from '../hooks/useTags';
import { TagListItem } from '@/components/TagListItem';
import { useNavigation } from '@react-navigation/native';

export const TagList = ({ tags }: { tags: Tag[]; }) => {
  const colors = useColors();
  const navigation = useNavigation();

  const onEdit = async (tag: Tag) => {
    navigation.navigate('TagEdit', { id: tag.id })
  }

  return (
    <View
      style={{
        backgroundColor: colors.background,
      }}
    >
      {tags.length >= MAX_TAGS && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            padding: 16,
            marginTop: 16,
            marginHorizontal: 16,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
            }}
          >{t('tags_reached_max', { max_count: MAX_TAGS })}</Text>
        </View>
      )}
      <View
        style={{
          paddingTop: 16,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {tags.length < 1 && (
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
        <MenuList
          style={{
            marginBottom: 40
          }}
        >
          {tags.map((tag, index) => (
            <TagListItem
              key={tag.id}
              tag={tag}
              isLast={index === tags.length - 1}
              onPress={() => onEdit(tag)} />
          ))}
        </MenuList>
      </View>
    </View>
  );
};
