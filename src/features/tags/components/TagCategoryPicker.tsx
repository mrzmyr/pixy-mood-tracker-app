import { Platform, Text, View } from "react-native";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import RadioMark from "@/components/RadioMark";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { useTagsState } from "../TagsProvider";
import type { TagCategory } from "../TagsProvider";

const IS_ANDROID = Platform.OS === "android";

/**
 * Category choice in the tag forms: one radio row per category, in category
 * order, with the platform radio mark from {@link RadioMark}.
 */
const TagCategoryPicker = ({
  value,
  onChange,
}: {
  value: TagCategory["id"];
  onChange: (categoryId: TagCategory["id"]) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const { categories } = useTagsState();

  return (
    <View style={{ marginTop: 24 }}>
      <Text
        nativeID="tag-category-label"
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.textSecondary,
          paddingBottom: 8,
        }}
      >
        {t("tag_category")}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabelledBy="tag-category-label"
      >
        <MenuList>
          {categories.map((category) => {
            const checked = category.id === value;
            const select = () => {
              void haptics.selection();
              onChange(category.id);
            };
            const mark = <RadioMark selected={checked} onSelect={select} />;
            return (
              <MenuListItem
                key={category.id}
                testID={`tag-category-option-${category.id}`}
                title={category.title}
                checked={checked}
                onPress={select}
                // Material lists lead with the radio; iOS trails the mark.
                iconLeft={IS_ANDROID ? mark : null}
                iconRight={IS_ANDROID ? null : mark}
              />
            );
          })}
        </MenuList>
      </View>
    </View>
  );
};

export default TagCategoryPicker;
