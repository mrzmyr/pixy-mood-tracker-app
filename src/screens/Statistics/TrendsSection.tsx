import { useNavigation } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import { TrendingUp } from "react-native-feather";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { t } from "@/helpers/translation";
import useColors from "../../hooks/useColors";
import { useStatistics } from "../../hooks/useStatistics";
import { MoodTrend } from "./MoodTrend";
import { Subtitle } from "./Subtitle";
import { TagsDistributionTrend } from "./TagsDistributionTrend";
import { Title } from "./Title";

export const TrendsSection = () => {
  const colors = useColors();
  const navigation = useNavigation();
  const statistics = useStatistics();

  return (
    <>
      <Title>{t("statistics_trends")}</Title>
      <Subtitle>{t("statistics_trends_description")}</Subtitle>

      {statistics.isLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            marginTop: 32,
          }}
        >
          <ActivityIndicator color={colors.loadingIndicator} />
        </View>
      ) : (
        <>

          {/* {statistics.isAvailable("tags_distribution_trend") && (
            <>
              {statistics.state.trends.tagsDistributionData.tags.map((tag, index) => (
                <TagsDistributionTrend key={index} tag={tag} />
              ))}
            </>
          )} */}

          <MenuList
            style={{
              marginTop: 16,
              marginBottom: 32,
            }}
          >
            <MenuListItem
              title={t("statistics_trends_more")}
              isLink
              isLast
              // onPress={() => navigation.navigate("StatisticsTrends")}
              iconLeft={
                <TrendingUp width={18} height={18} color={colors.tint} />
              }
            />
          </MenuList>
        </>
      )}
    </>
  );
};
