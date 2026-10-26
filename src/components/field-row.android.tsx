import { Icon, Row, Spacer, Text } from "@expo/ui";

import { useSecondaryText } from "@/components/settings-form/platform";
import useColors from "@/hooks/use-colors";
import type { FieldRowProps } from "./field-row";

/**
 * Material settings row: icon, title, optional value, no affordance.
 * `FieldGroup.Section` already wraps each row in a Material `ListItem`, so
 * this is a plain row. A nested `ListItem` adds its padding again on some
 * renders: titles start 16dp further in and rows grow taller than
 * `SettingsRow` rows.
 */
const FieldRow = ({ title, icon, value, onPress, testID }: FieldRowProps) => {
  const colors = useColors();
  const secondary = useSecondaryText();

  return (
    <Row alignment="center" spacing={12} onPress={onPress} testID={testID}>
      <Icon name={icon} size={20} color={colors.menuListItemIcon} />
      <Text>{title}</Text>
      <Spacer flexible />
      {value ? (
        <Text textStyle={secondary.textStyle} modifiers={secondary.modifiers}>
          {value}
        </Text>
      ) : null}
    </Row>
  );
};

export default FieldRow;
