import { DropdownMenu, DropdownMenuItem, Text } from "@expo/ui/jetpack-compose";
import { MoreHorizontal } from "lucide-react-native";
import { useState } from "react";
import { Pressable } from "react-native";
import useColors from "@/hooks/useColors";
import type { EntryMenuProps } from "./entryMenuTypes";

/**
 * Entry "…" menu on Android: Material 3 dropdown anchored to a 44 dp React
 * Native button. Delete text is red.
 */
export const EntryMenu = ({
  label,
  testID,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: EntryMenuProps) => {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const choose = (action: () => void) => () => {
    setExpanded(false);
    action();
  };

  return (
    <DropdownMenu
      expanded={expanded}
      onDismissRequest={() => setExpanded(false)}
      color={colors.bottomSheetBackground}
      style={{ marginRight: -10 }}
    >
      <DropdownMenu.Trigger>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => setExpanded(true)}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <MoreHorizontal color={colors.textSecondary} size={22} />
        </Pressable>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        <DropdownMenuItem onClick={choose(onEdit)}>
          <DropdownMenuItem.Text>
            <Text>{editLabel}</Text>
          </DropdownMenuItem.Text>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={choose(onDelete)}
          elementColors={{ textColor: colors.dangerButtonText }}
        >
          <DropdownMenuItem.Text>
            <Text>{deleteLabel}</Text>
          </DropdownMenuItem.Text>
        </DropdownMenuItem>
      </DropdownMenu.Items>
    </DropdownMenu>
  );
};
