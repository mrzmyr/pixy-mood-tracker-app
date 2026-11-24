import { useRouter } from "expo-router";
import Plus from "lucide-react-native/icons/plus";
import { View } from "react-native";
import { Chip } from "@/components/chip";
import { Label } from "@/components/typography";
import { CHIP, CHIP_GAP } from "@/constants/chip";
import {
  arrangeShownTags,
  getTagMenuActions,
  groupTagsByCategory,
  useTagMenu,
  useTagsState,
  useTagsUpdater,
  TagComponent,
} from "@/features/tags";
import type { Tag, TagCategory } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { TagChipFlow } from "./tag-chip-flow";
import { moveId } from "./tile-reorder";

/**
 * Tag chips of a check-in, in stored order. Used by the logger tags step
 * and the quick check-in. Archived tags are hidden unless selected. Tags
 * are grouped by category; headings show only when more than one category
 * has tags, so a single category looks like a plain tag list. "Edit tags"
 * comes last.
 *
 * Chips reorder by drag inside their category and have a menu: Edit,
 * Archive, Delete. iOS: hold shows the system context menu, moving the
 * finger drags. Elsewhere: hold lifts the chip, release in place opens the
 * editor. Archive and Delete also deselect the tag.
 */
export const TagPicker = ({
  selectedIds,
  onToggle,
  onDeselect,
  onDragChange,
}: {
  selectedIds: ReadonlySet<Tag["id"]>;
  onToggle: (tag: Tag) => void;
  /** A selected tag was archived or deleted. */
  onDeselect: (id: Tag["id"]) => void;
  /** `true` while a chip drags: callers pause their scrolling. */
  onDragChange?: (isDragging: boolean) => void;
}) => {
  const router = useRouter();
  const colors = useColors();
  const { tags, categories } = useTagsState();
  const hasTagIcons = useFeatureFlag("tag-icons");
  const analytics = useAnalytics();
  const { arrangeTags } = useTagsUpdater();
  const runMenuAction = useTagMenu();

  const shownTags = tags.filter(
    (tag) => selectedIds.has(tag.id) || !tag.isArchived
  );

  const sections = groupTagsByCategory(shownTags, categories).filter(
    (section) => section.tags.length > 0
  );
  const showHeadings = sections.length > 1;

  const reorder = (
    categoryId: TagCategory["id"],
    orderedIds: Tag["id"][],
    method: "drag" | "accessibility_action"
  ) => {
    analytics.track("tags:tags_arranged", {
      tags_count: orderedIds.length,
      categories_count: categories.length,
      category_changed: false,
      method,
    });
    arrangeTags([arrangeShownTags(tags, categoryId, orderedIds)]);
  };

  const editTag = (id: Tag["id"]) =>
    router.push({ pathname: "/tags/[id]", params: { id } });

  const renderTag = (
    {
      categoryId,
      sectionTags,
    }: { categoryId: TagCategory["id"]; sectionTags: Tag[] },
    tag: Tag,
    isPressBlocked: () => boolean
  ) => {
    const sectionIds = sectionTags.map((item) => item.id);
    const move = (offset: -1 | 1) => {
      const neighborId = sectionIds[sectionIds.indexOf(tag.id) + offset];
      if (neighborId) {
        reorder(
          categoryId,
          moveId(sectionIds, tag.id, neighborId),
          "accessibility_action"
        );
      }
    };
    return (
      <TagComponent
        onPress={() => {
          if (!isPressBlocked()) {
            onToggle(tag);
          }
        }}
        // Hold opens the menu or lifts the chip; screen readers keep "edit".
        accessibilityActions={[
          { name: "edit", label: t("edit") },
          { name: "moveUp", label: t("tags_move_up") },
          { name: "moveDown", label: t("tags_move_down") },
        ]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === "edit") {
            editTag(tag.id);
          }
          if (nativeEvent.actionName === "moveUp") {
            move(-1);
          }
          if (nativeEvent.actionName === "moveDown") {
            move(1);
          }
        }}
        title={tag.title}
        colorName={tag.color}
        icon={tag.icon}
        showIcon={hasTagIcons}
        selected={selectedIds.has(tag.id)}
        testID={`log-tag-${tag.id}`}
      />
    );
  };

  const editButton = (
    <Chip
      isToggle={false}
      label={t("tags_edit")}
      lead={<Plus size={CHIP.lead} color={colors.chipText} />}
      onPress={() => router.push("/tags")}
    />
  );

  return (
    <View
      style={{
        gap: showHeadings ? 12 : 0,
        paddingBottom: showHeadings ? 12 : 0,
      }}
    >
      {sections.map(({ category, tags: sectionTags }, index) => (
        <View
          key={category.id}
          testID={`log-tags-category-${category.id}`}
          style={{ gap: 8 }}
        >
          {showHeadings && (
            <Label
              size={14}
              strong
              accessibilityRole="header"
              style={{ color: colors.textSecondary }}
            >
              {category.title}
            </Label>
          )}
          <TagChipFlow
            tags={sectionTags}
            renderTag={(tag, isPressBlocked) =>
              renderTag(
                { categoryId: category.id, sectionTags },
                tag,
                isPressBlocked
              )
            }
            trailing={index === sections.length - 1 ? editButton : null}
            onReorder={(orderedIds) => reorder(category.id, orderedIds, "drag")}
            onDragChange={onDragChange}
            menuActions={getTagMenuActions}
            onMenuAction={(tag, actionId) =>
              runMenuAction(tag, actionId, {
                onEdit: () => editTag(tag.id),
                onArchived: () => onDeselect(tag.id),
                onDeleted: () => onDeselect(tag.id),
              })
            }
          />
        </View>
      ))}
      {sections.length === 0 && (
        <View style={{ paddingRight: CHIP_GAP, paddingBottom: CHIP_GAP }}>
          {editButton}
        </View>
      )}
    </View>
  );
};
