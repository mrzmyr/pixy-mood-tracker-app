import { Button, Host, Menu } from "@expo/ui/swift-ui";
import {
  accessibilityIdentifier,
  accessibilityLabel,
  frame,
  labelStyle,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import useColors from "@/hooks/useColors";
import type { EntryMenuProps } from "./entryMenuTypes";

/**
 * Entry "…" menu on iOS: native SwiftUI `Menu` with Edit and a destructive
 * Delete. The trigger is a 44 pt icon-only button.
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
    <Host matchContents style={{ marginRight: -10 }}>
      <Menu
        label={label}
        systemImage="ellipsis"
        modifiers={[
          labelStyle("iconOnly"),
          frame({ width: 44, height: 44 }),
          tint(colors.textSecondary),
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
