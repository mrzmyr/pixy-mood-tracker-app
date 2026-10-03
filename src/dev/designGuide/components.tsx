import dayjs from "dayjs";
import { useState } from "react";
import { Text, View } from "react-native";
import { ChevronRight, Plus, Star } from "react-native-feather";

import Button from "@/components/Button";
import { FloatButton } from "@/components/FloatButton";
import Indicator from "@/components/Indicator";
import LinkButton from "@/components/LinkButton";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import { MiniButton } from "@/components/MiniButton";
import ModalHeader from "@/components/ModalHeader";
import { PromoCard } from "@/components/PromoCard";
import Scale from "@/components/Scale";
import ScaleButton from "@/components/ScaleButton";
import TextArea from "@/components/TextArea";
import TextHeadline from "@/components/TextHeadline";
import TextInfo from "@/components/TextInfo";
import { RATING_KEYS } from "@/constants/Ratings";
import { TAG_COLOR_NAMES } from "@/constants/Config";
import { Caption, Row, Swatch } from "@/dev/designGuide/Preview";
import {
  lastMonthItems,
  sampleBasicEmotions,
  sampleItem,
  sampleItems,
} from "@/dev/designGuide/sampleData";
import type { CatalogGroup } from "@/dev/designGuide/types";
import { EmotionItem } from "@/features/calendar/screens/LogList/EmotionItem";
import { RatingDot } from "@/features/calendar/screens/LogList/RatingDot";
import CalendarDay from "@/features/calendar/screens/Calendar/CalendarDay";
import { ScrollToBottomButton } from "@/features/calendar/screens/Calendar/ScrollToBottomButton";
import { SearchInputSection } from "@/features/calendar/screens/Calendar/CalendarBottomSheet/SearchInputSection";
import { Stepper } from "@/features/logger/components/Stepper";
import { SlideHeadline } from "@/features/logger/components/SlideHeadline";
import { SlideMoodButton } from "@/features/logger/components/SlideMoodButton";
import { Footer } from "@/features/logger/slides/Footer";
import { SlideSleepButton } from "@/features/logger/slides/SlideSleepButton";
import {
  EmotionButtonAdvanced,
  EmotionButtonEmpty,
} from "@/features/logger/slides/SlideEmotions/EmotionButtonAdvanced";
import { EmotionButtonBasic } from "@/features/logger/slides/SlideEmotions/EmotionButtonBasic";
import { EmotionIndicator } from "@/features/logger/slides/SlideEmotions/EmotionsIndicator";
import { ExpandButton } from "@/features/logger/slides/SlideEmotions/ExpandButton";
import { Tooltip } from "@/features/logger/slides/SlideEmotions/Tooltip";
import Clock from "@/features/notifications/components/Clock";
import NotificationPreview from "@/features/notifications/components/NotificationPreview";
import { HeaderPagination } from "@/features/onboarding/screens/Onboarding/HeaderPagination";
import { ColorDot } from "@/features/settings/screens/Colors/ColorDot";
import { Radio } from "@/features/settings/screens/Colors/Radio";
import { Bar } from "@/features/statistics/components/MoodCounts/Bar";
import { Card } from "@/features/statistics/components/Card";
import { NotEnoughDataOverlay } from "@/features/statistics/components/NotEnoughDataOverlay";
import { RatingChart } from "@/features/statistics/components/RatingChart";
import { SleepQualityChart } from "@/features/statistics/components/SleepQualityChart";
import { ConfirmationHero } from "@/features/logger/confirmation/ConfirmationHero";
import { getWeekPixels } from "@/features/logger/confirmation/weekPixels";
import { getItemDate } from "@/lib/logDates";
import { getRatingDistributionForXDays } from "@/features/statistics/RatingDistribution";
import { getSleepQualityDistributionForXDays } from "@/features/statistics/SleepQualityDistribution";
import { EmptyPlaceholder } from "@/features/statistics/screens/Statistics/EmptyPlaceholder";
import { Subtitle } from "@/features/statistics/screens/Statistics/Subtitle";
import { Title } from "@/features/statistics/screens/Statistics/Title";
import { StatsCard } from "@/features/statistics/screens/StatisticsMonth/StatsCard";
import { Day as YearDay } from "@/features/statistics/screens/StatisticsYear/YearInPixels/Day";
import TagComponent from "@/features/tags/components/Tag";
import { BackButton } from "@/shell/BackButton";
import useColors from "@/hooks/useColors";

// Catalog previews ignore presses.
const noop = () => null;

const CHART_START = dayjs().subtract(14, "day").format("YYYY-MM-DD");
const ratingChartData = getRatingDistributionForXDays(
  lastMonthItems,
  CHART_START,
  14
);
const sleepChartData = getSleepQualityDistributionForXDays(
  lastMonthItems,
  CHART_START,
  14
);

const ColorTokens = () => {
  const colors = useColors();
  const tokens = Object.entries(colors).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  );
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {tokens.map(([name, value]) => (
        <Swatch key={name} name={name} value={value} />
      ))}
    </View>
  );
};

const AllScales = () => {
  const colors = useColors();
  // SAFETY: Scale only reads rating keys, which every theme scale defines.
  const scaleTypes = Object.keys(colors.scales) as React.ComponentProps<
    typeof Scale
  >["type"][];
  return (
    <View
      style={{ gap: 16, maxWidth: 420, width: "100%", alignSelf: "center" }}
    >
      {scaleTypes.map((type) => (
        <View key={type}>
          <Caption>{type}</Caption>
          <Scale type={type} value="good" onPress={noop} />
        </View>
      ))}
    </View>
  );
};

const StepperDemo = () => {
  const [index, setIndex] = useState(1);
  return (
    <View style={{ maxWidth: 360, width: "100%", alignSelf: "center" }}>
      <Stepper
        count={5}
        index={index}
        scrollTo={({ index: next }) => setIndex(next)}
      />
    </View>
  );
};

const TagDemo = () => {
  const [selected, setSelected] = useState(true);
  return (
    <Row>
      <TagComponent
        title="Selected"
        colorName="blue"
        selected={selected}
        onPress={() => setSelected(!selected)}
      />
      <TagComponent title="Unselected" colorName="green" onPress={noop} />
    </Row>
  );
};

const FloatButtonDemo = () => {
  const colors = useColors();
  return (
    <Row>
      <FloatButton onPress={noop}>
        <Plus color={colors.primaryButtonText} />
      </FloatButton>
      <FloatButton disabled onPress={noop}>
        <Plus color={colors.primaryButtonText} />
      </FloatButton>
    </Row>
  );
};

const ScaleButtonDemo = () => (
  <Row>
    <View style={{ width: 48 }}>
      <ScaleButton
        backgroundColor="#34d399"
        textColor="#064e3b"
        onPress={noop}
      />
    </View>
    <View style={{ width: 48 }}>
      <ScaleButton
        backgroundColor="#34d399"
        textColor="#064e3b"
        isSelected
        onPress={noop}
      />
    </View>
  </Row>
);

const SearchInputDemo = () => {
  const [value, setValue] = useState("");
  return (
    <View style={{ maxWidth: 420, width: "100%", alignSelf: "center" }}>
      <SearchInputSection value={value} onChange={setValue} />
    </View>
  );
};

const MenuListDemo = () => {
  const colors = useColors();
  return (
    <View style={{ maxWidth: 420, width: "100%", alignSelf: "center" }}>
      <MenuList>
        <MenuListItem
          title="With link"
          isLink
          iconRight={<ChevronRight color={colors.textSecondary} />}
          onPress={noop}
        />
        <MenuListItem title="Deactivated" deactivated />
        <MenuListItem title="Last item" isLast onPress={noop} />
      </MenuList>
    </View>
  );
};

/** Single-purpose building blocks, grouped like shadcn/ui components. */
export const COMPONENT_GROUPS: CatalogGroup[] = [
  {
    id: "foundations",
    title: "Foundations",
    entries: [
      {
        name: "Color tokens",
        source: "constants/Colors/index.ts",
        note: "Every string token in the active theme.",
        frame: "fluid",
        render: () => <ColorTokens />,
      },
      {
        name: "Mood scales",
        source: "constants/Colors/Scales.ts",
        render: () => <AllScales />,
      },
      {
        name: "Tag colors",
        source: "constants/Config.ts",
        render: () => (
          <Row>
            {TAG_COLOR_NAMES.map((name) => (
              <Indicator key={name} colorName={name}>
                {name}
              </Indicator>
            ))}
          </Row>
        ),
      },
    ],
  },
  {
    id: "typography",
    title: "Typography",
    entries: [
      {
        name: "TextHeadline",
        source: "components/TextHeadline.tsx",
        render: () => <TextHeadline>Text headline</TextHeadline>,
      },
      {
        name: "TextInfo",
        source: "components/TextInfo.tsx",
        render: () => <TextInfo>Secondary helper text under a list.</TextInfo>,
      },
      {
        name: "MenuListHeadline",
        source: "components/MenuListHeadline.tsx",
        render: () => (
          <MenuListHeadline style={{ marginTop: 0 }}>Section</MenuListHeadline>
        ),
      },
      {
        name: "SlideHeadline",
        source: "features/logger/components/SlideHeadline.tsx",
        render: () => <SlideHeadline>How are you feeling?</SlideHeadline>,
      },
      {
        name: "Title / Subtitle",
        source: "features/statistics/screens/Statistics/Title.tsx",
        render: () => (
          <View>
            <Title>Statistics title</Title>
            <Subtitle>Statistics subtitle</Subtitle>
          </View>
        ),
      },
    ],
  },
  {
    id: "buttons",
    title: "Buttons",
    entries: [
      {
        name: "Button",
        source: "components/Button.tsx",
        render: () => (
          <View
            style={{
              gap: 12,
              maxWidth: 360,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <Button onPress={noop}>Primary</Button>
            <Button type="secondary" onPress={noop}>
              Secondary
            </Button>
            <Button type="tertiary" onPress={noop}>
              Tertiary
            </Button>
            <Button type="danger" onPress={noop}>
              Danger
            </Button>
            <Button disabled onPress={noop}>
              Disabled
            </Button>
          </View>
        ),
      },
      {
        name: "MiniButton",
        source: "components/MiniButton.tsx",
        render: () => (
          <Row>
            <MiniButton onPress={noop}>Mini button</MiniButton>
          </Row>
        ),
      },
      {
        name: "LinkButton",
        source: "components/LinkButton.tsx",
        render: () => (
          <Row>
            <LinkButton onPress={noop}>Primary</LinkButton>
            <LinkButton type="secondary" icon={Star} onPress={noop}>
              Secondary with icon
            </LinkButton>
            <LinkButton disabled onPress={noop}>
              Disabled
            </LinkButton>
          </Row>
        ),
      },
      {
        name: "FloatButton",
        source: "components/FloatButton.tsx",
        render: () => <FloatButtonDemo />,
      },
      {
        name: "ScrollToBottomButton",
        source: "features/calendar/screens/Calendar/ScrollToBottomButton.tsx",
        render: () => (
          <View style={{ height: 64 }}>
            <ScrollToBottomButton onPress={noop} />
          </View>
        ),
      },
      {
        name: "ExpandButton",
        source: "features/logger/slides/SlideEmotions/ExpandButton.tsx",
        render: () => (
          <Row>
            <ExpandButton expanded={false} onPress={noop} />
            <ExpandButton expanded onPress={noop} />
          </Row>
        ),
      },
      {
        name: "BackButton",
        source: "shell/BackButton.tsx",
        render: () => <BackButton />,
      },
    ],
  },
  {
    id: "rating",
    title: "Rating",
    entries: [
      {
        name: "ScaleButton",
        source: "components/ScaleButton.tsx",
        render: () => <ScaleButtonDemo />,
      },
      {
        name: "SlideMoodButton",
        source: "features/logger/components/SlideMoodButton.tsx",
        render: () => (
          <View style={{ gap: 8 }}>
            {[...RATING_KEYS].reverse().map((rating) => (
              <SlideMoodButton
                key={rating}
                rating={rating}
                selected={rating === "good"}
                onPress={noop}
              />
            ))}
          </View>
        ),
      },
      {
        name: "SlideSleepButton",
        source: "features/logger/slides/SlideSleepButton.tsx",
        render: () => (
          <View
            style={{
              gap: 8,
              maxWidth: 360,
              width: "100%",
              alignSelf: "center",
            }}
          >
            {(["very_bad", "neutral", "very_good"] as const).map((value) => (
              <SlideSleepButton key={value} value={value} />
            ))}
          </View>
        ),
      },
      {
        name: "RatingDot",
        source: "features/calendar/screens/LogList/RatingDot.tsx",
        render: () => (
          <Row>
            {RATING_KEYS.map((rating) => (
              <RatingDot key={rating} rating={rating} />
            ))}
          </Row>
        ),
      },
      {
        name: "CalendarDay",
        source: "features/calendar/screens/Calendar/CalendarDay/index.tsx",
        note: "Empty, rated, filtered out, and today.",
        render: () => (
          <Row>
            <View style={{ width: 48 }}>
              <CalendarDay
                dateString="2026-09-01"
                isFiltered={false}
                isFiltering={false}
                onPress={noop}
              />
            </View>
            <View style={{ width: 48 }}>
              <CalendarDay
                dateString="2026-09-02"
                rating="very_good"
                isFiltered={false}
                isFiltering={false}
                onPress={noop}
              />
            </View>
            <View style={{ width: 48 }}>
              <CalendarDay
                dateString="2026-09-03"
                rating="bad"
                isFiltered={false}
                isFiltering
                onPress={noop}
              />
            </View>
            <View style={{ width: 48 }}>
              <CalendarDay
                dateString={dayjs().format("YYYY-MM-DD")}
                rating="good"
                isFiltered={false}
                isFiltering={false}
                onPress={noop}
              />
            </View>
          </Row>
        ),
      },
      {
        name: "Year pixel",
        source:
          "features/statistics/screens/StatisticsYear/YearInPixels/Day.tsx",
        render: () => (
          <Row>
            {[null, ...RATING_KEYS].map((rating) => (
              <View key={rating ?? "empty"} style={{ width: 16 }}>
                <YearDay date="2026-01-02" rating={rating} />
              </View>
            ))}
          </Row>
        ),
      },
      {
        name: "ConfirmationHero",
        source: "features/logger/confirmation/ConfirmationHero.tsx",
        note: "Week of pixels after a new entry. The entry day lands last.",
        render: () => (
          <ConfirmationHero
            pixels={getWeekPixels({
              items: sampleItems,
              date: getItemDate(sampleItem),
            })}
          />
        ),
      },
      {
        name: "ColorDot",
        source: "features/settings/screens/Colors/ColorDot.tsx",
        render: () => (
          <Row>
            <ColorDot color="#ef4444" />
            <ColorDot color="#22c55e" />
            <ColorDot color="#3b82f6" />
          </Row>
        ),
      },
    ],
  },
  {
    id: "tags-emotions",
    title: "Tags & emotions",
    entries: [
      {
        name: "Tag",
        source: "features/tags/components/Tag.tsx",
        render: () => <TagDemo />,
      },
      {
        name: "Indicator",
        source: "components/Indicator.tsx",
        render: () => (
          <Row>
            <Indicator colorName="violet">Indicator</Indicator>
          </Row>
        ),
      },
      {
        name: "EmotionButtonBasic",
        source: "features/logger/slides/SlideEmotions/EmotionButtonBasic.tsx",
        render: () => (
          <Row>
            {sampleBasicEmotions.slice(0, 2).map((emotion, index) => (
              <View key={emotion.key} style={{ width: 160 }}>
                <EmotionButtonBasic
                  emotion={emotion}
                  selected={index === 0}
                  onPress={noop}
                />
              </View>
            ))}
          </Row>
        ),
      },
      {
        name: "EmotionButtonAdvanced",
        source:
          "features/logger/slides/SlideEmotions/EmotionButtonAdvanced.tsx",
        render: () => (
          <Row>
            {sampleBasicEmotions.slice(2, 4).map((emotion, index) => (
              <View key={emotion.key} style={{ width: 160 }}>
                <EmotionButtonAdvanced
                  emotion={emotion}
                  selected={index === 0}
                  onPress={noop}
                />
              </View>
            ))}
            <View style={{ width: 160 }}>
              <EmotionButtonEmpty />
            </View>
          </Row>
        ),
      },
      {
        name: "EmotionIndicator",
        source: "features/logger/slides/SlideEmotions/EmotionsIndicator.tsx",
        render: () => (
          <Row>
            {(["very_good", "good", "neutral", "bad", "very_bad"] as const).map(
              (category) => (
                <EmotionIndicator key={category} category={category} />
              )
            )}
          </Row>
        ),
      },
      {
        name: "EmotionItem",
        source: "features/calendar/screens/LogList/EmotionItem.tsx",
        render: () => (
          <Row>
            {sampleBasicEmotions.slice(0, 3).map((emotion) => (
              <EmotionItem key={emotion.key} emotion={emotion} />
            ))}
          </Row>
        ),
      },
      {
        name: "Tooltip",
        source: "features/logger/slides/SlideEmotions/Tooltip.tsx",
        render: () => (
          <View
            style={{
              height: 120,
              maxWidth: 360,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <Tooltip emotion={sampleBasicEmotions[0]} onClose={noop} />
          </View>
        ),
      },
    ],
  },
  {
    id: "inputs",
    title: "Inputs & controls",
    entries: [
      {
        name: "TextArea",
        source: "components/TextArea.tsx",
        render: () => (
          <View
            style={{
              height: 120,
              maxWidth: 420,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <TextArea placeholder="How was your day?" />
          </View>
        ),
      },
      {
        name: "Search input",
        source:
          "features/calendar/screens/Calendar/CalendarBottomSheet/SearchInputSection.tsx",
        render: () => <SearchInputDemo />,
      },
      {
        name: "Radio",
        source: "features/settings/screens/Colors/Radio.tsx",
        render: () => (
          <View style={{ maxWidth: 360, width: "100%", alignSelf: "center" }}>
            <Radio isSelected onPress={noop}>
              <Text>Selected</Text>
            </Radio>
            <Radio onPress={noop}>
              <Text>Unselected</Text>
            </Radio>
            <Radio isDisabled onPress={noop}>
              <Text>Disabled</Text>
            </Radio>
          </View>
        ),
      },
      {
        name: "Clock",
        source: "features/notifications/components/Clock.tsx",
        note: "Web shows the fallback; iOS and Android use native pickers.",
        render: () => (
          <Clock
            timeDate={dayjs().hour(20).minute(0).toDate()}
            onChange={noop}
          />
        ),
      },
      {
        name: "Stepper",
        source: "features/logger/components/Stepper.tsx",
        render: () => <StepperDemo />,
      },
      {
        name: "HeaderPagination",
        source: "features/onboarding/screens/Onboarding/HeaderPagination.tsx",
        render: () => <HeaderPagination index={1} />,
      },
    ],
  },
  {
    id: "lists",
    title: "Lists & layout",
    entries: [
      {
        name: "MenuList / MenuListItem",
        source: "components/MenuListItem.tsx",
        render: () => <MenuListDemo />,
      },
      {
        name: "ModalHeader",
        source: "components/ModalHeader.tsx",
        render: () => (
          <View style={{ maxWidth: 420, width: "100%", alignSelf: "center" }}>
            <ModalHeader
              title="Title"
              left={<LinkButton onPress={noop}>Cancel</LinkButton>}
              right={<LinkButton onPress={noop}>Save</LinkButton>}
            />
          </View>
        ),
      },
      {
        name: "Footer",
        source: "features/logger/slides/Footer.tsx",
        render: () => (
          <Footer>
            <LinkButton type="secondary" onPress={noop}>
              Skip this step
            </LinkButton>
          </Footer>
        ),
      },
    ],
  },
  {
    id: "cards",
    title: "Cards",
    entries: [
      {
        name: "PromoCard",
        source: "components/PromoCard.tsx",
        render: () => (
          <View style={{ maxWidth: 420, width: "100%", alignSelf: "center" }}>
            <PromoCard
              slug="design-guide"
              title="Promo card"
              subtitle="Pressable promo surface"
              onPress={noop}
            />
          </View>
        ),
      },
      {
        name: "Card",
        source: "features/statistics/components/Card.tsx",
        render: () => (
          <View style={{ maxWidth: 420, width: "100%", alignSelf: "center" }}>
            <Card title="Card title" subtitle="Card subtitle">
              <Text>Card body</Text>
            </Card>
          </View>
        ),
      },
      {
        name: "StatsCard",
        source: "features/statistics/screens/StatisticsMonth/StatsCard.tsx",
        render: () => (
          <Row>
            <StatsCard
              title="24"
              subtitle="Entries"
              trendType="up"
              trendValue={4}
            />
            <StatsCard
              title="3.2"
              subtitle="Avg mood"
              trendType="down"
              trendValue={1}
            />
          </Row>
        ),
      },
      {
        name: "NotificationPreview",
        source: "features/notifications/components/NotificationPreview.tsx",
        render: () => (
          <View style={{ maxWidth: 420, width: "100%", alignSelf: "center" }}>
            <NotificationPreview />
          </View>
        ),
      },
    ],
  },
  {
    id: "charts",
    title: "Charts",
    entries: [
      {
        name: "RatingChart",
        source: "features/statistics/components/RatingChart/index.tsx",
        note: "Last 15 days of the year fixture.",
        render: () => (
          <RatingChart
            height={180}
            width={360}
            data={ratingChartData}
            showAverage
          />
        ),
      },
      {
        name: "SleepQualityChart",
        source: "features/statistics/components/SleepQualityChart/index.tsx",
        render: () => (
          <SleepQualityChart height={180} width={360} data={sleepChartData} />
        ),
      },
      {
        name: "Bar",
        source: "features/statistics/components/MoodCounts/Bar.tsx",
        render: () => (
          <View
            style={{
              flexDirection: "row",
              height: 100,
              width: 280,
              alignItems: "flex-end",
            }}
          >
            {RATING_KEYS.map((rating, index) => (
              <Bar key={rating} ratingName={rating} height={20 + index * 10} />
            ))}
          </View>
        ),
      },
    ],
  },
  {
    id: "feedback-states",
    title: "Empty & feedback states",
    entries: [
      {
        name: "NotEnoughDataOverlay",
        source: "features/statistics/components/NotEnoughDataOverlay.tsx",
        render: () => (
          <View
            style={{
              height: 160,
              maxWidth: 420,
              width: "100%",
              alignSelf: "center",
              margin: 20,
            }}
          >
            <NotEnoughDataOverlay limit={14} />
          </View>
        ),
      },
      {
        name: "EmptyPlaceholder",
        source: "features/statistics/screens/Statistics/EmptyPlaceholder.tsx",
        render: () => <EmptyPlaceholder count={3} />,
      },
    ],
  },
];
