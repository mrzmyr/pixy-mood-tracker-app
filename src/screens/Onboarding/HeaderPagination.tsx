import { View } from 'react-native';
import useColors from '../../hooks/useColors';

const HeaderPaginationDot = ({ active }: { active: boolean }) => {
  const colors = useColors()

  return (
    <View style={{
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: active ? colors.onboardingPaginationDotActive : colors.onboardingPaginationDotInactive,
      marginHorizontal: 6,
    }} />
  )
}

export const HeaderPagination = ({ index }: { index: number; }) => {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <HeaderPaginationDot active={index === 0} />
      <HeaderPaginationDot active={index === 1} />
      <HeaderPaginationDot active={index === 2} />
      <HeaderPaginationDot active={index === 3} />
      <HeaderPaginationDot active={index === 4} />
    </View>
  );
};
