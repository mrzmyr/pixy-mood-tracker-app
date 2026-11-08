import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Label } from "@/components/typography";
import { SPACE } from "@/constants/space";
import useColors from "@/hooks/use-colors";
import { useSettings } from "@/state/settings";

/** Screen edge to content, same as the logger. */
export const INSET = 20;

/** Sections that fold away. Mood and note always show. */
export type SectionKey = "emotions" | "people" | "tags" | "photos";

/** Long sections start folded, so mood, note, and people fit one screen. */
const DEFAULT_COLLAPSED: ReadonlySet<SectionKey> = new Set([
  "emotions",
  "tags",
]);

/** Open and folded sections, kept from the last quick check-in. */
const useSectionFold = (section: SectionKey) => {
  const { settings, setSettings } = useSettings();
  const fallback = DEFAULT_COLLAPSED.has(section);
  const isCollapsed = settings.quickCheckInCollapsed[section] ?? fallback;

  return {
    isCollapsed,
    toggle: () =>
      setSettings((current) => ({
        ...current,
        quickCheckInCollapsed: {
          ...current.quickCheckInCollapsed,
          [section]: !(current.quickCheckInCollapsed[section] ?? fallback),
        },
      })),
  };
};

/**
 * One quick check-in section below a hairline divider: a quiet title row
 * and the content. The whole title row folds the section; the state stays
 * on the device for the next quick check-in. Title and chevron are gray so
 * the content leads.
 */
export const QuickCheckInSection = ({
  section,
  title,
  contentStyle,
  children,
}: {
  section: SectionKey;
  title: string;
  /** Overrides the content padding, for content that pads itself. */
  contentStyle?: ViewStyle;
  children: ReactNode;
}) => {
  const colors = useColors();
  const fold = useSectionFold(section);
  const isOpen = !fold.isCollapsed;
  const Chevron = isOpen ? ChevronDown : ChevronRight;

  return (
    <View
      testID={`quick-check-in-section-${section}`}
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: colors.logCardBorder,
      }}
    >
      <Pressable
        testID={`quick-check-in-section-${section}-toggle`}
        onPress={() => fold.toggle()}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: isOpen }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: SPACE.md,
          minHeight: 46,
          paddingHorizontal: INSET,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Label
          size={16}
          numberOfLines={1}
          style={{ flex: 1, color: colors.textSecondary }}
        >
          {title}
        </Label>
        <Chevron width={20} height={20} color={colors.textSecondary} />
      </Pressable>
      {isOpen && (
        <View
          style={{
            paddingHorizontal: INSET,
            paddingBottom: SPACE.lg,
            ...contentStyle,
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
};
