import { useCallback, useState } from "react";
import { RequestSheet } from "@/features/feedback";
import { useAnalytics } from "@/state/analytics";
import type { RolePreset } from "../role-presets";
import { RoleMenu } from "./role-menu";

/**
 * Role of a person: "None" or one fixed role. No custom roles: "Request a
 * Role…" sends the missing one as feedback, like "Missing one?" for emotions.
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
  const analytics = useAnalytics();
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const closeRequest = useCallback(() => setIsRequestOpen(false), []);
  const openRequest = () => {
    analytics.track("feedback:modal_opened", { type: "role" });
    setIsRequestOpen(true);
  };

  return (
    <>
      <RoleMenu
        value={value}
        onChange={onChange}
        onRequest={openRequest}
        testID={testID}
      />
      <RequestSheet
        kind="role"
        visible={isRequestOpen}
        source="people"
        onClose={closeRequest}
      />
    </>
  );
};
