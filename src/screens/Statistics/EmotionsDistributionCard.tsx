import { Card } from "@/features/statistics/components/Card";
import { CardFeedback } from "@/features/statistics/components/CardFeedback";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import type { EmotionsDistributionData } from "@/features/statistics/EmotionsDistributuon";
import type { Emotion } from "@/types";
import { Text, View } from "react-native";
import { EmotionItem } from "../LogList/EmotionItem";

const EmotionBar = ({
  emotion,
  count,
}: {
  emotion: Emotion;
  count: number;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        position: "relative",
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 17,
          fontWeight: "500",
          position: "relative",
          marginRight: 16,
          textAlign: "right",
          marginLeft: 8,
        }}
      >
        {count}x
      </Text>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <EmotionItem emotion={emotion} />
      </View>
    </View>
  );
};

/** Emotion bars for the top `limit` entries of `data`, most used first. */
export const EmotionsDistributionContent = ({
  data,
  limit = 5,
}: {
  data: EmotionsDistributionData;
  limit?: number;
}) => (
  <View
    style={{
      flexDirection: "column",
    }}
  >
    {data.emotions.slice(0, limit).map((emotion) => (
      <EmotionBar
        key={emotion?.details?.key}
        emotion={emotion.details}
        count={emotion.count}
      />
    ))}
  </View>
);

/** Statistics highlight card for emotion usage in the last 14 days. */
export const EmotionsDistributionCard = ({
  data,
}: {
  data: EmotionsDistributionData;
}) => (
  <Card
    subtitle={t("emotions")}
    title={t("statistics_emotions_distribution_title", {
      count: data.emotions.length,
    })}
  >
    <EmotionsDistributionContent data={data} />
    <CardFeedback
      analyticsId="emotions_distribution"
      analyticsData={{
        emotions: data.emotions,
      }}
    />
  </Card>
);
