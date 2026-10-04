import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/featureFlags";
import { OPTIONS } from "../catalog";
import { useCompletedToday } from "../completed";
import { matchCluster } from "../match";
import { useCardShown } from "../useCardShown";
import { useOpenIntervention } from "../useOpenIntervention";
import { OptionTile } from "./OptionTile";

/**
 * Interventions on the confirmation after a new entry: quick and medium
 * tiles when an emotion matches a cluster. Nothing without the
 * `interventions` flag or a match. There is no dismiss control; Done
 * closes the confirmation as before.
 */
export const ConfirmationOffer = ({ item }: { item: LogItem }) => {
  const colors = useColors();
  const isEnabled = useFeatureFlag("interventions");
  const completedToday = useCompletedToday();
  const open = useOpenIntervention();
  const match = isEnabled ? matchCluster(item.emotions) : null;
  const options = match ? OPTIONS[match.cluster].confirmation : [];

  useCardShown(
    match
      ? {
          surface: "confirmation",
          cluster: match.cluster,
          matched_emotions: match.emotions,
          options_shown: options,
          completed_today_count: completedToday.length,
        }
      : null
  );

  if (!match) {
    return null;
  }

  return (
    <View testID="intervention-offer" style={{ gap: 12, marginBottom: 16 }}>
      <Text style={{ fontSize: 15, color: colors.textSecondary }}>
        {t(`interventions_offer_${match.cluster}`)}
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {options.map((id, position) => (
          <OptionTile
            key={id}
            id={id}
            backgroundColor={colors.logCardBackground}
            style={{ flex: 1 }}
            onPress={() =>
              open({
                id,
                surface: "confirmation",
                position,
                completedToday,
                navigation: "replace",
              })
            }
          />
        ))}
      </View>
    </View>
  );
};
