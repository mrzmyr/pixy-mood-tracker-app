import { View } from "react-native";
import MenuListItem from "@/components/menu-list-item";
import useColors from "@/hooks/use-colors";
import type { Tag } from "../tags-provider";
import { RADIUS } from "@/constants/radius";
import { Label } from "@/components/typography";
import { useFeatureFlag } from "@/state/feature-flags";
import { TagIcon } from "./tag-icon";

/** Space before the title; dot and icon both end here, so titles align. */
const LEAD_WIDTH = 30;
const ICON_SIZE = 20;
const DOT_SIZE = 10;

/** Row for one tag in {@link TagList}, showing its icon or color dot and title. */
export const TagListItem = ({
  tag,
  onPress,
}: {
  tag: Tag;
  onPress: () => void;
}) => {
  const colors = useColors();
  const hasTagIcons = useFeatureFlag("tag-icons");

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
          <View style={{ width: LEAD_WIDTH }}>
            {hasTagIcons ? (
              <TagIcon icon={tag.icon} color={tag.color} size={ICON_SIZE} />
            ) : (
              <View
                style={{
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: RADIUS.full,
                  backgroundColor: colors.tags[tag?.color]?.dot,
                  marginLeft: 4,
                }}
              />
            )}
          </View>
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
