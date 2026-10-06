import { Button, Host, Menu } from "@expo/ui/swift-ui";
import {
  accessibilityIdentifier,
  accessibilityLabel,
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI modifier name from @expo/ui.
  buttonBorderShape as buttonBorder,
  buttonStyle,
  controlSize,
  frame,
  labelStyle,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import useColors from "@/hooks/useColors";
import type { EntryMenuProps } from "./entryMenuTypes";

/**
 * Entry "…" menu on iOS: native SwiftUI `Menu` with Edit and a destructive
 * Delete. The trigger is a bordered circle button, large control size, in a
 * 44 pt frame: visible as a button, never a bare glyph.
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

  return (
    <Host matchContents style={{ marginRight: -4 }}>
      <Menu
        label={label}
        systemImage="ellipsis"
        modifiers={[
          labelStyle("iconOnly"),
          buttonStyle("bordered"),
          buttonBorder("circle"),
          controlSize("large"),
          frame({ minWidth: 44, minHeight: 44 }),
          tint(colors.text),
          accessibilityLabel(label),
          accessibilityIdentifier(testID),
        ]}
      >
        <Button label={editLabel} systemImage="pencil" onPress={onEdit} />
        <Button
          label={deleteLabel}
          systemImage="trash"
          // oxlint-disable-next-line jsx-a11y/aria-role -- SwiftUI button role, not an ARIA role.
          role="destructive"
          onPress={onDelete}
        />
      </Menu>
    </Host>
  );
};
