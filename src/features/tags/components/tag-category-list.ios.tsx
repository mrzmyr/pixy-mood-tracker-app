import { useRouter } from "expo-router";
import { View } from "react-native";
import {
  Background,
  Button,
  Circle,
  HStack,
  Rectangle,
  Host,
  List,
  RNHostView,
  Spacer,
  SwipeActions,
  Text,
  UnevenRoundedRectangle,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityLabel,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listRowSpacing,
  listStyle,
  moveDisabled,
  onTapGesture,
  padding,
  scrollContentBackground,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import {
  groupTagsByCategory,
  moveRows,
  searchTagSections,
  toTagArrangement,
  toTagCategoryRows,
} from "../tag-categories";
import type { TagArrangement, TagCategoryRow } from "../tag-categories";
import { useTagsState, useTagsUpdater } from "../tags-provider";
import type { Tag } from "../tags-provider";
import { useTagActions } from "../use-tag-actions";

/** Rows draw their own card, so the list draws no background or divider. */
const ROW_MODIFIERS = [
  listRowBackground("clear"),
  listRowInsets({ top: 0, bottom: 0, leading: 0, trailing: 0 }),
  listRowSeparator("hidden"),
];

const isCategoryChanged = (tags: Tag[], arrangement: TagArrangement[]) => {
  const categoryById = new Map(tags.map((tag) => [tag.id, tag.categoryId]));
  return arrangement.some(({ categoryId, tagIds }) =>
    tagIds.some((id) => categoryById.get(id) !== categoryId)
  );
};

/**
 * iOS: active tags grouped by category in a native SwiftUI `List`. Same
 * behavior as [tag-category-list.tsx](./tag-category-list.tsx): long-press
 * a tag to drag it within or across categories, swipe to archive or delete.
 * One `ForEach` holds headers and tags, so a tag can cross a header; rows
 * draw their own rounded card because the list groups by section only.
 */
export const TagCategoryList = ({
  header,
  query = "",
  hasBottomBar = true,
}: {
  /** Rendered above the first category, inside the list. */
  header?: React.ReactElement;
  /** Search text from the header search bar. */
  query?: string;
  /** Leave room for a bottom bar, for example `CreateTagAction`. */
  hasBottomBar?: boolean;
}) => {
  const colors = useColors();
  const router = useRouter();
  const analytics = useAnalytics();
  const { tags, categories } = useTagsState();
  const { arrangeTags } = useTagsUpdater();
  const { confirmDelete, archive } = useTagActions();

  const activeTags = tags.filter((tag) => !tag.isArchived);
  const sections = groupTagsByCategory(activeTags, categories);
  const isSearching = query.trim() !== "";
  const rows = toTagCategoryRows(
    isSearching ? searchTagSections(sections, query) : sections
  );

  const onMove = (sourceIndices: number[], destination: number) => {
    const arrangement = toTagArrangement(
      moveRows(rows, sourceIndices, destination)
    );
    analytics.track("tags:tags_arranged", {
      tags_count: activeTags.length,
      categories_count: categories.length,
      category_changed: isCategoryChanged(activeTags, arrangement),
      method: "drag",
    });
    arrangeTags(arrangement);
  };

  const card = (isFirst: boolean, isLast: boolean) => (
    <Background.Content>
      <UnevenRoundedRectangle
        topLeadingRadius={isFirst ? RADIUS.md : 0}
        topTrailingRadius={isFirst ? RADIUS.md : 0}
        bottomLeadingRadius={isLast ? RADIUS.md : 0}
        bottomTrailingRadius={isLast ? RADIUS.md : 0}
        modifiers={[
          foregroundStyle({
            type: "color",
            color: colors.menuListItemBackground,
          }),
          // List rows leave a small gap; joined rows overlap to hide it.
          padding({ top: isFirst ? 0 : -2, bottom: isLast ? 0 : -2 }),
        ]}
      />
    </Background.Content>
  );

  const renderRow = (row: TagCategoryRow) => {
    if (row.type === "category") {
      return (
        <HStack
          key={row.key}
          alignment="lastTextBaseline"
          modifiers={[
            ...ROW_MODIFIERS,
            moveDisabled(),
            padding({
              top: row.index === 0 ? 24 : 32,
              bottom: 8,
              leading: 32,
              trailing: 24,
            }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: 13 }),
              foregroundStyle({ type: "color", color: colors.textSecondary }),
              accessibilityAddTraits(["isHeader"]),
            ]}
          >
            {row.category.title}
          </Text>
          <Spacer />
          <Button
            testID={`tag-category-edit-${row.category.id}`}
            label={t("edit")}
            onPress={() =>
              router.push({
                pathname: "/tags/categories/[id]",
                params: { id: row.category.id },
              })
            }
            modifiers={[
              buttonStyle("borderless"),
              font({ size: 15 }),
              tint(colors.tint),
              accessibilityLabel(
                t("tag_category_edit_named", { title: row.category.title })
              ),
            ]}
          />
        </HStack>
      );
    }

    if (row.type === "empty") {
      return (
        <Background
          key={row.key}
          modifiers={[...ROW_MODIFIERS, padding({ horizontal: 16 })]}
        >
          <Text
            testID={`tag-category-empty-${row.category.id}`}
            modifiers={[
              font({ size: 15 }),
              foregroundStyle({ type: "color", color: colors.textSecondary }),
              frame({
                maxWidth: Infinity,
                minHeight: 50,
                alignment: "leading",
              }),
              padding({ horizontal: 16 }),
            ]}
          >
            {t("tag_category_empty")}
          </Text>
          {card(true, true)}
        </Background>
      );
    }

    const { tag, isFirst, isLast } = row;
    return (
      <SwipeActions
        key={row.key}
        modifiers={[...ROW_MODIFIERS, moveDisabled(isSearching)]}
      >
        <Background
          modifiers={[
            // The card behind the row takes taps too, also in blank space.
            onTapGesture(() =>
              router.push({ pathname: "/tags/[id]", params: { id: tag.id } })
            ),
            accessibilityElement("combine"),
            accessibilityAddTraits(["isButton"]),
            padding({ horizontal: 16 }),
          ]}
        >
          <VStack spacing={0}>
            {/* 1 pt like the other menu rows; a hairline leaves seams. */}
            {!isFirst && (
              <Rectangle
                modifiers={[
                  frame({ height: 1 }),
                  foregroundStyle({
                    type: "color",
                    color: colors.menuListItemBorder,
                  }),
                  padding({ horizontal: 16 }),
                ]}
              />
            )}
            <HStack
              testID={`tag-row-${tag.id}`}
              spacing={16}
              modifiers={[
                padding({ leading: 20, trailing: 16 }),
                frame({ maxWidth: Infinity, minHeight: 50 }),
              ]}
            >
              <Circle
                modifiers={[
                  frame({ width: 10, height: 10 }),
                  foregroundStyle({
                    type: "color",
                    color: colors.tags[tag.color]?.dot ?? colors.text,
                  }),
                ]}
              />
              <Text
                modifiers={[
                  font({ size: 17 }),
                  foregroundStyle({ type: "color", color: colors.text }),
                  lineLimit(1),
                ]}
              >
                {tag.title}
              </Text>
              <Spacer />
            </HStack>
          </VStack>
          {card(isFirst, isLast)}
        </Background>
        <SwipeActions.Actions edge="leading" allowsFullSwipe={false}>
          <Button
            testID={`tag-archive-${tag.id}`}
            label={t("archive_tag")}
            systemImage="archivebox"
            onPress={() => archive(tag)}
            modifiers={[tint(colors.tint)]}
          />
        </SwipeActions.Actions>
        <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
          <Button
            testID={`tag-delete-${tag.id}`}
            label={t("delete")}
            systemImage="trash"
            onPress={() => confirmDelete(tag)}
            modifiers={[tint(colors.danger)]}
          />
        </SwipeActions.Actions>
      </SwipeActions>
    );
  };

  return (
    <Host style={{ flex: 1 }} testID="tag-category-list">
      <List
        modifiers={[
          listStyle("plain"),
          scrollContentBackground("hidden"),
          listRowSpacing(0),
        ]}
      >
        {!isSearching && header && (
          <VStack modifiers={[...ROW_MODIFIERS, moveDisabled()]}>
            <RNHostView matchContents={{ vertical: true }}>
              <View collapsable={false}>{header}</View>
            </RNHostView>
          </VStack>
        )}
        <List.ForEach onMove={isSearching ? undefined : onMove}>
          {rows.map(renderRow)}
        </List.ForEach>
        {isSearching && rows.length === 0 && (
          <Text
            testID="tag-search-empty"
            modifiers={[
              ...ROW_MODIFIERS,
              font({ size: 15 }),
              foregroundStyle({ type: "color", color: colors.textSecondary }),
              frame({ maxWidth: Infinity }),
              padding({ all: 32 }),
            ]}
          >
            {t("tags_search_empty")}
          </Text>
        )}
        <Spacer
          modifiers={[
            ...ROW_MODIFIERS,
            frame({ height: hasBottomBar ? 120 : 32 }),
          ]}
        />
      </List>
    </Host>
  );
};
