import { useRouter } from "expo-router";
import { Platform, Text, View } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable from "react-native-sortables";
import type {
  SortableGridDragEndParams,
  SortableGridRenderItemInfo,
} from "react-native-sortables";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuListItem from "@/components/menu-list-item";
import RouteModalHeader from "@/components/route-modal-header";
import TextInfo from "@/components/text-info";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { cardCorners } from "@/components/sortable/card-corners";
import { ReorderHandle } from "@/components/sortable/reorder-handle";
import { getGeneralCategoryTitle } from "../tag-categories";
import { useTagsState, useTagsUpdater } from "../tags-provider";
import type { TagCategory } from "../tags-provider";

const IS_IOS = Platform.OS === "ios";

/**
 * Manage tag categories: drag to reorder, tap to rename or delete. Users
 * can't add categories. The order is the order of the check-in and the tag
 * settings.
 *
 * - `modal` (default): sheet from the check-in, own close header
 * - `page`: pushed from Settings > Tags. iOS shows back in the bar
 */
export const TagCategories = ({
  variant = "modal",
}: {
  variant?: "modal" | "page";
}) => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { tags, categories } = useTagsState();
  const { reorderCategories } = useTagsUpdater();
  const general = getGeneralCategoryTitle(categories);
  const isNativePage = variant === "page" && IS_IOS;

  const reorder = (
    ids: TagCategory["id"][],
    method: "drag" | "accessibility_action"
  ) => {
    analytics.track("tags:categories_reordered", {
      categories_count: ids.length,
      method,
    });
    reorderCategories(ids);
  };

  const onDragEnd = ({
    data,
    fromIndex,
    toIndex,
  }: SortableGridDragEndParams<TagCategory>) => {
    if (fromIndex !== toIndex) {
      reorder(
        data.map((category) => category.id),
        "drag"
      );
    }
  };

  const onMove = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= categories.length) {
      return;
    }
    const ids = categories.map((category) => category.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder(ids, "accessibility_action");
  };

  const renderItem = ({
    item,
    index,
  }: SortableGridRenderItemInfo<TagCategory>) => {
    const isFirst = index === 0;
    const isLast = index === categories.length - 1;
    const count = tags.filter(
      (tag) => tag.categoryId === item.id && !tag.isArchived
    ).length;

    return (
      <View
        style={{
          backgroundColor: colors.menuListItemBackground,
          overflow: "hidden",
          ...cardCorners(isFirst, isLast),
        }}
      >
        <View style={{ marginTop: isFirst && IS_IOS ? -1 : 0 }}>
          <MenuListItem
            testID={`tag-category-row-${item.id}`}
            title={item.title}
            onPress={() =>
              router.push({
                pathname: "/tags/categories/[id]",
                params: { id: item.id },
              })
            }
            iconRight={
              <Text
                style={{
                  fontSize: 17,
                  color: colors.textSecondary,
                  fontVariant: ["tabular-nums"],
                  marginRight: 36,
                }}
              >
                {count}
              </Text>
            }
          />
          <View style={{ position: "absolute", top: 0, right: 0, bottom: 0 }}>
            <ReorderHandle
              testID={`tag-category-drag-handle-${item.id}`}
              label={t("tags_reorder_handle", { title: item.title })}
              onMove={(offset) => onMove(index, offset)}
            />
          </View>
        </View>
      </View>
    );
  };

  const list = (
    <Animated.ScrollView
      ref={scrollRef}
      // A page lets iOS inset the content below the bar.
      contentInsetAdjustmentBehavior={isNativePage ? "automatic" : "never"}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: 16,
        paddingBottom: isNativePage ? 32 : insets.bottom + 32,
      }}
    >
      <View style={{ paddingHorizontal: IS_IOS ? 16 : 0 }}>
        <Sortable.Grid
          columns={1}
          data={categories}
          keyExtractor={(category) => category.id}
          renderItem={renderItem}
          onDragEnd={onDragEnd}
          customHandle
          // Handles only drag, so the drag starts on touch like iOS reorder controls.
          dragActivationDelay={0}
          hapticsEnabled
          overDrag="vertical"
          activeItemScale={1.03}
          scrollableRef={scrollRef}
        />
      </View>
      <TextInfo style={{ marginHorizontal: 16 }}>
        {t("tag_categories_info", { general })}
      </TextInfo>
    </Animated.ScrollView>
  );

  if (isNativePage) {
    return list;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {variant === "modal" && (
        <RouteModalHeader
          title={t("tag_categories")}
          onClose={() => router.back()}
          closeTestID="tag-categories-close"
        />
      )}
      {list}
    </View>
  );
};
