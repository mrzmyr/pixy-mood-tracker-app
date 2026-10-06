import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { TagComponent, useTagsState } from "@/features/tags";
import { t } from "@/lib/translation";
import { ChipRow } from "../Calendar/Timeline/ChipRow";
import { INSET } from "./layout";

/**
 * Tags of an entry card as one scrollable chip row. A tap opens the logger
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
    <ChipRow
      inset={INSET}
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
          compact
          style={{
            marginRight: 0,
            marginBottom: 0,
            backgroundColor: colors.entryBackground,
            borderColor: colors.entryItemBorder,
          }}
        />
      ))}
    </ChipRow>
  );
};
