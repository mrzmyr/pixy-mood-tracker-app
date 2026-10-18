import { Button, Host, Menu } from "@expo/ui/swift-ui";
import {
  accessibilityIdentifier,
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI modifier name from @expo/ui.
  buttonBorderShape as buttonBorder,
  buttonStyle,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import useColors from "@/hooks/useColors";
import type { PhotoButtonProps } from "./types";

/**
 * Photo button on iOS: bordered capsule like the Contacts "Add Photo"
 * button. With a photo it is a native SwiftUI `Menu`.
 */
export const PhotoButton = ({
  hasPhoto,
  addLabel,
  editLabel,
  testID,
  onAdd,
  actions,
}: PhotoButtonProps) => {
  const colors = useColors();
  const modifiers = [
    buttonStyle("bordered"),
    buttonBorder("capsule"),
    tint(colors.tint),
    accessibilityIdentifier(testID),
  ];

  return (
    <Host matchContents style={{ minHeight: 44 }}>
      {hasPhoto ? (
        <Menu label={editLabel} modifiers={modifiers}>
          {actions.map((action) => (
            <Button
              key={action.testID}
              label={action.label}
              // oxlint-disable-next-line jsx-a11y/aria-role -- SwiftUI button role, not an ARIA role.
              role={action.destructive ? "destructive" : undefined}
              onPress={() => action.onPress()}
              modifiers={[accessibilityIdentifier(action.testID)]}
            />
          ))}
        </Menu>
      ) : (
        <Button label={addLabel} onPress={onAdd} modifiers={modifiers} />
      )}
    </Host>
  );
};
