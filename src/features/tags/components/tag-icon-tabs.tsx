import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DuotoneIcon } from "@/components/duotone-icon";
import { SPACE } from "@/constants/space";
import useColors from "@/hooks/use-colors";
import { tDynamic } from "@/lib/translation";
import { TAG_ICON_CATEGORIES, TAG_ICONS } from "../tag-icons";
import type { TagIconCategoryId } from "../tag-icons";

const TAB_SIZE = 36;
const ICON_SIZE = 20;
/** Tabs draw in neutral text colors, with a lighter tint than tag icons. */
const TAB_TINT_OPACITY = 0.2;

/**
 * Category tabs under the picker grid. A tap jumps to the category. The
 * tapped tab stays highlighted.
 */
export const TagIconTabs = ({
  active,
  onJump,
}: {
  active: TagIconCategoryId | null;
  onJump: (category: TagIconCategoryId) => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        borderTopWidth: 1,
        borderTopColor: colors.chipBackground,
        paddingTop: SPACE.sm,
        paddingHorizontal: SPACE.sm,
        paddingBottom: Math.max(insets.bottom, SPACE.sm),
      }}
    >
      {TAG_ICON_CATEGORIES.map((category) => {
        const isActive = active === category.id;
        const tint = isActive ? colors.text : colors.textSecondary;
        return (
          <Pressable
            key={category.id}
            accessibilityRole="tab"
            accessibilityLabel={tDynamic(`tag_icon_category_${category.id}`)}
            accessibilityState={{ selected: isActive }}
            testID={`tag-icon-tab-${category.id}`}
            onPress={() => onJump(category.id)}
            hitSlop={SPACE.xs}
            style={{
              width: TAB_SIZE,
              height: TAB_SIZE,
              borderRadius: TAB_SIZE / 2,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isActive ? colors.chipBackground : "transparent",
            }}
          >
            <DuotoneIcon
              icon={TAG_ICONS[category.tab].icon}
              stroke={tint}
              tint={tint}
              tintOpacity={TAB_TINT_OPACITY}
              size={ICON_SIZE}
            />
          </Pressable>
        );
      })}
    </View>
  );
};
