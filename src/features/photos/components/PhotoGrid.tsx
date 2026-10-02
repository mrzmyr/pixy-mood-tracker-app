import { useState } from "react";
import { View } from "react-native";
import type { PhotoTile } from "../hooks/usePhotoSelection";
import { AddPhotoTile } from "./AddPhotoTile";
import { SelectableTile } from "./SelectableTile";

const COLUMNS = 3;
const GAP = 8;

/**
 * Photos step grid: 3 columns of square tiles, 8 pt apart, all the same
 * size. The add tile comes first. At the limit (`isFull`), the add tile is
 * disabled and unselected tiles fade.
 */
export const PhotoGrid = ({
  tiles,
  isFull,
  isAddDisabled,
  onAdd,
  onToggle,
  onOpen,
}: {
  tiles: PhotoTile[];
  isFull: boolean;
  isAddDisabled: boolean;
  onAdd: () => void;
  onToggle: (tile: PhotoTile) => void;
  /** Long press on an imported tile. */
  onOpen: (tile: PhotoTile) => void;
}) => {
  const [width, setWidth] = useState(0);
  // Floor, so three tiles plus two gaps never exceed the row and wrap.
  const cellSize = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);

  return (
    <View
      testID="photo-grid"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}
    >
      {width > 0 && (
        <AddPhotoTile
          onPress={onAdd}
          size={cellSize}
          disabled={isFull || isAddDisabled}
        />
      )}
      {width > 0 &&
        tiles.map((tile, index) => (
          <SelectableTile
            key={tile.key}
            tile={tile}
            index={index}
            count={tiles.length}
            size={cellSize}
            isDimmed={isFull && !tile.isSelected}
            onPress={() => onToggle(tile)}
            onLongPress={tile.photo ? () => onOpen(tile) : undefined}
          />
        ))}
    </View>
  );
};
