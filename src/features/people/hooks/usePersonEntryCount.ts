import { useLogState } from "@/features/logs";

/** Number of entries that reference the person with `personId`. */
export const usePersonEntryCount = (personId: string) => {
  const { items } = useLogState();
  return items.filter((item) =>
    item.people.some((person) => person.id === personId)
  ).length;
};
