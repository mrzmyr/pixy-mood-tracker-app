import { Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Text, View } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable from "react-native-sortables";
import type {
  SortableGridDragEndParams,
  SortableGridRenderItemInfo,
} from "react-native-sortables";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/button";
import MenuListItem from "@/components/menu-list-item";
import RouteModalHeader from "@/components/route-modal-header";
import TextInfo from "@/components/text-info";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { cardCorners } from "@/components/sortable/card-corners";
import { ReorderHandle } from "@/components/sortable/reorder-handle";
import { getGeneralCategoryTitle, MAX_TAG_CATEGORIES } from "../tag-categories";
import { useTagsState, useTagsUpdater } from "../tags-provider";
import type { TagCategory } from "../tags-provider";

const IS_IOS = Platform.OS === "ios";

/**
 * Manage tag categories: drag to reorder, tap to rename or delete, and add
 * new ones up to {@link MAX_TAG_CATEGORIES}. The order is the order of the
 * check-in and the tag settings.
 *
 * - `modal` (default): sheet from the check-in and recaps, own close header
 * - `page`: pushed from Settings > Tags. iOS shows back and a Liquid Glass
 *   plus in the bar instead of the bottom button
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
  const reachedMax = categories.length >= MAX_TAG_CATEGORIES;
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

  const limitNotice = (
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
  );

  const list = (
    <Animated.ScrollView
      ref={scrollRef}
      // A page lets iOS inset the content below the bar.
      contentInsetAdjustmentBehavior={isNativePage ? "automatic" : "never"}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: 16,
        paddingBottom: isNativePage ? 32 : insets.bottom + 120,
      }}
    >
      {isNativePage && reachedMax && (
        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          {limitNotice}
        </View>
      )}
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
    // List first: iOS tracks the screen's first child for the bar.
    return (
      <>
        {list}
        {/* Title doubles as label: expo-router drops `accessibilityLabel`
            on iOS bar items. With an icon, iOS shows only the icon. */}
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="plus"
            accessibilityLabel={t("tag_category_create")}
            disabled={reachedMax}
            onPress={() => router.push("/tags/categories/create")}
          >
            {t("tag_category_create")}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </>
    );
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
          limitNotice
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
