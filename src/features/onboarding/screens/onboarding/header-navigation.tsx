import { Pressable, View } from "react-native";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import { Label } from "@/components/typography";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { HeaderPagination } from "./header-pagination";

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
        <Label
          size={16}
          strong
          style={{ color: colors.onboardingPaginationText }}
        >
          {t("onboarding_skip")}
        </Label>
      </Pressable>
    </View>
  );
};
