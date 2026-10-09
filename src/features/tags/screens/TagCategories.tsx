import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Text, View } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable from "react-native-sortables";
import type {
  SortableGridDragEndParams,
  SortableGridRenderItemInfo,
} from "react-native-sortables";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import { CloseButton } from "@/components/CloseButton";
import MenuListItem from "@/components/MenuListItem";
import ModalHeader from "@/components/ModalHeader";
import TextInfo from "@/components/TextInfo";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { cardCorners } from "../components/cardCorners";
import { ReorderHandle } from "../components/ReorderHandle";
import { GENERAL_CATEGORY_ID, MAX_TAG_CATEGORIES } from "../tagCategories";
import { useTagsState, useTagsUpdater } from "../TagsProvider";
import type { TagCategory } from "../TagsProvider";

const IS_IOS = Platform.OS === "ios";

/**
 * Manage tag categories: drag to reorder, tap to rename or delete, and add
 * new ones up to {@link MAX_TAG_CATEGORIES}. The order is the order of the
 * check-in and the tag settings.
 */
export const TagCategories = () => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { tags, categories } = useTagsState();
  const { reorderCategories } = useTagsUpdater();
  const general =
    categories.find((category) => category.id === GENERAL_CATEGORY_ID)?.title ??
    t("tag_category_general");
  const reachedMax = categories.length >= MAX_TAG_CATEGORIES;

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

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        marginTop: Platform.OS === "android" ? insets.top : 0,
      }}
    >
      <ModalHeader
        title={t("tag_categories")}
        right={
          <CloseButton
            testID="tag-categories-close"
            onPress={() => router.back()}
          />
        }
      />
      <Animated.ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 120,
        }}
      >
        <View style={{ paddingHorizontal: 16 }}>
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
      <LinearGradient
        pointerEvents="none"
        colors={[colors.logBackgroundTransparent, colors.background]}
        style={{
          position: "absolute",
          height: 120 + insets.bottom,
          bottom: 0,
          width: "100%",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 16,
          width: "100%",
          paddingHorizontal: 16,
        }}
      >
        {reachedMax ? (
          <View
            testID="tag-categories-limit-notice"
            accessibilityRole="alert"
            style={{
              backgroundColor: colors.cardBackground,
              padding: 16,
              borderRadius: RADIUS.md,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 15 }}>
              {t("tag_categories_reached_max", {
                max_count: MAX_TAG_CATEGORIES,
              })}
            </Text>
          </View>
        ) : (
          <Button
            testID="tag-category-create"
            onPress={() => router.push("/tags/categories/create")}
          >
            {t("tag_category_create")}
          </Button>
        )}
      </View>
    </View>
  );
};
