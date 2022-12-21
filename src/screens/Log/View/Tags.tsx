import { useNavigation } from '@react-navigation/native';
import { t } from 'i18n-js';
import { Text, View } from 'react-native';
import Tag from '@/components/Tag';
import useColors from '../../../hooks/useColors';
import { LogItem } from '../../../hooks/useLogs';
import { useTagsState } from '../../../hooks/useTags';
import { Headline } from './Headline';

export const Tags = ({
  item,
}: {
  item: LogItem;
}) => {
  const colors = useColors();
  const { tags } = useTagsState();
  const navigation = useNavigation();

  return (
    <View
      style={{
        marginTop: 24,
      }}
    >
      <Headline>{t('tags')}</Headline>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {item && item.tags.length > 0 ? item.tags.map(tag => {
          const _tag = tags.find(t => t.id === tag.id);

          if (!_tag)
            return null;

          return (
            <Tag
              selected={false}
              key={tag.id}
              title={_tag.title}
              colorName={_tag.color}
              style={{
                backgroundColor: colors.entryBackground,
                borderColor: colors.entryItemBorder,
              }}
              onPress={() => {
                navigation.navigate('LogEdit', { id: item.id, step: 'tags' });
              }} />
          );
        }) : (
          <View
            style={{
              padding: 8,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 17 }}>{t('view_log_tags_empty')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};
