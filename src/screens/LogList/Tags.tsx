import useColors from '@/hooks/useColors';
import { LogItem } from '@/hooks/useLogs';
import { useTagsState } from '@/hooks/useTags';
import { useNavigation } from '@react-navigation/native';
import { t } from 'i18n-js';
import { Text, View, useColorScheme } from 'react-native';
import { SectionHeader } from './SectionHeader';

const Tag = ({
  title,
  colorName,
  style = {},
}: {
  title: string;
  colorName: string;
  style?: any;
}) => {
  const colors = useColors();
  const colorScheme = useColorScheme();

  return (
    <View
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderRadius: 100,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: colors.tagBackground,
        borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        ...style,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 8,
          marginRight: 10,
          backgroundColor: colors.tags[colorName]?.dot,
        }}
      />
      <Text style={{
        color: colors.tagText,
        fontSize: 17,
      }}>{title}</Text>
    </View>
  )
};

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
      }}
    >
      <SectionHeader
        title={t('tags')}
        onEdit={() => {
          navigation.navigate('LogEdit', {
            id: item.id,
            step: 'tags',
          });
        }}
      />
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
              key={tag.id}
              title={_tag.title}
              colorName={_tag.color}
              style={{
                backgroundColor: colors.entryBackground,
                borderColor: colors.entryItemBorder,
              }}
            />
          );
        }) : (
          <View
            style={{
              paddingTop: 4,
              paddingBottom: 8,
              paddingHorizontal: 8,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 17 }}>{t('view_log_tags_empty')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};
