import { View } from "react-native";
import Toggle from "@/components/toggle";
import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import TextInfo from "@/components/text-info";
import { t } from "@/lib/translation";
import { useStepEnabled } from "../use-step-enabled";

/**
 * "Track Tags" / "Track People" / "Track Sleep" switch on top of the step's settings page.
 * Turning it off hides the step in the logger and the list on this page.
 */
export const StepSwitch = ({ step }: { step: "tags" | "people" | "sleep" }) => {
  const { enabled, setEnabled } = useStepEnabled(step);

  return (
    <View style={{ marginTop: 16, marginHorizontal: 16 }}>
      <MenuList>
        <MenuListItem
          title={t(`step_track_${step}`)}
          iconRight={
            <Toggle
              accessibilityLabel={t(`step_track_${step}`)}
              testID={`step-${step}-enabled`}
              onValueChange={setEnabled}
              value={enabled}
            />
          }
        />
      </MenuList>
      <TextInfo style={{ marginTop: 8 }}>
        {t("step_track_description")}
      </TextInfo>
    </View>
  );
};
