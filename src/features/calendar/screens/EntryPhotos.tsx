import { useLocalSearchParams, useRouter } from "expo-router";
import { useLogState, useLogUpdater } from "@/features/logs";
import { PhotoViewer, usePhotoActions } from "@/features/photos";
import { askToRemovePhoto } from "@/helpers/prompts";
import type { LogPhoto } from "@/types";

/**
 * Photo viewer for a stored entry, target of `/photos/[id]?index=<n>`.
 * Shows no photos when the entry is unknown, for example after it was
 * deleted; the close button still works.
 *
 * Trash asks first, then saves the entry without the photo at once. The
 * viewer closes after the last photo is removed.
 */
export const EntryPhotosScreen = () => {
  const router = useRouter();
  const { id, index } = useLocalSearchParams<{ id: string; index?: string }>();
  const { items } = useLogState();
  const logUpdater = useLogUpdater();
  const item = items.find((log) => log.id === id);
  const photos = item?.photos ?? [];
  const photoActions = usePhotoActions({
    photos,
    onChange: (next) => {
      logUpdater.editLog({ id, photos: next });
      logUpdater.sweepPhotos();
      if (next.length === 0) {
        router.back();
      }
    },
    mode: "edit",
  });

  const remove = async (photo: LogPhoto) => {
    try {
      await askToRemovePhoto();
    } catch {
      // Keep the photo when the user dismisses the prompt.
      return;
    }
    photoActions.remove(photo);
  };

  return (
    <PhotoViewer
      photos={photos}
      initialIndex={Number(index ?? 0)}
      onClose={() => router.back()}
      onRemove={item ? remove : undefined}
    />
  );
};
