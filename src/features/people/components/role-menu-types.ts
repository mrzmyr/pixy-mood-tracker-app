import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { ROLE_PRESETS } from "../role-presets";
import type { RolePreset } from "../role-presets";

/** Shared by the iOS, Android, and web role menus. `undefined` is no role. */
export interface RoleMenuProps {
  value: RolePreset | undefined;
  onChange: (role: RolePreset | undefined) => void;
  /** Opens the "Request a Role" sheet. */
  onRequest: () => void;
  testID: string;
}

const ROLE_KEYS = {
  partner: "people_role_partner",
  parent: "people_role_parent",
  child: "people_role_child",
  sibling: "people_role_sibling",
  friend: "people_role_friend",
  colleague: "people_role_colleague",
  other: "people_role_other",
} as const satisfies Record<RolePreset, TranslationKey>;

/** "None" first, then the presets. `undefined` is no role. */
export const getRoleOptions = () => [
  { value: undefined, label: t("people_role_none") },
  ...ROLE_PRESETS.map((role) => ({ value: role, label: t(ROLE_KEYS[role]) })),
];

/** Shown on the role row. No role reads "None". */
export const getRoleLabel = (role: RolePreset | undefined) =>
  role === undefined ? t("people_role_none") : t(ROLE_KEYS[role]);
