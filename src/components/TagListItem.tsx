import { Text, View } from 'react-native';
import { Edit2 } from 'react-native-feather';
import MenuListItem from '@/components/MenuListItem';
import useColors from '../hooks/useColors';
import { Tag } from '../hooks/useTags';

export const TagListItem = ({
  tag, isLast, onPress,
}: {
  tag: Tag;
  isLast: boolean;
  onPress: (tag: Tag) => void;
}) => {
  const colors = useColors();

  return (
    <MenuListItem
      onPress={onPress}
      isLast={isLast}
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
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 100,
              backgroundColor: colors.tags[tag?.color]?.dot,
              marginRight: 16,
              marginLeft: 4,
            }}
          />
          <Text
            numberOfLines={1}
            style={{
              fontSize: 17,
              color: colors.text,
              maxWidth: '80%',
            }}
          >{tag.title}</Text>
        </View>
        <View
          style={{
          }}
        >
          <Edit2 width={20} color={colors.tint} />
        </View>
      </View>
    </MenuListItem>
  );
};
