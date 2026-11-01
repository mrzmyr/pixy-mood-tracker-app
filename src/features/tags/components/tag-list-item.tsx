import { View } from "react-native";
import MenuListItem from "@/components/menu-list-item";
import useColors from "@/hooks/use-colors";
import type { Tag } from "../tags-provider";
import { RADIUS } from "@/constants/radius";
import { Label } from "@/components/typography";

/** Row for one tag in {@link TagList}, showing its color dot and title. */
export const TagListItem = ({
  tag,
  onPress,
}: {
  tag: Tag;
  onPress: () => void;
}) => {
  const colors = useColors();

  return (
    <MenuListItem onPress={onPress}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: RADIUS.full,
              backgroundColor: colors.tags[tag?.color]?.dot,
              marginRight: 16,
              marginLeft: 4,
            }}
          />
          <Label
            size={16}
            numberOfLines={1}
            style={{
              color: colors.text,
              maxWidth: "80%",
            }}
          >
            {tag.title}
          </Label>
        </View>
      </View>
    </MenuListItem>
  );
};
