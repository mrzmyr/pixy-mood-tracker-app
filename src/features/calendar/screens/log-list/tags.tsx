import useColors from "@/hooks/use-colors";
import type { LogItem } from "@/features/logs";
import { TagComponent, useTagsState } from "@/features/tags";
import { t } from "@/lib/translation";
import { ChipWrap } from "./chip-wrap";

/**
 * Tags of an entry card as wrapped chips. A tap opens the logger
 * at the tags step when `onEdit` is given. Tag references without a
 * matching tag are skipped; without known tags it renders nothing.
 */
export const Tags = ({
  item,
  onEdit,
}: {
  item: LogItem;
  onEdit?: () => void;
}) => {
  const colors = useColors();
  const { tags } = useTagsState();

  const known = item.tags.flatMap(({ id }) => {
    const tag = tags.find((candidate) => candidate.id === id);
    return tag ? [tag] : [];
  });

  if (known.length === 0) {
    return null;
  }

  return (
    <ChipWrap
      onPress={onEdit}
      accessibilityLabel={
        onEdit
          ? t("view_log_edit", { module: t("logger_step_tags") })
          : undefined
      }
      testID={onEdit ? "log-list-tags-edit" : undefined}
    >
      {known.map((tag) => (
        <TagComponent
          key={tag.id}
          title={tag.title}
          colorName={tag.color}
          style={{
            backgroundColor: colors.entryBackground,
            borderColor: colors.entryItemBorder,
          }}
        />
      ))}
    </ChipWrap>
  );
};
