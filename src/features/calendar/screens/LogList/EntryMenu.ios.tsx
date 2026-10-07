import { Button, Host, Image, Menu } from "@expo/ui/swift-ui";
import {
  accessibilityIdentifier,
  accessibilityLabel,
  buttonStyle,
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI modifier name from @expo/ui.
  contentShape as hitArea,
  frame,
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI shape factory from @expo/ui.
  shapes as swiftUiOutlines,
} from "@expo/ui/swift-ui/modifiers";
import useColors from "@/hooks/useColors";
import type { EntryMenuProps } from "./entryMenuTypes";

/** HIG minimum touch target and a clearly visible glyph inside it. */
const SIZE = 44;
const ICON_SIZE = 22;

/**
 * Entry "…" menu on iOS: native SwiftUI `Menu` with Edit and a destructive
 * Delete. The trigger is a plain 22 pt "…" glyph in a 44 pt frame, no fill, no
 * border. The frame and `hitArea` (SwiftUI `contentShape`) sit on the label image, so the whole
 * 44 pt square opens the menu (on the `Menu` itself they only change the layout).
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
        label={
          <Image
            systemName="ellipsis"
            size={ICON_SIZE}
            color={colors.text}
            modifiers={[
              frame({ width: SIZE, height: SIZE }),
              hitArea(swiftUiOutlines.rectangle()),
            ]}
          />
        }
        modifiers={[
          buttonStyle("plain"),
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
