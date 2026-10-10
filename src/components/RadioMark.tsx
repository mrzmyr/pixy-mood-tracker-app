import { Circle, CircleCheck } from "lucide-react-native";
import useColors from "@/hooks/useColors";

/** Props of the radio mark in a radio menu row. */
export interface RadioMarkProps {
  selected: boolean;
  /** Called when the mark itself is tapped; the row handles other taps. */
  onSelect: () => void;
}

/**
 * Radio mark of a radio menu row on iOS: filled check circle when selected,
 * as on the App Icon screen. Android uses the Material radio button
 * (`RadioMark.android.tsx`). The row carries role and state for screen
 * readers, so the mark is hidden from them.
 */
const RadioMark = ({ selected }: RadioMarkProps) => {
  const colors = useColors();

  return selected ? (
    <CircleCheck
      size={24}
      color={colors.background}
      fill={colors.tint}
      aria-hidden
    />
  ) : (
    <Circle
      size={24}
      color={colors.textSecondary}
      strokeWidth={1.5}
      aria-hidden
    />
  );
};

export default RadioMark;
