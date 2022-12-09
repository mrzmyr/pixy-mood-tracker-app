import { Dayjs } from 'dayjs';
import { View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'react-native-feather';
import Button from '@/components/Button';
import useColors from '../../hooks/useColors';

export const Navigation = ({
  onNext, onPrev, nextMonthDisabled, prevMonthDisabled,
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
        flexDirection: 'row',
      }}
    >
      <Button
        onPress={onPrev}
        disabled={prevMonthDisabled}
        type="tertiary"
        style={{
          flex: 1,
          marginRight: 8,
        }}
      >
        <ChevronLeft width={20} height={20} color={colors.tertiaryButtonText} strokeWidth={3} />
      </Button>
      <Button
        onPress={onNext}
        disabled={nextMonthDisabled}
        type="tertiary"
        style={{
          flex: 1,
        }}
      >
        <ChevronRight width={20} height={20} color={colors.tertiaryButtonText} strokeWidth={3} />
      </Button>
    </View>
  );
};
