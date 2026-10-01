import { ScrollView } from "react-native";
import { PhotoThumbnail } from "@/features/photos";
import type { LogPhoto } from "@/types";

const THUMBNAIL_SIZE = 72;
// Keeps the remove button hit slop inside the strip, which clips touches.
const STRIP_PADDING = 4;

/**
 * Horizontal strip of draft photos on the note slide. Each tile opens the
 * draft viewer and has a remove button.
 */
export const PhotoStrip = ({
  photos,
  reservedEnd,
  onOpen,
  onRemove,
}: {
  photos: LogPhoto[];
  /** End padding so the last tile scrolls clear of the floating button. */
  reservedEnd: number;
  onOpen: (index: number) => void;
  onRemove: (photo: LogPhoto) => void;
}) => (
  <ScrollView
    horizontal
    testID="log-photo-strip"
    keyboardShouldPersistTaps="handled"
    showsHorizontalScrollIndicator={false}
    style={{ flexGrow: 0 }}
    contentContainerStyle={{
      gap: 8,
      paddingVertical: STRIP_PADDING,
      paddingRight: reservedEnd,
    }}
  >
    {photos.map((photo, index) => (
      <PhotoThumbnail
        key={photo.id}
        photo={photo}
        index={index}
        count={photos.length}
        size={THUMBNAIL_SIZE}
        onPress={() => onOpen(index)}
        onRemove={() => onRemove(photo)}
      />
    ))}
  </ScrollView>
);
