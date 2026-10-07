import { useLocalSearchParams, useRouter } from "expo-router";
import { FloatButton } from "@/components/FloatButton";
import { PageModalLayout } from "@/components/PageModalLayout";
import { FLOAT_BUTTON_SIZE } from "@/constants/FloatButton";
import { isConfirmed } from "@/helpers/promptCancel";
import { askToRemove } from "@/helpers/prompts";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import { useLogState, useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";

import { getDayDateTitle } from "@/lib/utils";
import dayjs from "dayjs";
import { useEffect, useEffectEvent, useRef } from "react";
import { FlatList, View } from "react-native";
import { Plus } from "react-native-feather";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Entry } from "./Entry";
import { Header } from "./Header";
import { INSET } from "./layout";
import { getItemDate, getItemTime } from "@/lib/logDates";

// Same spot as the calendar float button: 20 from the right and from the
// bottom safe area.
const FAB_MARGIN = 20;
// Space between the last card and the float button.
const FAB_CLEARANCE = 16;
// Space between two cards.
const CARD_GAP = 12;

const keyExtractor = (item: LogItem) => item.id;
const CardGap = () => <View style={{ height: CARD_GAP }} />;

/**
 * Day entry list modal, opened from a calendar day.
 *
 * `date` is a local `YYYY-MM-DD` day; entries are matched by `dateTime` and
 * shown oldest first as full-width cards in one vertical list. Chip and
 * photo rows inside a card scroll sideways; they have no parent that
 * scrolls the same way, so the swipe stays with the row.
 *
 * The optional `entry` param is an entry id: the list opens scrolled to it.
 * A new entry added from here is scrolled into view when the logger closes.
 * The list is a `FlatList`, not a `FlashList`: the modal sits under the
 * photo viewer and logger, and a frozen screen leaves `FlashList` headers
 * stale; `FlatList` keeps variable card heights without recycling. New
 * entries from here use the current time on that day.
 *
 * Add is a float button at the bottom right, like on the calendar. The
 * list ends with padding, so the last card scrolls clear of it and of the
 * bottom safe area.
 */
export const LogList = () => {
  const router = useRouter();
  const { date, entry } = useLocalSearchParams<{
    date: string;
    entry?: string;
  }>();
  const colors = useColors();
  const logState = useLogState();
  const analytics = useAnalytics();
  const insets = useSafeAreaInsets();
  const logUpdater = useLogUpdater();

  const items = logState.items
    .filter((item) => getItemDate(item) === date)
    .sort((a, b) => (getItemTime(a) < getItemTime(b) ? -1 : 1));

  const close = () => {
    analytics.track("day:closed");
    router.back();
  };

  const add = () => {
    analytics.track("day:add_tapped");
    router.push({
      pathname: "/logs/create/[dateTime]",
      params: {
        dateTime: dayjs(date)
          .hour(dayjs().hour())
          .minute(dayjs().minute())
          .toISOString(),
      },
    });
  };

  const edit = (item: LogItem) => {
    analytics.track("day:edit_tapped");
    router.push({ pathname: "/logs/[id]/edit", params: { id: item.id } });
  };

  const remove = (item: LogItem) => {
    analytics.track("day:delete_tapped");
    logUpdater.deleteLog(item.id);
    logUpdater.sweepPhotos();
    // navigation.goBack();
  };

  const _delete = async (item: LogItem) => {
    if (await isConfirmed(askToRemove())) {
      remove(item);
    }
  };

  const listRef = useRef<FlatList<LogItem>>(null);
  const knownIds = useRef<Set<string> | null>(null);

  const scrollToEntry = useEffectEvent((id: string, animated: boolean) => {
    const index = items.findIndex((item) => item.id === id);
    if (index !== -1) {
      listRef.current?.scrollToIndex({ index, animated, viewPosition: 0 });
    }
  });

  // Open at the requested entry. Later edits do not pull the list back.
  useEffect(() => {
    if (entry) {
      scrollToEntry(entry, false);
    }
  }, [entry]);

  // Show an entry added while the list is open.
  useEffect(() => {
    const known = knownIds.current;
    knownIds.current = new Set(items.map((item) => item.id));
    const added =
      known && known.size > 0 && items.find((item) => !known.has(item.id));
    if (added) {
      scrollToEntry(added.id, true);
    }
  }, [items]);

  return (
    <PageModalLayout
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
      }}
    >
      <Header title={getDayDateTitle(date)} onClose={close} />
      <FlatList
        ref={listRef}
        testID="log-list"
        data={items}
        keyExtractor={keyExtractor}
        renderItem={({ item, index }) => (
          <Entry
            item={item}
            onEdit={edit}
            onDelete={_delete}
            position={{ index, count: items.length }}
          />
        )}
        ItemSeparatorComponent={CardGap}
        initialNumToRender={4}
        windowSize={5}
        // Cards have no fixed height: jump near the target, then retry once
        // the cards on the way are measured.
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          listRef.current?.scrollToOffset({
            offset: averageItemLength * index,
            animated: false,
          });
          setTimeout(
            () => listRef.current?.scrollToIndex({ index, animated: false }),
            100
          );
        }}
        contentContainerStyle={{
          paddingHorizontal: INSET,
          paddingTop: 4,
          paddingBottom:
            insets.bottom + FAB_MARGIN + FLOAT_BUTTON_SIZE + FAB_CLEARANCE,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: FAB_MARGIN,
          bottom: FAB_MARGIN + insets.bottom,
        }}
      >
        <FloatButton
          testID="log-list-add"
          accessibilityLabel={t("add_entry")}
          onPress={add}
        >
          <Plus
            color={colors.primaryButtonText}
            width={24}
            height={24}
            strokeWidth={2.5}
          />
        </FloatButton>
      </View>
    </PageModalLayout>
  );
};
