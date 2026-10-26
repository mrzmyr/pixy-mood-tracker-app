import {
  Button,
  Divider,
  HStack,
  Host,
  Image,
  Menu,
  Picker,
  Spacer,
  Text,
} from "@expo/ui/swift-ui";
import {
  accessibilityIdentifier,
  accessibilityLabel,
  accessibilityValue,
  buttonStyle,
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI modifier name from @expo/ui.
  contentShape as hitArea,
  foregroundStyle,
  frame,
  padding,
  pickerStyle,
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI shape factory from @expo/ui.
  shapes as swiftUiOutlines,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import MenuList from "@/components/menu-list";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { ROLE_PRESETS } from "../role-presets";
import type { RoleMenuProps } from "./role-menu-types";
import { getRoleLabel, getRoleOptions } from "./role-menu-types";

/** Same height as a `MenuListItem` row on iOS. */
const ROW_HEIGHT = 50;
/** `Picker` tags are strings or numbers: "none" stands for no role, never a preset. */
const NONE = "none";

/**
 * Role row on iOS: "Role" with the current role, like a Settings pop-up row.
 * A tap opens a native SwiftUI `Menu`: an inline `Picker` with a checkmark on
 * the current role, then "Request a Role…".
 *
 * The row is SwiftUI, so the whole row is the menu trigger and VoiceOver
 * reads one button with the role as its value.
 */
export const RoleMenu = ({
  value,
  onChange,
  onRequest,
  testID,
}: RoleMenuProps) => {
  const colors = useColors();
  const label = getRoleLabel(value);

  return (
    <MenuList>
      <Host style={{ height: ROW_HEIGHT }}>
        <Menu
          label={
            <HStack
              spacing={6}
              modifiers={[
                padding({ horizontal: 16 }),
                frame({
                  maxWidth: Number.POSITIVE_INFINITY,
                  height: ROW_HEIGHT,
                }),
                hitArea(swiftUiOutlines.rectangle()),
              ]}
            >
              <Text modifiers={[foregroundStyle(colors.text)]}>
                {t("people_role")}
              </Text>
              <Spacer />
              <Text modifiers={[foregroundStyle(colors.textSecondary)]}>
                {label}
              </Text>
              <Image
                systemName="chevron.up.chevron.down"
                size={13}
                color={colors.textSecondary}
              />
            </HStack>
          }
          modifiers={[
            buttonStyle("plain"),
            accessibilityLabel(t("people_role")),
            accessibilityValue(label),
            accessibilityIdentifier(testID),
          ]}
        >
          <Picker
            selection={value ?? NONE}
            onSelectionChange={(selection: string) =>
              onChange(ROLE_PRESETS.find((role) => role === selection))
            }
            modifiers={[pickerStyle("inline")]}
          >
            {getRoleOptions().map((option) => (
              <Text
                key={option.value ?? NONE}
                modifiers={[tag(option.value ?? NONE)]}
              >
                {option.label}
              </Text>
            ))}
          </Picker>
          <Divider />
          <Button
            label={t("people_role_request")}
            systemImage="plus.bubble"
            onPress={onRequest}
          />
        </Menu>
      </Host>
    </MenuList>
  );
};
