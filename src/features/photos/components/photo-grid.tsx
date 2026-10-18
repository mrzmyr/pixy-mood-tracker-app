import { useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";

const COLUMNS = 3;
const GAP = 8;

/**
 * 3 columns of square cells, 8 pt apart, all the same size. Renders the
 * cells once its width is known, so every cell gets an exact pixel size.
 */
export const PhotoGrid = ({
  testID,
  children,
}: {
  testID: string;
  /** Renders the cells at `cellSize` points. */
  children: (cellSize: number) => ReactNode;
}) => {
  const [width, setWidth] = useState(0);
  // Floor, so three cells plus two gaps never exceed the row and wrap.
  const cellSize = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);

  return (
    <View
      testID={testID}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}
    >
      {width > 0 && children(cellSize)}
    </View>
  );
};
