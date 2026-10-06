import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  RNHostView,
  Text,
} from "@expo/ui/jetpack-compose";
import { MoreVertical } from "lucide-react-native";
import { useState } from "react";
import { Pressable } from "react-native";
import useColors from "@/hooks/useColors";
import usePressRipple from "@/hooks/usePressRipple";
import type { EntryMenuProps } from "./entryMenuTypes";

/** Material 3 icon button: 24 dp icon in a 48 dp touch target. */
const SIZE = 48;
const ICON_SIZE = 24;

/**
 * Entry "⋮" menu on Android: Material 3 dropdown anchored to a 48 dp React
 * Native icon button. Delete text is red.
 *
 * Compose views must be direct children of a `Host`, so the tree is
 * `Host > DropdownMenu > RNHostView > Pressable`. A React Native view between
 * `Host` and `DropdownMenu` breaks the Compose boundary and the menu renders
 * nothing.
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
  const ripple = usePressRipple({ borderless: true, radius: SIZE / 2 });
  const [expanded, setExpanded] = useState(false);

  const choose = (action: () => void) => () => {
    setExpanded(false);
    action();
  };

  return (
    <Host matchContents style={{ marginRight: -12 }}>
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
        color={colors.bottomSheetBackground}
      >
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <Pressable
              testID={testID}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => setExpanded(true)}
              android_ripple={ripple}
              style={{
                width: SIZE,
                height: SIZE,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MoreVertical color={colors.text} size={ICON_SIZE} />
            </Pressable>
          </RNHostView>
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
    </Host>
  );
};
