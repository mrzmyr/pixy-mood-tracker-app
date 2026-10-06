import { SlideSleepButton } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import { useRouter } from "expo-router";
import { t } from "@/lib/translation";
import { View } from "react-native";
import { SectionHeader } from "./SectionHeader";

/**
 * Sleep section of an entry card; renders nothing when the entry has no
 * sleep rating. Editing opens the logger at the sleep step.
 */
export const Sleep = ({
  item,
  canEdit,
}: {
  item: LogItem;
  /** Shows the pencil; off when the edit logger has no sleep step. */
  canEdit: boolean;
}) => {
  const router = useRouter();

  if (!item.sleep?.quality) {
    return null;
  }

  return (
    <View style={{}}>
      <SectionHeader
        title={t("view_log_sleep")}
        editTestID="log-list-sleep-edit"
        onEdit={
          canEdit
            ? () => {
                router.push({
                  pathname: "/logs/[id]/edit",
                  params: {
                    id: item.id,
                    step: "sleep",
                  },
                });
              }
            : undefined
        }
      />
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
