import { View } from "react-native";
import useColors from "@/hooks/use-colors";
import { RADIUS } from "@/constants/radius";

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

/**
 * One dot per header slide, from slide 1 on; `index` is the slide index and
 * `count` the number of header slides.
 */
export const HeaderPagination = ({
  index,
  count,
}: {
  index: number;
  count: number;
}) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    {Array.from({ length: count }, (_, dot) => (
      <HeaderPaginationDot
        key={dot}
        active={index - FIRST_HEADER_SLIDE === dot}
      />
    ))}
  </View>
);
