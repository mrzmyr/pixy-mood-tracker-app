import type { ComponentProps } from "react";
import { View } from "react-native";
import { CollapsibleSection } from "@/components/collapsible-section";
import { useCollapsedSections } from "@/hooks/use-collapsed-sections";

/** Screen edge to content, same as the logger. */
export const INSET = 20;

/** Sections whose cards fold away. Mood and note always show. */
type SectionKey = "emotions" | "people" | "tags" | "photos";

/** Long sections start folded, so mood, note, and people fit one screen. */
const DEFAULT_COLLAPSED: ReadonlySet<SectionKey> = new Set([
  "emotions",
  "tags",
]);

/**
 * One section card of the quick check-in. Emotions and tags start folded.
 * The folded state stays on the device. A search keeps the card open
 * without a chevron.
 */
export const QuickCheckInSection = ({
  section,
  isSearching,
  ...props
}: Omit<
  ComponentProps<typeof CollapsibleSection>,
  "isCollapsed" | "onToggle" | "testID"
> & {
  section: SectionKey;
  isSearching: boolean;
}) => {
  const collapsed = useCollapsedSections();
  const key = `quick-check-in:${section}`;
  const isDefaultCollapsed = DEFAULT_COLLAPSED.has(section);

  return (
    <View style={{ paddingHorizontal: INSET }}>
      <CollapsibleSection
        {...props}
        testID={`quick-check-in-section-${section}`}
        isCollapsed={
          isSearching
            ? undefined
            : collapsed.isCollapsed(key, isDefaultCollapsed)
        }
        onToggle={() => collapsed.toggle(key, isDefaultCollapsed)}
      />
    </View>
  );
};
