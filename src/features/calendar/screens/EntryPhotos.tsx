import { useLocalSearchParams, useRouter } from "expo-router";
import { useLogState } from "@/features/logs";
import { PhotoViewer } from "@/features/photos";

/**
 * Photo viewer for a stored entry, target of `/photos/[id]?index=<n>`.
 * Shows no photos when the entry is unknown, for example after it was
 * deleted; the close button still works.
 */
export const EntryPhotosScreen = () => {
  const router = useRouter();
  const { id, index } = useLocalSearchParams<{ id: string; index?: string }>();
  const { items } = useLogState();
  const item = items.find((log) => log.id === id);

  return (
    <PhotoViewer
      photos={item?.photos ?? []}
      initialIndex={Number(index ?? 0)}
      context="day"
      onClose={() => router.back()}
    />
  );
};
