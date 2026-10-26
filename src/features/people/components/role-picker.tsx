import { useRouter } from "expo-router";
import type { RolePreset } from "../role-presets";
import { RoleMenu } from "./role-menu";

/**
 * Role of a person: "None" or one fixed role. No custom roles: "Request a
 * Role…" opens the request form (`/request?kind=role`), like "Missing one?"
 * for emotions.
 */
export const RolePicker = ({
  value,
  onChange,
  testID,
}: {
  value: RolePreset | undefined;
  onChange: (role: RolePreset | undefined) => void;
  testID: string;
}) => {
  const router = useRouter();

  return (
    <RoleMenu
      value={value}
      onChange={onChange}
      onRequest={() =>
        router.push({ pathname: "/request", params: { kind: "role" } })
      }
      testID={testID}
    />
  );
};
