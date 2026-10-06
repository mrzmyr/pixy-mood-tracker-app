import { useLocalSearchParams, useRouter } from "expo-router";
import Button from "@/components/Button";
import { PageModalLayout } from "@/components/PageModalLayout";
import { isConfirmed } from "@/helpers/promptCancel";
import { askToRemove } from "@/helpers/prompts";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import { useLogState, useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";

import { getDayDateTitle } from "@/lib/utils";
import dayjs from "dayjs";
import { useRef, useState } from "react";
import { Dimensions, View } from "react-native";
import { Carousel } from "react-native-reanimated-carousel";
import type { CarouselRef } from "react-native-reanimated-carousel";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Entry } from "./Entry";
import { Header } from "./Header";
import { getItemDate, getItemTime } from "@/lib/logDates";

const WINDOW_WIDTH = Dimensions.get("window").width;

/**
 * Day entry list modal, opened from a calendar day.
 *
 * `date` is a local `YYYY-MM-DD` day; entries are matched by `dateTime` and
 * shown oldest first. New entries from here use the current time on that
 * day.
 *
 * The carousel gets the measured page area height. Without it, carousel
 * pages keep their first measured height. iOS modals first lay out at full
 * window height, so pages stay too tall and the button hides the end of
 * each entry.
 */
export const LogList = () => {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
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

  const _carouselRef = useRef<CarouselRef>(null);
  const pages = items.map((item) => (
    <Entry key={item.id} item={item} onEdit={edit} onDelete={_delete} />
  ));

  const PAGE_WIDTH = WINDOW_WIDTH * 0.9;
  const [pagesHeight, setPagesHeight] = useState<number>();

  return (
    <PageModalLayout
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
        paddingBottom: insets.bottom,
      }}
    >
      <Header title={getDayDateTitle(date)} onClose={close} />
      <View
        testID="log-list-pages"
        style={{
          flex: 1,
        }}
        onLayout={(event) => setPagesHeight(event.nativeEvent.layout.height)}
      >
        <Carousel
          testID="log-list-carousel"
          loop={false}
          ref={_carouselRef}
          data={pages}
          key={pages.length}
          defaultIndex={0}
          renderItem={({ index }) => (
            <View style={{ flex: 1, marginLeft: "2.5%" }}>{pages[index]}</View>
          )}
          onConfigurePanGesture={(gesture) => gesture.activeOffsetX([-10, 10])}
          itemSize={PAGE_WIDTH}
          style={{
            flex: 1,
            height: pagesHeight,
            marginLeft: "2.5%",
            width: "100%",
          }}
        />
      </View>
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 16,
        }}
      >
        <Button
          type="primary"
          style={{
            marginTop: 12,
          }}
          onPress={add}
        >
          {t("add_entry")}
        </Button>
      </View>
    </PageModalLayout>
  );
};
