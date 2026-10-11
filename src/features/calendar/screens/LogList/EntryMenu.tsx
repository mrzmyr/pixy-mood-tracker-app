import { MoreHorizontal } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import type { EntryMenuProps } from "./entryMenuTypes";

/**
 * Entry "…" menu on web: plain popover with Edit and a red Delete. iOS and
 * Android use native menus (`EntryMenu.ios.tsx`, `EntryMenu.android.tsx`).
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
  const [open, setOpen] = useState(false);

  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <View style={{ marginRight: -10, zIndex: 1 }}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen((value) => !value)}
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MoreHorizontal color={colors.textSecondary} size={22} />
      </Pressable>
      {open && (
        <View
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            minWidth: 140,
            padding: 4,
            borderRadius: 12,
            backgroundColor: colors.bottomSheetBackground,
          }}
        >
          <Pressable
            accessibilityRole="menuitem"
            onPress={choose(onEdit)}
            style={{ padding: 12 }}
          >
            <Text style={{ color: colors.text }}>{editLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="menuitem"
            onPress={choose(onDelete)}
            style={{ padding: 12 }}
          >
            <Text style={{ color: colors.dangerButtonText }}>
              {deleteLabel}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};
