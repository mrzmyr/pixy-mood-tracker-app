import { useSetting } from "@/state/settings";
import { View } from "react-native";
import { Card } from "../../components/Card";
import { t } from "@/lib/translation";
import useScale from "@/hooks/useScale";
import type { MoodAvgData } from "../../MoodAvg";
import { RADIUS } from "@/constants/Radius";

/**
 * Card with the dominant mood group and a stacked bar of entries per
 * rating.
 */
export const MoodAvgCard = ({ data }: { data: MoodAvgData }) => {
  const scaleType = useSetting("scaleType");
  const scale = useScale(scaleType);

  return (
    <Card
      subtitle={t("mood")}
      title={t("statistics_mood_avg_title", {
        rating_word: t(`statistics_mood_avg_${data.ratingHighestKey}`),
        rating_percentage: data.ratingHighestPercentage,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
          overflow: "hidden",
          borderRadius: RADIUS.xs,
        }}
      >
        {data.distribution.map((item) => (
          <View
            key={item.key}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: scale.colors[item.key].background,
              flexBasis: `${(item.count / data.itemsCount) * 100}%`,
              height: 24,
            }}
          />
        ))}
      </View>
    </Card>
  );
};
