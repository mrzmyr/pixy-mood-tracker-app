import { View } from "react-native";
import { TagComponent as Tag } from "@/features/tags";
import type { Tag as ITag } from "@/features/tags";
import TextHeadline from "@/components/text-headline";
import { CHIP_FLOW } from "@/constants/chip";

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
  <View style={{ gap: 12 }}>
    <TextHeadline>Tags</TextHeadline>
    <View style={{ ...CHIP_FLOW, alignItems: "center" }}>
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
