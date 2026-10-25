import { useLogState } from "@/features/logs";
import useHaptics from "@/hooks/use-haptics";
import Alert from "@/lib/alert";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { usePeopleUpdater } from "../people-provider";
import type { Person } from "../people-provider";

/**
 * Delete confirmation with the entry count, and an immediate archive toggle.
 * Shared by the person form and the check-in tile action sheet.
 */
export const usePersonActions = () => {
  const { items } = useLogState();
  const haptics = useHaptics();
  const analytics = useAnalytics();
  const peopleUpdater = usePeopleUpdater();

  const countEntries = (personId: Person["id"]) =>
    items.filter((item) =>
      item.people.some((reference) => reference.id === personId)
    ).length;

  const confirmDelete = (
    personId: Person["id"],
    { onDeleted }: { onDeleted?: () => void } = {}
  ) => {
    const entryCount = countEntries(personId);
    analytics.track("people:delete_requested", { entries_count: entryCount });
    Alert.alert(
      t("people_delete_confirm_title"),
      t("people_delete_confirm_message", { count: entryCount }),
      [
        {
          text: t("cancel"),
          style: "cancel",
          onPress: () => analytics.track("people:delete_cancelled"),
        },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            void haptics.impact();
            analytics.track("people:person_deleted", {
              entries_count: entryCount,
            });
            peopleUpdater.deletePerson(personId);
            onDeleted?.();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const toggleArchived = (person: Person) => {
    const isArchived = !person.isArchived;
    analytics.track("people:person_updated", {
      name_changed: false,
      avatar_changed: false,
      is_archived: isArchived,
    });
    peopleUpdater.updatePerson({ ...person, isArchived });
  };

  return { confirmDelete, toggleArchived };
};
