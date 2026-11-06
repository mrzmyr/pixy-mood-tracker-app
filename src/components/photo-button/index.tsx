import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import useColors from "@/hooks/use-colors";
import { RADIUS } from "@/constants/radius";
import { Trigger } from "./trigger";
import type { PhotoButtonProps } from "./types";
import { SPACE } from "@/constants/space";

/**
 * Photo button on web: tonal pill with a plain popover menu. iOS and Android
 * use native menus (`index.ios.tsx`, `index.android.tsx`).
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
  const [open, setOpen] = useState(false);

  if (!hasPhoto) {
    return <Trigger label={addLabel} testID={testID} onPress={onAdd} />;
  }

  return (
    <View style={{ zIndex: 1, alignItems: "center" }}>
      <Trigger
        label={editLabel}
        testID={testID}
        onPress={() => setOpen((value) => !value)}
      />
      {open && (
        <View
          style={{
            position: "absolute",
            top: 48,
            minWidth: 200,
            padding: SPACE.xs,
            borderRadius: RADIUS.md,
            borderCurve: "continuous",
            backgroundColor: colors.bottomSheetBackground,
          }}
        >
          {actions.map((action) => (
            <Pressable
              key={action.testID}
              testID={action.testID}
              accessibilityRole="menuitem"
              onPress={() => {
                setOpen(false);
                action.onPress();
              }}
              style={{ padding: SPACE.md }}
            >
              <Text
                style={{
                  color: action.destructive
                    ? colors.dangerButtonText
                    : colors.text,
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};
