import { Text, View } from "react-native";
import { Card } from "@/components/Statistics/Card";
import { t } from "@/helpers/translation";
import useColors from "../../hooks/useColors";
import { TagsDistributionTrendData } from "../../hooks/useStatistics/TagsDistributionTrend";
import { CardFeedback } from "@/components/Statistics/CardFeedback";
import { TagBar } from "./TagBar";

export const TagsDistributionTrend = ({
  tag,
}: {
  tag: TagsDistributionTrendData["tags"][number];
}) => {
  const colors = useColors();

  return (
    <Card
      subtitle={t("tags")}
      title={
        <>
          <Text
            style={{
              fontSize: 17,
              color: colors.text,
              fontWeight: "bold",
            }}
          >
            {t('statistics_tags_distribution_trend_prefix')}
            <Text
              style={{
                fontSize: 17,
                color: colors.tags[tag?.color]?.text,
              }}
            >
              &nbsp;{tag?.title}&nbsp;
            </Text>
            {t(`statistics_tags_distribution_trend_${tag.type}_suffix`)}
          </Text>
        </>
      }
    >
      <View
        style={{
          flexDirection: "column",
        }}
      >
        <View
          style={{
            marginBottom: 4,
          }}
        >
          <TagBar
            width={`${(tag.periode2Count / tag.total) * 100}%`}
            colorName={tag.color}
            size={'large'}
            label={'This Month'}
          >
            {tag.periode2Count.toString()}x
          </TagBar>
        </View>
        <View style={{
          marginTop: 8,
        }}>
          <TagBar
            width={`${(tag.periode1Count / tag.total) * 100}%`}
            muted
            size="small"
            label={'Last Month'}
          >
            {tag.periode1Count.toString()}x
          </TagBar>
        </View>
      </View>
      <CardFeedback
        analyticsId="tags_distribution_trend"
        analyticsData={{}}
      />
    </Card>
  );
};
