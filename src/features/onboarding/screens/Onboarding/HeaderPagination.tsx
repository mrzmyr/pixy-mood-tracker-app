import { View } from "react-native";
import useColors from "@/hooks/useColors";
import { RADIUS } from "@/constants/Radius";

const HeaderPaginationDot = ({ active }: { active: boolean }) => {
  const colors = useColors();

  return (
    <View
      testID="onboarding-pagination-dot"
      accessibilityState={{ selected: active }}
      style={{
        width: 8,
        height: 8,
        borderRadius: RADIUS.full,
        backgroundColor: active
          ? colors.onboardingPaginationDotActive
          : colors.onboardingPaginationDotInactive,
        marginHorizontal: 6,
      }}
    />
  );
};

/** First onboarding slide that shows the header; it gets the first dot. */
const FIRST_HEADER_SLIDE = 1;
const HEADER_SLIDE_COUNT = 4;

/** Four pagination dots for header slides 1 to 4; `index` is the slide index. */
export const HeaderPagination = ({ index }: { index: number }) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    {Array.from({ length: HEADER_SLIDE_COUNT }, (_, dot) => (
      <HeaderPaginationDot
        key={dot}
        active={index - FIRST_HEADER_SLIDE === dot}
      />
    ))}
  </View>
);
