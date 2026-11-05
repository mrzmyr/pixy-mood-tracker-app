import { View } from "react-native";
import { ModuleIcon } from "@/components/module-icon";
import type { CoreModule } from "@/components/module-icon";
import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";

const TITLE_KEYS = {
  rating: "logger_step_rating",
  message: "logger_step_message",
  emotions: "logger_step_emotions",
  people: "logger_step_people",
  tags: "logger_step_tags",
  photos: "logger_step_photos",
} as const satisfies Record<CoreModule, string>;

/** Screen edge to content, same as the quick check-in. */
const INSET = 20;

/**
 * One section of the quick check-in: Core Module icon and name as a header,
 * then the content. `inset` false lets content run to the screen edges, like
 * the emotion grid and the people row, which pad themselves.
 */
export const QuickCheckInSection = ({
  module,
  inset = true,
  children,
}: {
  module: CoreModule;
  inset?: boolean;
  children: React.ReactNode;
}) => {
  const colors = useColors();
  return (
    <View style={{ gap: 12 }}>
      <View
        accessibilityRole="header"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: INSET,
        }}
      >
        <ModuleIcon module={module} color={colors.textSecondary} />
        <Label size={16} strong style={{ color: colors.textSecondary }}>
          {t(TITLE_KEYS[module])}
        </Label>
      </View>
      <View style={inset ? { paddingHorizontal: INSET } : undefined}>
        {children}
      </View>
    </View>
  );
};
