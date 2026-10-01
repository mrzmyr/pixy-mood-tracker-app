import { useState } from "react";
import { View } from "react-native";
import type { LogPhoto } from "@/types";
import { MAX_PHOTOS_PER_ENTRY } from "../storage";
import { AddPhotoTile } from "./AddPhotoTile";
import { PhotoThumbnail } from "./PhotoThumbnail";

const COLUMNS = 3;
const GAP = 8;

/**
 * Three-column grid of photo tiles. Shows {@link AddPhotoTile} as last cell
 * when `onAdd` is given and the entry holds fewer than
 * {@link MAX_PHOTOS_PER_ENTRY} photos. Remove buttons show only with
 * `onRemove`.
 */
export const PhotoGrid = ({
  photos,
  onOpen,
  onAdd,
  onRemove,
}: {
  photos: LogPhoto[];
  onOpen: (index: number) => void;
  onAdd?: () => void;
  onRemove?: (photo: LogPhoto) => void;
}) => {
  const [width, setWidth] = useState(0);
  const cellSize = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);
  const isAddVisible = !!onAdd && photos.length < MAX_PHOTOS_PER_ENTRY;

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}
    >
      {width > 0 &&
        photos.map((photo, index) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            index={index}
            count={photos.length}
            size={cellSize}
            onPress={() => onOpen(index)}
            onRemove={onRemove ? () => onRemove(photo) : undefined}
          />
        ))}
      {width > 0 && isAddVisible && onAdd && (
        <AddPhotoTile onPress={onAdd} size={cellSize} />
      )}
    </View>
  );
};
