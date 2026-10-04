import Alert from "@/lib/Alert";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useHaptics from "@/hooks/useHaptics";
import { useTagsUpdater } from "./TagsProvider";
import type { Tag as ITag } from "./TagsProvider";

const REGEX_EMOJI = /\p{Emoji}/u;

/** Shared delete confirmation and immediate archive action; analytics exclude tag names. */
export const useTagActions = ({
  onDeleted,
}: { onDeleted?: () => void } = {}) => {
  const tagsUpdater = useTagsUpdater();
  const analytics = useAnalytics();
  const haptics = useHaptics();

  const confirmDelete = async (tagToDelete: ITag) => {
    await haptics.selection();

    analytics.track("tags:delete_requested", {
      title_length: tagToDelete.title.length,
      color: tagToDelete.color,
      has_emoji: REGEX_EMOJI.test(tagToDelete.title),
    });

    Alert.alert(
      t("delete_tag_confirm_title"),
      t("delete_tag_confirm_message"),
      [
        {
          text: t("delete"),
          onPress: () => {
            analytics.track("tags:tag_deleted", {
              title_length: tagToDelete.title.length,
              color: tagToDelete.color,
              has_emoji: REGEX_EMOJI.test(tagToDelete.title),
            });
            tagsUpdater.deleteTag(tagToDelete.id);
            onDeleted?.();
          },
          style: "destructive",
        },
        {
          text: t("cancel"),
          onPress: () => {
            analytics.track("tags:delete_cancelled");
          },
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const archive = (tag: ITag) => {
    analytics.track("tags:tag_updated", {
      title_length: tag.title.length,
      color: tag.color,
      has_emoji: REGEX_EMOJI.test(tag.title),
      is_archived: true,
    });
    tagsUpdater.updateTag({ ...tag, isArchived: true });
    void haptics.selection();
  };

  return { confirmDelete, archive };
};
