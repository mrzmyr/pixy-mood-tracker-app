import { SettingsPeople } from "@/features/people/routes";
import { StepSwitch } from "../components/step-switch";
import { useStepEnabled } from "../use-step-enabled";

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
