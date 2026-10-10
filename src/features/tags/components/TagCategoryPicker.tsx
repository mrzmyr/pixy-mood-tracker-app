import { Circle, CircleCheck } from "lucide-react-native";
import { Text, View } from "react-native";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { useTagsState } from "../TagsProvider";
import type { TagCategory } from "../TagsProvider";

/**
 * Category choice in the tag forms: one radio row per category, in category
 * order. Radio marks match the App Icon screen.
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
            return (
              <MenuListItem
                key={category.id}
                testID={`tag-category-option-${category.id}`}
                title={category.title}
                checked={checked}
                onPress={() => {
                  void haptics.selection();
                  onChange(category.id);
                }}
                iconRight={
                  checked ? (
                    <CircleCheck
                      size={24}
                      color={colors.background}
                      fill={colors.tint}
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      size={24}
                      color={colors.textSecondary}
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  )
                }
              />
            );
          })}
        </MenuList>
      </View>
    </View>
  );
};

export default TagCategoryPicker;
