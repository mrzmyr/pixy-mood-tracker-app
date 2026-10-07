import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { PersonChip, usePeopleState } from "@/features/people";
import { t } from "@/lib/translation";
import { ChipRow } from "../Calendar/Timeline/ChipRow";
import { INSET } from "./layout";

/** People of an entry that still exist; deleted people are skipped. */
export const useKnownPeople = (item: LogItem) => {
  const { people } = usePeopleState();
  return item.people.flatMap(({ id }) => {
    const person = people.find((candidate) => candidate.id === id);
    return person ? [person] : [];
  });
};

/**
 * People of an entry card as one scrollable chip row. A tap opens the
 * logger at the people step when `onEdit` is given. Without known people it
 * renders nothing.
 */
export const People = ({
  item,
  onEdit,
}: {
  item: LogItem;
  onEdit?: () => void;
}) => {
  const colors = useColors();
  const known = useKnownPeople(item);

  if (known.length === 0) {
    return null;
  }

  return (
    <ChipRow
      inset={INSET}
      onPress={onEdit}
      accessibilityLabel={
        onEdit
          ? t("view_log_edit", { module: t("logger_step_people") })
          : undefined
      }
      testID={onEdit ? "log-list-people-edit" : undefined}
    >
      {known.map((person) => (
        <PersonChip
          key={person.id}
          person={person}
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
