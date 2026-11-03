import { useState } from "react";
import type { ReactNode } from "react";
import { Platform, Pressable, SectionList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton } from "@/components/header-button";
import ModalHeader from "@/components/modal-header";
import { SearchInput } from "@/components/search-input";
import { SelectionMark } from "@/components/selection-mark";
import { SheetModal } from "@/components/sheet-modal";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";

const IS_IOS = Platform.OS === "ios";
const ROW_HEIGHT = 52;
/** Screen edge to row content. iOS rows sit in an inset group card. */
const INSET = 16;

/** One row of {@link QuickCheckInPickerSheet}. */
export interface PickerItem {
  key: string;
  label: string;
  /** Section title. Items keep their order inside a section. */
  section: string;
  leading: ReactNode;
}

const PickerRow = ({
  item,
  isSelected,
  isFirst,
  isLast,
  onToggle,
}: {
  item: PickerItem;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: (key: string) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  return (
    <View
      style={
        IS_IOS
          ? {
              marginHorizontal: INSET,
              backgroundColor: colors.menuListItemBackground,
              borderTopLeftRadius: isFirst ? RADIUS.md : 0,
              borderTopRightRadius: isFirst ? RADIUS.md : 0,
              borderBottomLeftRadius: isLast ? RADIUS.md : 0,
              borderBottomRightRadius: isLast ? RADIUS.md : 0,
              borderCurve: "continuous",
            }
          : undefined
      }
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={item.label}
        accessibilityState={{ checked: isSelected }}
        testID={`quick-check-in-picker-${item.key}`}
        onPress={async () => {
          await haptics.selection();
          onToggle(item.key);
        }}
        style={({ pressed }) => ({
          height: ROW_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: INSET,
          gap: 12,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        {item.leading}
        <Label
          size={16}
          numberOfLines={1}
          style={{ flex: 1, color: colors.text }}
        >
          {item.label}
        </Label>
        <SelectionMark isSelected={isSelected} />
      </Pressable>
    </View>
  );
};

/**
 * Full list of one kind (emotions or people) with search and a selection
 * circle per row, like the contact import. Toggles apply at once; Done and
 * swipe-down only close the sheet.
 */
export const QuickCheckInPickerSheet = ({
  visible,
  title,
  items,
  selected,
  onToggle,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onClose: () => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const needle = query.trim().toLocaleLowerCase();
  const sections: { title: string; data: PickerItem[] }[] = [];
  for (const item of items) {
    if (needle !== "" && !item.label.toLocaleLowerCase().includes(needle)) {
      continue;
    }
    const last = sections.at(-1);
    if (last?.title === item.section) {
      last.data.push(item);
    } else {
      sections.push({ title: item.section, data: [item] });
    }
  }

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <SheetModal
      visible={visible}
      onClose={close}
      backgroundColor={colors.background}
    >
      <ModalHeader
        title={title}
        right={
          <HeaderButton
            kind="confirm"
            label={t("done")}
            testID="quick-check-in-picker-done"
            onPress={close}
          />
        }
      />
      <View style={{ paddingHorizontal: INSET, paddingBottom: 8 }}>
        <SearchInput
          testID="quick-check-in-picker-search"
          value={query}
          onChange={setQuery}
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        renderSectionHeader={({ section }) => (
          <Label
            size={14}
            strong
            accessibilityRole="header"
            style={{
              paddingHorizontal: IS_IOS ? INSET * 2 : INSET,
              paddingTop: 20,
              paddingBottom: 8,
              color: IS_IOS ? colors.textSecondary : colors.tint,
            }}
          >
            {section.title}
          </Label>
        )}
        renderItem={({ item, index, section }) => (
          <PickerRow
            item={item}
            isSelected={selected.has(item.key)}
            isFirst={index === 0}
            isLast={index === section.data.length - 1}
            onToggle={onToggle}
          />
        )}
      />
    </SheetModal>
  );
};
