import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { SupportCard } from "@/components/SupportCard";
import {
  lastMonthItems,
  sampleBasicEmotions,
  sampleItem,
  sampleItems,
  sampleQuestion,
  sampleTags,
} from "@/dev/designGuide/sampleData";
import type { CatalogGroup } from "@/dev/designGuide/types";
import CalendarHeader from "@/features/calendar/screens/Calendar/CalendarHeader";
import CalendarMonth from "@/features/calendar/screens/Calendar/CalendarMonth";
import CalendarWeek from "@/features/calendar/screens/Calendar/CalendarWeek";
import { getGeometry } from "@/features/calendar/screens/Calendar/layout";
import { PromoCards } from "@/features/calendar/screens/Calendar/PromoCards";
import { RatingSection } from "@/features/calendar/screens/Calendar/CalendarBottomSheet/RatingSection";
import { ResultsSection } from "@/features/calendar/screens/Calendar/CalendarBottomSheet/ResultsSection";
import { TagsSection } from "@/features/calendar/screens/Calendar/CalendarBottomSheet/TagsSection";
import { Entry } from "@/features/calendar/screens/LogList/Entry";
import { Header as DayHeader } from "@/features/calendar/screens/LogList/Header";
import { SectionHeader } from "@/features/calendar/screens/LogList/SectionHeader";
import { TemporaryLogProvider } from "@/features/logger";
import { useTemporaryLog } from "@/features/logger/temporaryLog";
import type { TemporaryLogState } from "@/features/logger/temporaryLog";
import { Confirmation } from "@/features/logger/confirmation/Confirmation";
import { LoggerHeader } from "@/features/logger/components/LoggerHeader";
import { SlideAction } from "@/features/logger/components/SlideAction";
import { EmotionBasicSelection } from "@/features/logger/slides/SlideEmotions/EmotionBasicSelection";
import { EmotionPage } from "@/features/logger/slides/SlideEmotions/EmotionPage";
import { SlideFeedback } from "@/features/logger/slides/SlideFeedback";
import { SlideMessage } from "@/features/logger/slides/SlideMessage";
import { SlideMood } from "@/features/logger/slides/SlideMood";
import { SlideReminder } from "@/features/logger/slides/SlideReminder";
import { SlideTags } from "@/features/logger/slides/SlideTags";
import type { LogItem } from "@/features/logs";
import Reminder from "@/features/notifications/components/Reminder";
import { ExplainerSlide } from "@/features/onboarding/screens/Onboarding/ExplainerSlide";
import { HeaderNavigation } from "@/features/onboarding/screens/Onboarding/HeaderNavigation";
import { IndexSlide } from "@/features/onboarding/screens/Onboarding/IndexSlide";
import { ReminderSlide } from "@/features/onboarding/screens/Onboarding/ReminderSlide";
import { Scale as ColorScale } from "@/features/settings/screens/Colors/Scale";
import { BigCard } from "@/features/statistics/components/BigCard";
import { EmotionsDistribution } from "@/features/statistics/components/EmotionsDistribution";
import { MoodCounts } from "@/features/statistics/components/MoodCounts";
import { TagDistribution } from "@/features/statistics/components/TagDistribution";
import { getEmotionsDistributionData } from "@/features/statistics/EmotionsDistributuon";
import { getMoodAvgData } from "@/features/statistics/MoodAvg";
import {
  getMoodPeaksNegativeData,
  getMoodPeaksPositiveData,
} from "@/features/statistics/MoodPeaks";
import { getTagsDistributionData } from "@/features/statistics/TagsDistribution";
import { getTagsPeaksData } from "@/features/statistics/TagsPeaks";
import { EmotionsDistributionCard } from "@/features/statistics/screens/Statistics/EmotionsDistributionCard";
import { HeaderWeek } from "@/features/statistics/screens/Statistics/HeaderWeek";
import { HighlightsSection } from "@/features/statistics/screens/Statistics/HighlightsSection";
import { MoodAvgCard } from "@/features/statistics/screens/Statistics/MoodAvgCard";
import { MoodChart } from "@/features/statistics/screens/Statistics/MoodChart";
import { MoodPeaksCard } from "@/features/statistics/screens/Statistics/MoodPeaksCards";
import { SleepQualityChartCard } from "@/features/statistics/screens/Statistics/SleepQualityGraph";
import { TagPeaksCard } from "@/features/statistics/screens/Statistics/TagPeaksCards";
import { TagsDistributionCard } from "@/features/statistics/screens/Statistics/TagsDistributionCard";
import { Header as MonthHeader } from "@/features/statistics/screens/StatisticsMonth/Header";
import { MoodChart as MonthMoodChart } from "@/features/statistics/screens/StatisticsMonth/MoodChart";
import { MoodPeaks as MonthMoodPeaks } from "@/features/statistics/screens/StatisticsMonth/MoodPeaks";
import { Navigation as MonthNavigation } from "@/features/statistics/screens/StatisticsMonth/Navigation";
import { Stats as MonthStats } from "@/features/statistics/screens/StatisticsMonth/Stats";
import { BestMonth } from "@/features/statistics/screens/StatisticsYear/BestMonth";
import { Header as YearHeader } from "@/features/statistics/screens/StatisticsYear/Header";
import { MoodChart as YearMoodChart } from "@/features/statistics/screens/StatisticsYear/MoodChart";
import { WorstMonth } from "@/features/statistics/screens/StatisticsYear/WorstMonth";
import YearInPixels from "@/features/statistics/screens/StatisticsYear/YearInPixels";
import { TagList } from "@/features/tags/components/TagList";
import { TagListItem } from "@/features/tags/components/TagListItem";
import { MyTabBar } from "@/shell/MyTabBar";

// Catalog previews ignore presses.
const noop = () => null;

const STORE_NOTE =
  "Reads app data from the stores. Use “Load sample data” at the top to fill it.";

const today = dayjs();
const thisMonth = today.startOf("month");
const monthItems = sampleItems.filter((item) =>
  dayjs(item.date).isSame(thisMonth, "month")
);
const prevMonthItems = sampleItems.filter((item) =>
  dayjs(item.date).isSame(thisMonth.subtract(1, "month"), "month")
);
const weekStart = today.subtract(6, "day").format("YYYY-MM-DD");

const itemMap: Record<string, LogItem[]> = {};
for (const item of sampleItems) {
  itemMap[item.date] = [...(itemMap[item.date] ?? []), item];
}

const geometry = getGeometry({ width: 390, fontScale: 1, isAndroid: false });

const emptyDraft: TemporaryLogState = {
  ...sampleItem,
  rating: null,
  sleep: { quality: null },
};

const DraftInitializer = ({
  draft,
  children,
}: {
  draft: TemporaryLogState;
  children: React.ReactNode;
}) => {
  const tempLog = useTemporaryLog();
  const { initialize } = tempLog;
  useEffect(() => {
    initialize(draft);
  }, [draft, initialize]);
  return tempLog.isInitialized ? children : null;
};

// Isolated draft, so previews never touch the app's real logger draft.
const DraftFrame = ({
  draft = emptyDraft,
  height,
  children,
}: {
  draft?: TemporaryLogState;
  height: number;
  children: React.ReactNode;
}) => (
  <TemporaryLogProvider>
    <DraftInitializer draft={draft}>
      <View style={{ height }}>{children}</View>
    </DraftInitializer>
  </TemporaryLogProvider>
);

const LoggerHeaderDemo = () => {
  const carouselRef = useRef(null);
  const [index, setIndex] = useState(1);
  const tempLog = useTemporaryLog();
  return (
    <LoggerHeader
      carouselRef={carouselRef}
      slideCount={4}
      slideIndex={index}
      setSlideIndex={setIndex}
      isEditing={false}
      tempLog={tempLog}
      onCancel={noop}
      onRemove={noop}
    />
  );
};

const RatingFilterDemo = () => {
  const [value, setValue] = useState<LogItem["rating"][]>(["good"]);
  return (
    <RatingSection
      value={value}
      onChange={(rating) =>
        setValue((current) =>
          current.includes(rating)
            ? current.filter((d) => d !== rating)
            : [...current, rating]
        )
      }
    />
  );
};

const TagsFilterDemo = () => {
  const [selected, setSelected] = useState(() => sampleTags.slice(0, 1));
  return (
    <TagsSection
      tags={sampleTags}
      selectedTags={selected}
      onSelect={(tag) =>
        setSelected((current) =>
          current.some((d) => d.id === tag.id)
            ? current.filter((d) => d.id !== tag.id)
            : [...current, tag]
        )
      }
    />
  );
};

const TabBarDemo = () => {
  const [index, setIndex] = useState(1);
  const routes = ["statistics", "calendar", "settings"].map((name) => ({
    key: name,
    name,
  }));
  const descriptors = Object.fromEntries(
    routes.map((route) => [route.key, { options: {} }])
  );
  const navigation = {
    emit: () => ({ defaultPrevented: false }),
    navigate: ({ name }: { name: string }) =>
      setIndex(routes.findIndex((route) => route.name === name)),
  };
  return (
    <MyTabBar
      state={{ index, routes }}
      descriptors={descriptors}
      navigation={navigation}
    />
  );
};

const [firstTag] = sampleTags;
const [tagPeak] = getTagsPeaksData(sampleItems, sampleTags).tags;

/** Compositions of components, grouped like shadcn/ui blocks. */
export const BLOCK_GROUPS: CatalogGroup[] = [
  {
    id: "block-logger",
    title: "Logger",
    entries: [
      {
        name: "Logger header",
        source: "features/logger/components/LoggerHeader.tsx",
        frame: "phone",
        render: () => (
          <DraftFrame height={80}>
            <LoggerHeaderDemo />
          </DraftFrame>
        ),
      },
      {
        name: "Mood slide",
        source: "features/logger/slides/SlideMood.tsx",
        frame: "phone",
        render: () => (
          <DraftFrame height={720}>
            <SlideMood onChange={noop} />
          </DraftFrame>
        ),
      },
      {
        name: "Emotion grid",
        source:
          "features/logger/slides/SlideEmotions/EmotionBasicSelection.tsx",
        frame: "phone",
        render: () => (
          <EmotionBasicSelection
            emotions={sampleBasicEmotions}
            selectedEmotions={sampleBasicEmotions.slice(0, 2)}
            onPress={noop}
          />
        ),
      },
      {
        name: "Emotion page",
        source: "features/logger/slides/SlideEmotions/EmotionPage.tsx",
        frame: "phone",
        render: () => (
          <EmotionPage
            emotions={sampleBasicEmotions.slice(0, 7)}
            selectedEmotions={sampleBasicEmotions.slice(0, 1)}
            onPress={noop}
          />
        ),
      },
      {
        name: "Tags slide",
        source: "features/logger/slides/SlideTags.tsx",
        frame: "phone",
        note: STORE_NOTE,
        render: () => (
          <DraftFrame height={560}>
            <SlideTags onChange={noop} showDisable />
          </DraftFrame>
        ),
      },
      {
        name: "Message slide",
        source: "features/logger/slides/SlideMessage.tsx",
        frame: "phone",
        render: () => (
          <DraftFrame height={560}>
            <SlideMessage onChange={noop} onDisableStep={noop} showDisable />
          </DraftFrame>
        ),
      },
      {
        name: "Reminder slide",
        source: "features/logger/slides/SlideReminder.tsx",
        frame: "phone",
        render: () => (
          <DraftFrame height={640}>
            <SlideReminder onPress={noop} />
          </DraftFrame>
        ),
      },
      {
        name: "Feedback slide",
        source: "features/logger/slides/SlideFeedback.tsx",
        frame: "phone",
        render: () => (
          <DraftFrame height={560}>
            <SlideFeedback
              question={sampleQuestion}
              onPress={noop}
              onDisableStep={noop}
            />
          </DraftFrame>
        ),
      },
      {
        name: "Confirmation",
        source: "features/logger/confirmation/Confirmation.tsx",
        frame: "phone",
        note: STORE_NOTE,
        render: () => (
          <View style={{ height: 720 }}>
            <Confirmation item={sampleItem} entriesCount={10} onClose={noop} />
          </View>
        ),
      },
      {
        name: "Slide action",
        source: "features/logger/components/SlideAction.tsx",
        frame: "phone",
        render: () => (
          <View style={{ height: 120 }}>
            <SlideAction type="next" onPress={noop} />
          </View>
        ),
      },
    ],
  },
  {
    id: "block-calendar",
    title: "Calendar",
    entries: [
      {
        name: "Calendar header",
        source: "features/calendar/screens/Calendar/CalendarHeader.tsx",
        frame: "phone",
        render: () => <CalendarHeader />,
      },
      {
        name: "Calendar week",
        source: "features/calendar/screens/Calendar/CalendarWeek.tsx",
        frame: "phone",
        render: () => (
          <View style={{ paddingHorizontal: 16 }}>
            <CalendarWeek
              startDate={weekStart}
              endDate={today.format("YYYY-MM-DD")}
              height={geometry.weekHeight}
              itemMap={itemMap}
            />
          </View>
        ),
      },
      {
        name: "Calendar month",
        source: "features/calendar/screens/Calendar/CalendarMonth.tsx",
        frame: "phone",
        render: () => (
          <View style={{ paddingHorizontal: 16 }}>
            <CalendarMonth
              dateString={thisMonth.format("YYYY-MM-DD")}
              itemMap={itemMap}
              weeks={thisMonth.endOf("month").diff(thisMonth, "week") + 2}
              geometry={geometry}
            />
          </View>
        ),
      },
      {
        name: "Promo cards",
        source: "features/calendar/screens/Calendar/PromoCards.tsx",
        frame: "phone",
        note: "Shows changelog items from the RSS feed. Empty when the feed has none or the fetch fails.",
        render: () => <PromoCards />,
      },
      {
        name: "Filter sheet",
        source: "features/calendar/screens/Calendar/CalendarBottomSheet",
        frame: "phone",
        note: "Rating, tag, and result sections of the filter sheet.",
        render: () => (
          <View style={{ padding: 16 }}>
            <RatingFilterDemo />
            <TagsFilterDemo />
            <ResultsSection count={12} />
          </View>
        ),
      },
    ],
  },
  {
    id: "block-entries",
    title: "Day & entries",
    entries: [
      {
        name: "Day header",
        source: "features/calendar/screens/LogList/Header.tsx",
        frame: "phone",
        render: () => (
          <DayHeader title={today.format("dddd, D MMMM")} onClose={noop} />
        ),
      },
      {
        name: "Section header",
        source: "features/calendar/screens/LogList/SectionHeader.tsx",
        frame: "phone",
        render: () => <SectionHeader title="Emotions" onEdit={noop} />,
      },
      {
        name: "Entry",
        source: "features/calendar/screens/LogList/Entry.tsx",
        frame: "phone",
        note: STORE_NOTE,
        render: () => (
          <View style={{ padding: 16 }}>
            <Entry item={sampleItem} onEdit={noop} onDelete={noop} />
          </View>
        ),
      },
    ],
  },
  {
    id: "block-statistics",
    title: "Statistics",
    entries: [
      {
        name: "Week header",
        source: "features/statistics/screens/Statistics/HeaderWeek.tsx",
        frame: "phone",
        render: () => <HeaderWeek date={weekStart} />,
      },
      {
        name: "Highlights",
        source: "features/statistics/screens/Statistics/HighlightsSection.tsx",
        frame: "phone",
        note: STORE_NOTE,
        render: () => <HighlightsSection items={sampleItems} />,
      },
      {
        name: "Mood average",
        source: "features/statistics/screens/Statistics/MoodAvgCard.tsx",
        frame: "phone",
        render: () => <MoodAvgCard data={getMoodAvgData(lastMonthItems)} />,
      },
      {
        name: "Mood peaks",
        source: "features/statistics/screens/Statistics/MoodPeaksCards.tsx",
        frame: "phone",
        render: () => (
          <View>
            <MoodPeaksCard
              type="positive"
              data={getMoodPeaksPositiveData(lastMonthItems)}
              startDate={lastMonthItems[0]?.date ?? weekStart}
              endDate={today.format("YYYY-MM-DD")}
            />
            <MoodPeaksCard
              type="negative"
              data={getMoodPeaksNegativeData(lastMonthItems)}
              startDate={lastMonthItems[0]?.date ?? weekStart}
              endDate={today.format("YYYY-MM-DD")}
            />
          </View>
        ),
      },
      {
        name: "Tag peaks",
        source: "features/statistics/screens/Statistics/TagPeaksCards.tsx",
        frame: "phone",
        render: () => (tagPeak ? <TagPeaksCard tag={tagPeak} /> : null),
      },
      {
        name: "Tags distribution",
        source:
          "features/statistics/screens/Statistics/TagsDistributionCard.tsx",
        frame: "phone",
        render: () => (
          <TagsDistributionCard
            data={getTagsDistributionData(lastMonthItems, sampleTags)}
          />
        ),
      },
      {
        name: "Emotions distribution",
        source:
          "features/statistics/screens/Statistics/EmotionsDistributionCard.tsx",
        frame: "phone",
        render: () => (
          <EmotionsDistributionCard
            data={getEmotionsDistributionData(sampleItems)}
          />
        ),
      },
      {
        name: "Mood chart",
        source: "features/statistics/screens/Statistics/MoodChart.tsx",
        frame: "phone",
        note: STORE_NOTE,
        render: () => <MoodChart title="Mood chart" startDate={weekStart} />,
      },
      {
        name: "Sleep chart",
        source: "features/statistics/screens/Statistics/SleepQualityGraph.tsx",
        frame: "phone",
        note: STORE_NOTE,
        render: () => (
          <SleepQualityChartCard title="Sleep quality" startDate={weekStart} />
        ),
      },
    ],
  },
  {
    id: "block-reports",
    title: "Month & year reports",
    entries: [
      {
        name: "Big card",
        source: "features/statistics/components/BigCard.tsx",
        frame: "phone",
        render: () => (
          <BigCard
            title="Big card"
            subtitle="Shareable report card"
            analyticsId="design-guide"
            isShareable
          >
            <View style={{ height: 80 }} />
          </BigCard>
        ),
      },
      {
        name: "Mood counts",
        source: "features/statistics/components/MoodCounts/index.tsx",
        frame: "phone",
        render: () => (
          <MoodCounts
            title="Mood counts"
            subtitle="Entries per rating"
            date={thisMonth}
            items={sampleItems}
          />
        ),
      },
      {
        name: "Tag distribution",
        source: "features/statistics/components/TagDistribution.tsx",
        frame: "phone",
        note: STORE_NOTE,
        render: () => (
          <TagDistribution
            title="Tags"
            subtitle="Most used tags"
            items={sampleItems}
          />
        ),
      },
      {
        name: "Emotion distribution",
        source: "features/statistics/components/EmotionsDistribution.tsx",
        frame: "phone",
        render: () => (
          <EmotionsDistribution
            title="Emotions"
            subtitle="Most felt emotions"
            items={sampleItems}
          />
        ),
      },
      {
        name: "Month header",
        source: "features/statistics/screens/StatisticsMonth/Header.tsx",
        frame: "phone",
        render: () => (
          <MonthHeader
            title={thisMonth.format("MMMM")}
            subtitle={thisMonth.format("YYYY")}
            gradientColors={["#a7f3d0", "#bfdbfe", "#fbcfe8"]}
          />
        ),
      },
      {
        name: "Month navigation",
        source: "features/statistics/screens/StatisticsMonth/Navigation.tsx",
        frame: "phone",
        render: () => (
          <MonthNavigation
            nextMonth={thisMonth.add(1, "month")}
            prevMonth={thisMonth.subtract(1, "month")}
            onNext={noop}
            onPrev={noop}
            nextMonthDisabled
            prevMonthDisabled={false}
          />
        ),
      },
      {
        name: "Month stats",
        source: "features/statistics/screens/StatisticsMonth/Stats.tsx",
        frame: "phone",
        render: () => (
          <MonthStats
            date={thisMonth}
            items={monthItems}
            prevItems={prevMonthItems}
          />
        ),
      },
      {
        name: "Month mood chart",
        source: "features/statistics/screens/StatisticsMonth/MoodChart.tsx",
        frame: "phone",
        render: () => <MonthMoodChart date={thisMonth} items={monthItems} />,
      },
      {
        name: "Month mood peaks",
        source: "features/statistics/screens/StatisticsMonth/MoodPeaks.tsx",
        frame: "phone",
        render: () => <MonthMoodPeaks date={thisMonth} items={monthItems} />,
      },
      {
        name: "Year header",
        source: "features/statistics/screens/StatisticsYear/Header.tsx",
        frame: "phone",
        render: () => (
          <YearHeader
            title={today.format("YYYY")}
            subtitle="Year in review"
            gradientColors={["#fde68a", "#fca5a5", "#c4b5fd"]}
          />
        ),
      },
      {
        name: "Year in pixels",
        source:
          "features/statistics/screens/StatisticsYear/YearInPixels/index.tsx",
        frame: "phone",
        note: STORE_NOTE,
        render: () => <YearInPixels date={today.startOf("year")} />,
      },
      {
        name: "Year mood chart",
        source: "features/statistics/screens/StatisticsYear/MoodChart.tsx",
        frame: "phone",
        note: STORE_NOTE,
        render: () => <YearMoodChart date={today.startOf("year")} />,
      },
      {
        name: "Best & worst month",
        source: "features/statistics/screens/StatisticsYear/BestMonth.tsx",
        frame: "phone",
        note: STORE_NOTE,
        render: () => (
          <View>
            <BestMonth date={today.startOf("year")} />
            <WorstMonth date={today.startOf("year")} />
          </View>
        ),
      },
    ],
  },
  {
    id: "block-tags",
    title: "Tags",
    entries: [
      {
        name: "Tag list item",
        source: "features/tags/components/TagListItem.tsx",
        frame: "phone",
        render: () =>
          firstTag ? (
            <TagListItem tag={firstTag} isLast onPress={noop} />
          ) : null,
      },
      {
        name: "Tag list",
        source: "features/tags/components/TagList.tsx",
        frame: "phone",
        render: () => <TagList tags={sampleTags} />,
      },
    ],
  },
  {
    id: "block-settings",
    title: "Settings",
    entries: [
      {
        name: "Scale picker row",
        source: "features/settings/screens/Colors/Scale.tsx",
        frame: "phone",
        render: () => (
          <View style={{ padding: 16 }}>
            <ColorScale type="ColorBrew-RdYlGn" />
          </View>
        ),
      },
      {
        name: "Reminder",
        source: "features/notifications/components/Reminder.tsx",
        frame: "phone",
        render: () => (
          <View style={{ padding: 16 }}>
            <Reminder />
          </View>
        ),
      },
      {
        name: "Support card",
        source: "components/SupportCard.tsx",
        frame: "phone",
        note: "Hidden when no support client is configured.",
        render: () => (
          <View style={{ padding: 16 }}>
            <SupportCard />
          </View>
        ),
      },
    ],
  },
  {
    id: "block-onboarding",
    title: "Onboarding",
    entries: [
      {
        name: "Welcome slide",
        source: "features/onboarding/screens/Onboarding/IndexSlide.tsx",
        frame: "phone",
        render: () => (
          <View style={{ height: 780 }}>
            <IndexSlide onPress={noop} />
          </View>
        ),
      },
      {
        name: "Header navigation",
        source: "features/onboarding/screens/Onboarding/HeaderNavigation.tsx",
        frame: "phone",
        render: () => (
          <HeaderNavigation index={1} setIndex={noop} onSkip={noop} />
        ),
      },
      {
        name: "Explainer slide",
        source: "features/onboarding/screens/Onboarding/ExplainerSlide.tsx",
        frame: "phone",
        render: () => (
          <View style={{ height: 780 }}>
            <ExplainerSlide index={1} setIndex={noop} onSkip={noop} />
          </View>
        ),
      },
      {
        name: "Reminder slide",
        source: "features/onboarding/screens/Onboarding/ReminderSlide.tsx",
        frame: "phone",
        render: () => (
          <View style={{ height: 780 }}>
            <ReminderSlide index={4} setIndex={noop} onSkip={noop} />
          </View>
        ),
      },
    ],
  },
  {
    id: "block-shell",
    title: "App shell",
    entries: [
      {
        name: "Tab bar",
        source: "shell/MyTabBar.tsx",
        frame: "phone",
        render: () => <TabBarDemo />,
      },
    ],
  },
];
