import { SettingsPeople } from "@/features/people";
import { StepSwitch } from "../components/StepSwitch";
import { useStepEnabled } from "../useStepEnabled";

/** Settings > Check-in > People: the step switch; the people list shows only while the step is on. */
export const SettingsPeopleScreen = () => {
  const { enabled } = useStepEnabled("people");
  return (
    <SettingsPeople
      header={<StepSwitch step="people" />}
      isListVisible={enabled}
    />
  );
};
