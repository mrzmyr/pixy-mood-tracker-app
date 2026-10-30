import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import {
  AddPhotoTile,
  PhotoGrid,
  PhotoLimitNotice,
  PickTile,
  useDraftPhotos,
} from "@/features/photos";
import { PhotoViewerModal } from "@/features/photos/routes";
import { toLogDate } from "@/lib/log-dates";

/**
 * Photo draft of the quick check-in. Photos come from the library picker
 * only: no permission read, no photos of the day. Photo files no stored
 * entry references are swept when the screen closes, so picks of a
 * cancelled check-in do not stay on the device. Call it in the screen,
 * not in a section that search hides: the picks must survive a search.
 */
export const useQuickCheckInPhotos = ({
  entry,
  photos,
  onChange,
}: {
  /** Entry the screen edits, if any. */
  entry: LogItem | undefined;
  photos: LogItem["photos"];
  onChange: (photos: LogItem["photos"]) => void;
}) => {
  const draft = useDraftPhotos({
    date: toLogDate(entry?.dateTime ?? dayjs().toISOString()),
    photos,
    onChange,
    mode: entry ? "edit" : "create",
    isActive: false,
  });
  const { sweepPhotos } = useLogUpdater();
  useEffect(() => sweepPhotos, [sweepPhotos]);
  return draft;
};

/**
 * Photos of the quick check-in: picked photos as check tiles, then a tile
 * that opens the library picker. A long press on a checked photo opens the
 * viewer with "Remove".
 */
export const QuickCheckInPhotos = ({
  draft,
}: {
  draft: ReturnType<typeof useDraftPhotos>;
}) => {
  const [viewerKey, setViewerKey] = useState<string | null>(null);
  const viewerIndex = draft.photos.findIndex(({ key }) => key === viewerKey);

  const addFromLibrary = () => {
    void draft.addFromLibrary();
  };

  return (
    <View>
      <PhotoGrid testID="quick-check-in-photos">
        {(cellSize) => (
          <>
            {draft.items.map((item, index) => (
              <PickTile
                key={item.key}
                uri={item.uri}
                recyclingKey={item.key}
                position={index + 1}
                count={draft.items.length}
                order={item.order}
                size={cellSize}
                isDimmed={draft.isFull}
                isImporting={item.isImporting}
                onToggle={() => draft.toggle(item.key)}
                onOpen={() => {
                  const photo =
                    item.order === null
                      ? undefined
                      : draft.photos[item.order - 1];
                  if (photo) {
                    setViewerKey(photo.key);
                  }
                }}
              />
            ))}
            <AddPhotoTile
              testID="quick-check-in-photo-add"
              onPress={addFromLibrary}
              size={cellSize}
              disabled={draft.isAddDisabled}
            />
          </>
        )}
      </PhotoGrid>
      <PhotoLimitNotice
        isVisible={draft.isLimitNoticeVisible}
        onHide={() => draft.hideLimitNotice()}
        bottom={0}
      />
      <PhotoViewerModal
        items={draft.photos.map(({ key, uri }) => ({ key, uri }))}
        initialIndex={Math.max(viewerIndex, 0)}
        context="logger"
        isVisible={viewerIndex !== -1}
        onClose={() => setViewerKey(null)}
        onRemove={({ key }) => {
          const photo = draft.photos.find((candidate) => candidate.key === key);
          if (photo) {
            draft.remove(photo);
          }
          setViewerKey(null);
        }}
      />
    </View>
  );
};
