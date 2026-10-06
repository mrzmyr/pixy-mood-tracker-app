import type { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";

// Names written out before the `+N` count. Long names still end in "…".
const MAX_NAMES = 3;

/** One named item of a summary line, with an optional color dot. */
export interface SummaryItem {
  key: string;
  label: string;
  dotColor?: string;
}

/**
 * One line on a timeline card: icon, the first 3 names, and `+N` for the
 * rest. Names with a color dot are spaced apart; names without one get
 * commas. The names truncate with "…", the count always stays visible, so
 * an entry with all 161 emotions or 50 tags keeps a one-line card row.
 */
export const SummaryLine = ({
  icon: Icon,
  items,
  testID,
}: {
  icon: LucideIcon;
  items: SummaryItem[];
  testID?: string;
}) => {
  const colors = useColors();
  if (items.length === 0) {
    return null;
  }
  const shown = items.slice(0, MAX_NAMES);
  const hiddenCount = items.length - shown.length;

  return (
    <View
      testID={testID}
      style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
    >
      <Icon size={16} color={colors.textSecondary} />
      <Text
        numberOfLines={1}
        style={{ flexShrink: 1, fontSize: 15, color: colors.text }}
      >
        {shown.map((item, index) => (
          <Text key={item.key}>
            {index > 0 && (item.dotColor === undefined ? ", " : "   ")}
            {item.dotColor !== undefined && (
              <Text style={{ color: item.dotColor }}>{"● "}</Text>
            )}
            {item.label}
          </Text>
        ))}
      </Text>
      {hiddenCount > 0 && (
        <Text
          style={{
            fontSize: 15,
            color: colors.textSecondary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {`+${hiddenCount}`}
        </Text>
      )}
    </View>
  );
};
