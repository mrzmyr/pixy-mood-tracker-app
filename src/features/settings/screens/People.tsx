import { SettingsPeople } from "@/features/people";
import { StepSwitch } from "../components/StepSwitch";

/** Settings > Check-in > People: the step switch above the people list. */
export const SettingsPeopleScreen = () => (
  <SettingsPeople header={<StepSwitch step="people" />} />
);
