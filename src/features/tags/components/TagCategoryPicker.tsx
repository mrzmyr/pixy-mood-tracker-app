import { Pressable, Text, View, useColorScheme } from "react-native";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { useTagsState } from "../TagsProvider";
import type { TagCategory } from "../TagsProvider";

/**
 * Category choice in the tag forms: one radio chip per category, in
 * category order. Chips wrap, so all categories stay visible.
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
  const colorScheme = useColorScheme();
  const { categories } = useTagsState();
  const borderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

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
        style={{ flexDirection: "row", flexWrap: "wrap" }}
      >
        {categories.map((category) => {
          const selected = category.id === value;
          return (
            <Pressable
              key={category.id}
              testID={`tag-category-option-${category.id}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={category.title}
              onPress={() => {
                void haptics.selection();
                onChange(category.id);
              }}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: 16,
                marginRight: 8,
                marginBottom: 8,
                borderRadius: RADIUS.full,
                borderWidth: 1,
                borderColor: selected ? colors.tint : borderColor,
                backgroundColor: selected
                  ? colors.tagBackgroundActive
                  : colors.tagBackground,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 17,
                  color: selected ? colors.tagTextActive : colors.tagText,
                }}
              >
                {category.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default TagCategoryPicker;
