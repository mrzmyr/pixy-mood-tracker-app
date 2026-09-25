import { SlideSleepButton } from "@/features/logger/slides/SlideSleepButton";
import type { LogItem } from "@/features/logs";
import { t } from "i18n-js";
import { View } from "react-native";
import { SectionHeader } from "./SectionHeader";

/**
 * Sleep section of an entry card; renders nothing when the entry has no
 * sleep rating.
 */
export const Sleep = ({ item }: { item: LogItem }) => {
  if (!item.sleep?.quality) {
    return null;
  }

  return (
    <View style={{}}>
      <SectionHeader title={t("view_log_sleep")} />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        <SlideSleepButton
          value={item.sleep?.quality}
          style={{
            flex: 0,
            minWidth: 80,
            margin: -4,
          }}
        />
      </View>
    </View>
  );
};
