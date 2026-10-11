import type { Dayjs } from "dayjs";
import { View } from "react-native";
import { ChevronLeft, ChevronRight } from "react-native-feather";
import Button from "@/components/Button";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/**
 * Previous/next month buttons. A direction is disabled when that month has
 * no entries. `nextMonth` and `prevMonth` name the buttons for screen readers.
 */
export const Navigation = ({
  nextMonth,
  prevMonth,
  onNext,
  onPrev,
  nextMonthDisabled,
  prevMonthDisabled,
}: {
  nextMonth: Dayjs;
  prevMonth: Dayjs;
  onNext: () => void;
  onPrev: () => void;
  nextMonthDisabled: boolean;
  prevMonthDisabled: boolean;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
      }}
    >
      <Button
        onPress={onPrev}
        accessibilityLabel={t("a11y_previous_month", {
          month: prevMonth.format("MMMM YYYY"),
        })}
        disabled={prevMonthDisabled}
        type="tertiary"
        style={{
          flex: 1,
          marginRight: 8,
        }}
      >
        <ChevronLeft
          width={20}
          height={20}
          color={colors.tertiaryButtonText}
          strokeWidth={3}
        />
      </Button>
      <Button
        onPress={onNext}
        accessibilityLabel={t("a11y_next_month", {
          month: nextMonth.format("MMMM YYYY"),
        })}
        disabled={nextMonthDisabled}
        type="tertiary"
        style={{
          flex: 1,
        }}
      >
        <ChevronRight
          width={20}
          height={20}
          color={colors.tertiaryButtonText}
          strokeWidth={3}
        />
      </Button>
    </View>
  );
};
