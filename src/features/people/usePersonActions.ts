import useHaptics from "@/hooks/useHaptics";
import Alert from "@/lib/Alert";
import { t } from "@/lib/translation";
import { useLogState } from "@/features/logs";
import { useAnalytics } from "@/state/analytics";
import { usePeopleUpdater } from "./PeopleProvider";
import type { Person } from "./PeopleProvider";

/** Shared delete confirmation and immediate archive action; analytics exclude names. */
export const usePersonActions = ({
  onDeleted,
}: { onDeleted?: (personId: Person["id"]) => void } = {}) => {
  const peopleUpdater = usePeopleUpdater();
  const analytics = useAnalytics();
  const haptics = useHaptics();
  const { items } = useLogState();

  const confirmDelete = (personId: Person["id"]) => {
    const entryCount = items.filter((item) =>
      item.people.some(({ id }) => id === personId)
    ).length;

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
            onDeleted?.(personId);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const archive = (person: Person) => {
    analytics.track("people:person_updated", {
      name_changed: false,
      avatar_changed: false,
      is_archived: true,
    });
    peopleUpdater.updatePerson({ ...person, isArchived: true });
  };

  return { confirmDelete, archive };
};
