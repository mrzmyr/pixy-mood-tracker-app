import { Icon, ListItem } from "@expo/ui";
import { testID as composeTestID } from "@expo/ui/jetpack-compose/modifiers";
import { Platform } from "react-native";
import useColors from "@/hooks/useColors";
import type { SettingsRowProps } from "./types";

const CHEVRON = Icon.select({
  ios: "chevron.right",
  android: import("@expo/material-symbols/chevron_right.xml"),
});

/**
 * Settings row on Android and web: universal `ListItem`, a Material 3 list
 * item on Android. iOS uses `SettingsRow.ios.tsx`.
 *
 * Android drops `ListItem`'s `testID`, so the row passes it as a Compose
 * test tag. `FieldGroup.Section` already wraps each row in a filled list
 * item, so the row container stays transparent.
 */
export const SettingsRow = ({
  title,
  icon,
  onPress,
  isLink = false,
  testID,
}: SettingsRowProps) => {
  const colors = useColors();

  return (
    <ListItem
      onPress={onPress}
      testID={testID}
      colors={{ containerColor: "transparent" }}
      modifiers={
        Platform.OS === "android" && testID
          ? [composeTestID(testID)]
          : undefined
      }
      leading={<Icon name={icon} size={24} color={colors.textSecondary} />}
      trailing={
        isLink ? (
          <Icon name={CHEVRON} size={24} color={colors.textSecondary} />
        ) : undefined
      }
    >
      {title}
    </ListItem>
  );
};
