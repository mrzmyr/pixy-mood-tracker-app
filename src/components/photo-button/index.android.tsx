import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  RNHostView,
  Text,
} from "@expo/ui/jetpack-compose";
import { testID as composeTestID } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";
import useColors from "@/hooks/use-colors";
import { Trigger } from "./trigger";
import type { PhotoButtonProps } from "./types";
import { MATERIAL_SEED_COLOR } from "@/constants/colors";

/**
 * Photo button on Android: Material 3 tonal button. With a photo it anchors
 * a Material 3 dropdown menu; Remove text is red.
 *
 * Compose views must be direct children of a `Host`, so the tree is
 * `Host > DropdownMenu > RNHostView > Pressable`, like `EntryMenu`.
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
  const [expanded, setExpanded] = useState(false);

  if (!hasPhoto) {
    return <Trigger label={addLabel} testID={testID} onPress={onAdd} />;
  }

  return (
    <Host matchContents seedColor={MATERIAL_SEED_COLOR}>
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
        color={colors.bottomSheetBackground}
      >
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <Trigger
              label={editLabel}
              testID={testID}
              onPress={() => setExpanded(true)}
            />
          </RNHostView>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.testID}
              modifiers={[composeTestID(action.testID)]}
              onClick={() => {
                setExpanded(false);
                action.onPress();
              }}
              elementColors={
                action.destructive
                  ? { textColor: colors.dangerButtonText }
                  : undefined
              }
            >
              <DropdownMenuItem.Text>
                <Text>{action.label}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
};
