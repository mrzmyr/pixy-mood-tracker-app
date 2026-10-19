import { Icon, ListItem, Row, Text } from "@expo/ui";
import type { IconName } from "@expo/ui";
import { Platform } from "react-native";

import useColors from "@/hooks/use-colors";

/**
 * What a tap on the row does. Sets the trailing affordance on iOS:
 * `push` shows a chevron, `external` an arrow, `action` nothing.
 * Material 3 list rows show no affordance, so Android ignores it.
 */
export type FieldRowKind = "push" | "external" | "action";

const ICON_SIZE = 20;
/**
 * Fixed square icon slot, icon centered. SF Symbols differ in width and
 * height. Width: without the slot each title starts at a different x, and
 * iOS draws each row separator from its own title. Height: rows take the
 * glyph height, so some rows end on a fractional point and the grouped
 * background shows through as a hairline.
 */
const ICON_FRAME = 28;
const AFFORDANCE_SIZE = 13;

const IOS_AFFORDANCE = {
  push: "chevron.right",
  external: "arrow.up.right",
  action: null,
} as const;

/**
 * Native settings row for `FieldGroup.Section`: icon, title, optional value
 * and affordance. Must render inside an `@expo/ui` `Host`. Render it only
 * when visible: Android wraps every section child in a row, so a child that
 * renders `null` leaves an empty row.
 */
const FieldRow = ({
  title,
  icon,
  kind,
  value,
  onPress,
  testID,
}: {
  title: string;
  icon: IconName;
  kind: FieldRowKind;
  /** Current value, shown before the affordance, for example "On". */
  value?: string;
  onPress: () => void;
  testID?: string;
}) => {
  const colors = useColors();
  const affordance = Platform.OS === "ios" ? IOS_AFFORDANCE[kind] : null;

  const valueText = value ? (
    <Text textStyle={{ color: colors.textSecondary }}>{value}</Text>
  ) : null;
  const affordanceIcon = affordance ? (
    <Icon
      name={affordance}
      size={AFFORDANCE_SIZE}
      color={colors.menuListItemIcon}
    />
  ) : null;

  return (
    <ListItem
      onPress={onPress}
      testID={testID}
      // Android: the section row already paints the container.
      colors={{ containerColor: "transparent" }}
      leading={
        <Icon
          name={icon}
          size={ICON_SIZE}
          color={colors.menuListItemIcon}
          style={{ width: ICON_FRAME, height: ICON_FRAME }}
        />
      }
      trailing={
        valueText && affordanceIcon ? (
          <Row spacing={8} alignment="center">
            {valueText}
            {affordanceIcon}
          </Row>
        ) : (
          (valueText ?? affordanceIcon)
        )
      }
    >
      {title}
    </ListItem>
  );
};

export default FieldRow;
