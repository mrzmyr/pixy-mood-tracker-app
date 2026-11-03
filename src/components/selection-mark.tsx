import Circle from "lucide-react-native/icons/circle";
import CircleCheck from "lucide-react-native/icons/circle-check";
import { SFIcon } from "@/components/sf-icon";
import useColors from "@/hooks/use-colors";

/**
 * Selection mark at the end of a checklist row: empty circle, or filled
 * check in the tint color.
 */
export const SelectionMark = ({ isSelected }: { isSelected: boolean }) => {
  const colors = useColors();
  const color = isSelected ? colors.tint : colors.textSecondary;
  return isSelected ? (
    <SFIcon
      name="checkmark.circle.fill"
      color={color}
      size={24}
      fallback={<CircleCheck size={24} color={color} />}
    />
  ) : (
    <SFIcon
      name="circle"
      color={color}
      size={24}
      fallback={<Circle size={24} color={color} />}
    />
  );
};
