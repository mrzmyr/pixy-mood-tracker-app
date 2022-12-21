import { useNavigation } from "@react-navigation/native";
import { ScrollView, View } from "react-native";
import Tag from "@/components/Tag";
import useColors from "../../hooks/useColors";
import { LogItem } from "../../hooks/useLogs";
import { useTagsState } from "../../hooks/useTags";

export const EntryTags = ({
  item,
  isExpanded,
}: {
  item: LogItem;
  isExpanded: boolean;
}) => {
  const colors = useColors();
  const navigation = useNavigation();
  const tagsState = useTagsState();

  const content = (
    <View
      style={{
        paddingLeft: 16,
        paddingRight: 16,
        flexDirection: 'row',
        flexWrap: isExpanded ? 'wrap' : 'nowrap',
      }}
    >
      {item.tags.map((tag) => {
        const _tag = tagsState.tags.find((t) => t.id === tag.id);

        if (!_tag)
          return null;

        return (
          <Tag
            key={_tag.id}
            title={_tag.title}
            colorName={_tag.color}
            onPress={() => {
              navigation.navigate('LogView', {
                id: item.id,
              });
            }}
            style={{
              backgroundColor: colors.entryItemBackground,
              borderColor: colors.entryItemBorder,
            }}
          />
        );
      })}
    </View>
  )

  return (
    <View
      style={{
        flexDirection: 'row',
        marginLeft: -16,
        marginRight: -16,
      }}
    >
      {isExpanded && content}
      {!isExpanded && (
        <ScrollView
          horizontal
        >
          {content}
        </ScrollView>
      )}
    </View>
  );
};
