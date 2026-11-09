import { Pressable, View } from "react-native";
import useColors from "@/hooks/use-colors";
import { iconLabel } from "../tag-icon-label";
import type { TagIconKey } from "../tag-icons";
import type { Tag } from "../tags-provider";
import { TagIcon } from "./tag-icon";

/** Icons per row of the picker grid. */
export const TAG_ICON_COLUMNS = 6;
const CELL_HEIGHT = 56;
const CELL_SIZE = 48;
const ICON_SIZE = 24;

/** One grid cell: an icon, or a placeholder while suggestions load. */
export interface TagIconCell {
  id: string;
  icon: TagIconKey | null;
}

const cellStyle = {
  width: `${100 / TAG_ICON_COLUMNS}%`,
  height: CELL_HEIGHT,
  alignItems: "center",
  justifyContent: "center",
} as const;

const circle = {
  width: CELL_SIZE,
  height: CELL_SIZE,
  borderRadius: CELL_SIZE / 2,
  alignItems: "center",
  justifyContent: "center",
} as const;

/**
 * One row of the picker grid. Icons draw in the tag color, the same as in
 * the name field. Selected: gray circle behind, icon unchanged.
 */
export const TagIconGridRow = ({
  cells,
  selected,
  color,
  onPick,
}: {
  cells: TagIconCell[];
  selected: Tag["icon"];
  color: Tag["color"];
  onPick: (icon: TagIconKey) => void;
}) => {
  const colors = useColors();

  return (
    <View style={{ flexDirection: "row" }}>
      {cells.map(({ id, icon }) => (
        <View key={id} style={cellStyle}>
          {icon ? (
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={iconLabel(icon)}
              accessibilityState={{ checked: icon === selected }}
              testID={`tag-icon-${icon}`}
              onPress={() => onPick(icon)}
              style={({ pressed }) => [
                circle,
                {
                  backgroundColor:
                    icon === selected ? colors.chipBackground : "transparent",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <TagIcon icon={icon} color={color} size={ICON_SIZE} />
            </Pressable>
          ) : (
            <View
              accessible={false}
              style={[circle, { backgroundColor: colors.chipBackground }]}
            />
          )}
        </View>
      ))}
    </View>
  );
};
