import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Card } from "../../components/Card";
import { t } from "@/lib/translation";
import { useCalendarFilters } from "@/features/calendar";
import { PersonChip } from "@/features/people";
import useColors from "@/hooks/useColors";
import type { PeopleDistributionData } from "../../PeopleDistribution";
import { RADIUS } from "@/constants/Radius";
import { getBarFraction, getMaxCount } from "../../barFraction";

const LIMIT = 5;

/**
 * Highlight card: entries per person, most seen first. Tapping a row filters
 * the calendar to that person and switches to the Calendar tab.
 */
export const PeopleDistributionCard = ({
  data,
}: {
  data: PeopleDistributionData;
}) => {
  const colors = useColors();
  const calendarFilters = useCalendarFilters();
  const router = useRouter();
  const max = getMaxCount(data.people);

  const onPress = (personId: string) => {
    calendarFilters.set({ ...calendarFilters.data, personIds: [personId] });
    router.dismissTo("/calendar");
  };

  return (
    <Card
      subtitle={t("people")}
      title={t("statistics_people_distribution_title")}
    >
      <View style={{ flexDirection: "column" }}>
        {data.people.slice(0, LIMIT).map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => onPress(entry.id)}
            accessibilityRole="button"
            accessibilityLabel={`${entry.details.name}, ${entry.count}`}
            testID={`statistics-person-${entry.id}`}
            style={({ pressed }) => ({
              marginBottom: 12,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            {/* Name row above the bar: the bar spans the full card width, so
                every bar shares one scale whatever the name length. */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <PersonChip
                person={entry.details}
                style={{ marginBottom: 0, flexShrink: 1, minWidth: 0 }}
              />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "600",
                  fontVariant: ["tabular-nums"],
                  marginLeft: "auto",
                  paddingLeft: 12,
                }}
              >
                {entry.count}x
              </Text>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: RADIUS.xs,
                backgroundColor: colors.tagBackgroundActive,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${getBarFraction(entry.count, max) * 100}%`,
                  height: 8,
                  borderRadius: RADIUS.xs,
                  backgroundColor: colors.tint,
                }}
              />
            </View>
          </Pressable>
        ))}
        {data.people.length > LIMIT && (
          <Text
            style={{ marginTop: 8, fontSize: 14, color: colors.textSecondary }}
          >
            {t("statistics_people_more", { count: data.people.length - LIMIT })}
          </Text>
        )}
      </View>
    </Card>
  );
};
