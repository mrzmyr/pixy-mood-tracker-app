import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  HorizontalDivider,
  RNHostView,
  RadioButton,
  Text,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { Text as RNText } from "react-native";
import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { RoleMenuProps } from "./role-menu-types";
import { getRoleLabel, getRoleOptions } from "./role-menu-types";
import { MATERIAL_SEED_COLOR } from "@/constants/colors";

/**
 * Role row on Android: a list row with the current role. A tap opens a
 * Material 3 dropdown: radio buttons for "None" and each role, then
 * "Request a Role…".
 *
 * Compose views must be direct children of a `Host`, so the tree is
 * `Host > DropdownMenu > RNHostView > row`, like the entry time menu.
 */
export const RoleMenu = ({
  value,
  onChange,
  onRequest,
  testID,
}: RoleMenuProps) => {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const label = getRoleLabel(value);

  const choose = (action: () => void) => () => {
    setExpanded(false);
    action();
  };

  return (
    <MenuList>
      <Host matchContents={{ vertical: true }} seedColor={MATERIAL_SEED_COLOR}>
        <DropdownMenu
          expanded={expanded}
          onDismissRequest={() => setExpanded(false)}
          color={colors.bottomSheetBackground}
        >
          <DropdownMenu.Trigger>
            <RNHostView matchContents>
              <MenuListItem
                testID={testID}
                title={t("people_role")}
                accessibilityValue={{ text: label }}
                onPress={() => setExpanded(true)}
                iconRight={
                  <RNText style={{ fontSize: 16, color: colors.textSecondary }}>
                    {label}
                  </RNText>
                }
              />
            </RNHostView>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {getRoleOptions().map((option) => (
              <DropdownMenuItem
                key={option.value ?? "none"}
                onClick={choose(() => onChange(option.value))}
              >
                <DropdownMenuItem.LeadingIcon>
                  <RadioButton selected={option.value === value} />
                </DropdownMenuItem.LeadingIcon>
                <DropdownMenuItem.Text>
                  <Text>{option.label}</Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            ))}
            <HorizontalDivider />
            <DropdownMenuItem onClick={choose(onRequest)}>
              <DropdownMenuItem.Text>
                <Text>{t("people_role_request")}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          </DropdownMenu.Items>
        </DropdownMenu>
      </Host>
    </MenuList>
  );
};
