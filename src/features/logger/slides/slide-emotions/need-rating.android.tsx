import {
  Host,
  Icon,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
} from "@expo/ui/jetpack-compose";
import { testID as testTag } from "@expo/ui/jetpack-compose/modifiers";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { RATING_LABELS, RATING_ORDER } from "./need-rating-types";
import type { NeedRatingProps } from "./need-rating-types";

const ICONS = {
  met: require("@expo/material-symbols/check.xml"),
  partly: require("@expo/material-symbols/contrast.xml"),
  unmet: require("@expo/material-symbols/close.xml"),
};

/**
 * Need rating on Android: Material 3 single-choice segmented buttons with
 * one Material Symbol per state. Unrated needs show no selected segment.
 */
export const NeedRating = ({ state, onChange, testID }: NeedRatingProps) => {
  const haptics = useHaptics();

  return (
    <Host matchContents>
      <SingleChoiceSegmentedButtonRow
        modifiers={testID ? [testTag(testID)] : undefined}
      >
        {RATING_ORDER.map((value) => (
          <SegmentedButton
            key={value}
            selected={state === value}
            onClick={() => {
              haptics.selection();
              onChange(value);
            }}
          >
            <SegmentedButton.Label>
              <Icon
                source={ICONS[value]}
                size={18}
                contentDescription={t(RATING_LABELS[value])}
              />
            </SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
};
