import { Switch, View } from "react-native";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import { t } from "@/lib/translation";
import { useStepEnabled } from "../useStepEnabled";

/**
 * "Track Tags" / "Track People" switch on top of the step's settings page.
 * Turning it off hides the step in the logger and the list on this page.
 */
export const StepSwitch = ({ step }: { step: "tags" | "people" }) => {
  const { enabled, setEnabled } = useStepEnabled(step);

  return (
    <View style={{ marginTop: 16, marginHorizontal: 16 }}>
      <MenuList>
        <MenuListItem
          title={t(`step_track_${step}`)}
          iconRight={
            <Switch
              accessibilityLabel={t(`step_track_${step}`)}
              testID={`step-${step}-enabled`}
              onValueChange={setEnabled}
              value={enabled}
            />
          }
          isLast
        />
      </MenuList>
      <TextInfo>{t("step_track_description")}</TextInfo>
    </View>
  );
};
