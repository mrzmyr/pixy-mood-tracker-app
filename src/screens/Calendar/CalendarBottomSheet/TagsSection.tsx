import { View } from "react-native";
import Tag from "@/components/Tag";
import TextHeadline from "@/components/TextHeadline";
import type { Tag as ITag } from "@/hooks/useTags";

/**
 * Tag filter chips; `onSelect` receives the tapped tag so the parent can
 * toggle it.
 */
export const TagsSection = ({
  tags,
  selectedTags,
  onSelect,
}: {
  tags: ITag[];
  selectedTags: ITag[];
  onSelect: (tag: ITag) => void;
}) => (
  <View>
    <TextHeadline style={{ marginBottom: 12 }}>Tags</TextHeadline>
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {tags?.map((tag) => (
        <Tag
          selected={selectedTags.map((d) => d.id).includes(tag.id)}
          onPress={() => onSelect(tag)}
          key={tag.id}
          colorName={tag.color}
          title={tag.title}
        />
      ))}
    </View>
  </View>
);
