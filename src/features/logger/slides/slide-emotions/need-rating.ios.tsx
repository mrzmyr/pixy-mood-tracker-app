import { Host, Image, Picker } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  frame,
  pickerStyle,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import type { NeedState } from "./needs";
import { RATING_LABELS, RATING_ORDER } from "./need-rating-types";
import type { NeedRatingProps } from "./need-rating-types";

/** Fits 3 symbol segments with 44 pt targets. */
const WIDTH = 132;
/** Height of a native segmented control. */
const HEIGHT = 32;

const SYMBOLS = {
  met: "checkmark",
  partly: "circle.lefthalf.filled",
  unmet: "xmark",
} as const;

/** `Picker` tags are strings: "none" stands for an unrated need. */
const NONE = "none";

/**
 * Need rating on iOS: native segmented picker with one SF Symbol per state.
 * No tag matches "none", so an unrated need shows no selected segment.
 */
export const NeedRating = ({
  label,
  state,
  onChange,
  testID,
}: NeedRatingProps) => {
  const haptics = useHaptics();

  return (
    // A Host near the screen bottom takes the home indicator inset and
    // draws the control 16 pt too high. The row lays out the fixed size.
    <Host
      ignoreSafeArea="all"
      style={{ width: WIDTH, height: HEIGHT }}
      testID={testID}
    >
      <Picker
        selection={state ?? NONE}
        onSelectionChange={(selection: string) => {
          const next = RATING_ORDER.find((value) => value === selection);
          if (next) {
            haptics.selection();
            onChange(next);
          }
        }}
        modifiers={[
          pickerStyle("segmented"),
          frame({ width: WIDTH, height: HEIGHT }),
          accessibilityLabel(label),
        ]}
      >
        {RATING_ORDER.map((value: NeedState) => (
          <Image
            key={value}
            systemName={SYMBOLS[value]}
            modifiers={[
              tag(value),
              accessibilityLabel(t(RATING_LABELS[value])),
            ]}
          />
        ))}
      </Picker>
    </Host>
  );
};
