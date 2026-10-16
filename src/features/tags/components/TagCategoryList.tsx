import { useRouter } from "expo-router";
import { Platform, Text, View } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable from "react-native-sortables";
import type {
  SortableGridDragEndParams,
  SortableGridRenderItemInfo,
} from "react-native-sortables";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import MenuListHeadline from "@/components/MenuListHeadline";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import {
  groupTagsByCategory,
  moveTag,
  toTagArrangement,
  toTagCategoryRows,
} from "../tagCategories";
import type { TagArrangement, TagCategoryRow } from "../tagCategories";
import { useTagsState, useTagsUpdater } from "../TagsProvider";
import type { Tag } from "../TagsProvider";
import { cardCorners } from "./cardCorners";
import { ReorderHandle } from "./ReorderHandle";
import { TagRow } from "./TagRow";

const IS_IOS = Platform.OS === "ios";

const isCategoryChanged = (tags: Tag[], arrangement: TagArrangement[]) => {
  const categoryById = new Map(tags.map((tag) => [tag.id, tag.categoryId]));
  return arrangement.some(({ categoryId, tagIds }) =>
    tagIds.some((id) => categoryById.get(id) !== categoryId)
  );
};

/**
 * Active tags grouped by category, in one scrolling list. Drag a tag by its
 * handle to reorder it or move it into another category: a tag belongs to
 * the nearest category header above it. Headers open the category editor.
 * Archived tags are hidden and keep their category.
 */
export const TagCategoryList = ({
  header,
}: {
  /** Rendered above the first category, inside the scroll view. */
  header?: React.ReactElement;
}) => {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { tags, categories } = useTagsState();
  const { arrangeTags } = useTagsUpdater();

  const activeTags = tags.filter((tag) => !tag.isArchived);
  const rows = toTagCategoryRows(groupTagsByCategory(activeTags, categories));

  const arrange = (
    arrangement: TagArrangement[],
    method: "drag" | "accessibility_action"
  ) => {
    analytics.track("tags:tags_arranged", {
      tags_count: activeTags.length,
      categories_count: categories.length,
      category_changed: isCategoryChanged(activeTags, arrangement),
      method,
    });
    arrangeTags(arrangement);
  };

  const onDragEnd = ({
    data,
    fromIndex,
    toIndex,
  }: SortableGridDragEndParams<TagCategoryRow>) => {
    if (fromIndex !== toIndex) {
      arrange(toTagArrangement(data), "drag");
    }
  };

  const onMove = (tagId: Tag["id"], offset: -1 | 1) => {
    const arrangement = moveTag(toTagArrangement(rows), tagId, offset);
    if (arrangement) {
      arrange(arrangement, "accessibility_action");
    }
  };

  const renderItem = ({ item }: SortableGridRenderItemInfo<TagCategoryRow>) => {
    if (item.type === "category") {
      const headline = (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            marginTop: item.index === 0 ? 24 : 32,
            marginBottom: 4,
          }}
        >
          <MenuListHeadline
            style={{ flex: 1, width: "auto", marginTop: 0, marginBottom: 4 }}
          >
            {item.category.title}
          </MenuListHeadline>
          <LinkButton
            testID={`tag-category-edit-${item.category.id}`}
            accessibilityLabel={t("tag_category_edit_named", {
              title: item.category.title,
            })}
            onPress={() =>
              router.push({
                pathname: "/tags/categories/[id]",
                params: { id: item.category.id },
              })
            }
            style={{ fontSize: 15, marginRight: IS_IOS ? 0 : 8 }}
          >
            {t("edit")}
          </LinkButton>
        </View>
      );
      // Nothing may land above the first header, so it keeps its slot.
      return item.index === 0 ? (
        <Sortable.Handle mode="fixed-order">{headline}</Sortable.Handle>
      ) : (
        headline
      );
    }

    if (item.type === "empty") {
      return (
        <View
          testID={`tag-category-empty-${item.category.id}`}
          style={{
            minHeight: 50,
            justifyContent: "center",
            paddingHorizontal: 16,
            backgroundColor: colors.menuListItemBackground,
            ...cardCorners(true, true),
          }}
        >
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>
            {t("tag_category_empty")}
          </Text>
        </View>
      );
    }

    return (
      // Own background so a dragged row stays opaque above the others.
      <View
        style={{
          backgroundColor: colors.menuListItemBackground,
          overflow: "hidden",
          ...cardCorners(item.isFirst, item.isLast),
        }}
      >
        {/* Rows draw a top divider; the shift hides it on the first row. */}
        <View style={{ marginTop: item.isFirst && IS_IOS ? -1 : 0 }}>
          <TagRow
            tag={item.tag}
            onPress={() =>
              router.push({
                pathname: "/tags/[id]",
                params: { id: item.tag.id },
              })
            }
            dragHandle={
              <ReorderHandle
                testID={`tag-drag-handle-${item.tag.id}`}
                label={t("tags_reorder_handle", { title: item.tag.title })}
                onMove={(offset) => onMove(item.tag.id, offset)}
              />
            }
          />
        </View>
      </View>
    );
  };

  return (
    <Animated.ScrollView
      ref={scrollRef}
      testID="tag-category-list"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
    >
      {header}
      {/* Android lists run full width (Material); iOS groups are inset. */}
      <View style={{ paddingHorizontal: IS_IOS ? 16 : 0 }}>
        <Sortable.Grid
          columns={1}
          data={rows}
          keyExtractor={(row) => row.key}
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
    </Animated.ScrollView>
  );
};
