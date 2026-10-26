import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import MenuListItem from "@/components/menu-list-item";
import { t } from "@/lib/translation";
import type { RoleMenuProps } from "./role-menu-types";
import { getRoleOptions } from "./role-menu-types";

/**
 * Role list on web: one radio row per role and a "Request a Role…" row.
 * iOS and Android use native menus (`role-menu.ios.tsx`,
 * `role-menu.android.tsx`).
 */
export const RoleMenu = ({
  value,
  onChange,
  onRequest,
  testID,
}: RoleMenuProps) => (
  <>
    <MenuListHeadline>{t("people_role")}</MenuListHeadline>
    <MenuList>
      {getRoleOptions().map((option) => (
        <MenuListItem
          key={option.value ?? "none"}
          testID={`${testID}-${option.value ?? "none"}`}
          title={option.label}
          checked={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
      <MenuListItem
        testID={`${testID}-request`}
        title={t("people_role_request")}
        onPress={onRequest}
        tone="action"
      />
    </MenuList>
  </>
);
