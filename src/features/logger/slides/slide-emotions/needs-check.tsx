import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { View } from "react-native";
import { Body } from "@/components/type";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { EMOTIONS } from "../../config";
import { NeedInfo } from "./need-info";
import { getNeedExamples, NEED_STATES, NEEDS } from "./needs";
import type { NeedKey, NeedState, NeedStates } from "./needs";

const STATE_LABELS = {
  met: "log_needs_met",
  partly: "log_needs_partly",
  unmet: "log_needs_unmet",
} as const satisfies Record<NeedState, string>;

/**
 * Needs mode of the emotions step: one native segmented control per need
 * (met, partly, unmet) and an info button with what the need means. Unrated
 * needs show no selected segment.
 */
export const NeedsCheck = ({
  states,
  onChange,
}: {
  states: NeedStates;
  onChange: (key: NeedKey, state: NeedState) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const values = NEED_STATES.map((state) => t(STATE_LABELS[state]));

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
      {NEEDS.map((need) => {
        const Icon = need.icon;
        const state = states[need.key];

        return (
          <View
            key={need.key}
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            testID={`needs-${need.key}`}
          >
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon size={20} color={colors.textSecondary} />
              <Body style={{ flexShrink: 1 }}>{t(need.label)}</Body>
              <NeedInfo
                title={t(need.label)}
                description={t(need.description)}
                {...getNeedExamples(need, EMOTIONS)}
                testID={`needs-${need.key}-info`}
              />
            </View>
            <SegmentedControl
              values={values}
              selectedIndex={state ? NEED_STATES.indexOf(state) : -1}
              tintColor={colors.tint}
              onChange={(event) => {
                const next =
                  NEED_STATES[event.nativeEvent.selectedSegmentIndex];
                if (next) {
                  haptics.selection();
                  onChange(need.key, next);
                }
              }}
              testID={`needs-${need.key}-control`}
              style={{ flex: 1.3 }}
            />
          </View>
        );
      })}
    </View>
  );
};
