import { Pressable, Text, View } from "react-native";
import { ArrowLeft } from "react-native-feather";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { HeaderPagination } from "./HeaderPagination";

/** Back, pagination, and skip controls above onboarding slides. */
export const HeaderNavigation = ({
  index,
  setIndex,
  onSkip,
}: {
  index: number;
  setIndex: (index: number) => void;
  onSkip: () => void;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 32,
        borderBottomColor: colors.onboardingBottomBorder,
        borderBottomWidth: 1,
      }}
    >
      <Pressable
        testID="onboarding-back"
        accessibilityRole="button"
        accessibilityLabel={t("onboarding_back")}
        style={{
          minWidth: 44,
          minHeight: 44,
          padding: 10,
          marginLeft: -10,
          justifyContent: "center",
        }}
        onPress={() => {
          setIndex(index - 1);
        }}
      >
        <ArrowLeft
          width={24}
          height={24}
          color={colors.onboardingPaginationText}
        />
      </Pressable>
      <HeaderPagination index={index} />
      <Pressable
        testID="onboarding-skip"
        accessibilityRole="button"
        accessibilityLabel={t("onboarding_skip")}
        onPress={() => {
          onSkip();
        }}
        style={{
          minWidth: 44,
          minHeight: 44,
          paddingHorizontal: 16,
          marginRight: -16,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: colors.onboardingPaginationText,
            fontSize: 17,
            fontWeight: "600",
          }}
        >
          {t("onboarding_skip")}
        </Text>
      </Pressable>
    </View>
  );
};
