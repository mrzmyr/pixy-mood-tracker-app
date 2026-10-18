import { SegmentedControl } from "@expo/ui/community/segmented-control";
import dayjs from "dayjs";
import noop from "lodash/noop";
import {
  Redirect,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { Pressable, ScrollView, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { Secondary, Section } from "@/components/type";
import type { ConfigurableLoggerStep } from "@/constants/logger-steps";
import { useLocationSetting } from "@/features/location";
import { useFeedback } from "@/features/feedback";
import { useLogState } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { useScrollBottomPadding } from "@/hooks/use-scroll-bottom-padding";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { getLocale, t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { useSettings } from "@/state/settings";
import { getCardProperties } from "../analytics";
import { buildCards } from "../build-cards";
import { FeedbackFooter } from "../components/feedback-footer";
import type { CardFeedback } from "../components/feedback-footer";
import { FeedbackSheet } from "../components/feedback-sheet";
import type { FeedbackReason } from "../feedback-reasons";
import { MomentCard } from "../components/moment-card";
import { ChangeCard } from "../components/change-card";
import { NudgeCard } from "../components/nudge-card";
import { PatternCard } from "../components/pattern-card";
import { SummaryCard } from "../components/summary-card";
import {
  getCardId,
  isChangeCard,
  isNudgeCard,
  isPatternCard,
  isSummaryCard,
} from "../card-types";
import { getDays, getPeriodDays } from "../days";
import { getPeriod, shiftPeriod } from "../period";
import type { Period, PeriodKind, RecapCard } from "../types";
import { useNudgeActions } from "../use-nudge-actions";
import { isMostlyVisible } from "../visibility";
import type { Span } from "../visibility";

const KINDS: { kind: PeriodKind; label: TranslationKey }[] = [
  { kind: "week", label: "recaps_period_week" },
  { kind: "month", label: "recaps_period_month" },
  { kind: "quarter", label: "recaps_period_quarter" },
  { kind: "year", label: "recaps_period_year" },
];

const isPeriodKind = (value: unknown): value is PeriodKind =>
  KINDS.some(({ kind }) => kind === value);

const isDateKey = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
  dayjs(value).isValid();

/** Day and month in the phone locale; the end of a range adds the year. */
const formatRangeDay = (date: string, withYear: boolean) =>
  new Intl.DateTimeFormat(getLocale(), {
    day: "numeric",
    month: "short",
    year: withYear ? "numeric" : undefined,
  }).format(dayjs(date).toDate());

const PERIOD_LABELS: Record<PeriodKind, (period: Period) => string> = {
  week: ({ start, end }) =>
    `${formatRangeDay(start, false)} – ${formatRangeDay(end, true)}`,
  month: ({ start }) => dayjs(start).format("MMMM YYYY"),
  quarter: ({ start }) =>
    t("recaps_period_quarter_label", {
      quarter: Math.floor(dayjs(start).month() / 3) + 1,
      year: dayjs(start).year(),
    }),
  year: ({ start }) => dayjs(start).format("YYYY"),
};

/** Empty period. Text color: secondary gray is under 4.5:1 on the screen. */
const EmptyRecaps = () => {
  const colors = useColors();
  return (
    <Secondary
      testID="recaps-empty"
      style={{ textAlign: "center", color: colors.text }}
    >
      {t("recaps_empty")}
    </Secondary>
  );
};

const cardKey = (card: RecapCard, period: Period) =>
  `${period.kind}:${period.start}:${getCardId(card)}`;

/**
 * Recap cards of one week, month, quarter, or year. Period kind and date
 * live in route params. Each card counts as shown once per screen visit,
 * when half of it is on screen.
 */
const Recaps = () => {
  const colors = useColors();
  const paddingBottom = useScrollBottomPadding(16);
  const router = useRouter();
  const analytics = useAnalytics();
  const weekLocale = useWeekLocale();
  const params = useLocalSearchParams<{ kind?: string; date?: string }>();
  const today = dayjs().format("YYYY-MM-DD");
  const kind = isPeriodKind(params.kind) ? params.kind : "week";
  const period = getPeriod(
    kind,
    isDateKey(params.date) ? params.date : today,
    weekLocale
  );
  const isCurrent = period.end >= today;

  const { items } = useLogState();
  const history = getDays(items);
  const location = useLocationSetting();
  const { tags, categories } = useTagsState();
  const { settings } = useSettings();
  const isPeopleOn = useFeatureFlag("people");
  const isPhotosOn = useFeatureFlag("photos");
  const availableSteps = new Set<ConfigurableLoggerStep>(
    ["emotions", "tags", isPeopleOn && "people", isPhotosOn && "photos"].filter(
      (step): step is ConfigurableLoggerStep => step !== false
    )
  );

  const { people } = usePeopleState();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const cards = buildCards({
    period,
    today,
    firstEntryDate: history[0]?.date ?? null,
    days: getPeriodDays(history, period),
    history,
    locationEnabled: location.isAvailable && location.isEnabled,
    steps: new Set(settings.steps),
    availableSteps,
    reminderEnabled: settings.reminderEnabled,
    tags,
    tagCategories: categories,
    personIds: new Set(people.map((person) => person.id)),
  }).filter((card) => !hidden.has(cardKey(card, period)));

  const nudge = useNudgeActions(period);
  const feedbackChannel = useFeedback();
  const [feedback, setFeedback] = useState<ReadonlyMap<string, CardFeedback>>(
    new Map()
  );
  const [askingCard, setAskingCard] = useState<RecapCard | null>(null);

  const sendFeedback = (
    card: RecapCard,
    helpful: boolean,
    reasons: FeedbackReason[],
    note: string
  ) => {
    analytics.track("recaps:card_feedback_sent", {
      ...getCardProperties(card, period),
      helpful,
      reasons,
      has_note: note.length > 0,
    });
    if (note.length > 0) {
      // Notes go to the Pixy team like other feedback, never to analytics.
      void feedbackChannel.send({
        type: "other",
        source: "recaps",
        message: `${note}\n\nRecap card: ${card.type}`,
        // Without `onCancel`, a failed send shows the feedback error alert.
        onOk: noop,
      });
    }
    const key = cardKey(card, period);
    setFeedback(
      (current) =>
        new Map([...current, [key, helpful ? "helpful" : "not_helpful"]])
    );
  };

  const footerFor = (card: RecapCard, key: string) => (
    <FeedbackFooter
      feedback={feedback.get(key) ?? null}
      onHelpful={() => sendFeedback(card, true, [], "")}
      onNotHelpful={() => setAskingCard(card)}
      testID={`recap-feedback-${getCardId(card)}`}
    />
  );

  const viewport = useRef<Span>({ y: 0, height: 0 });
  const listY = useRef(0);
  const cardSpans = useRef(new Map<string, Span>());
  const shown = useRef(new Set<string>());

  const trackShown = () => {
    for (const card of cards) {
      const key = cardKey(card, period);
      const span = cardSpans.current.get(key);
      if (
        span &&
        !shown.current.has(key) &&
        isMostlyVisible(
          { y: listY.current + span.y, height: span.height },
          viewport.current
        )
      ) {
        shown.current.add(key);
        analytics.track("recaps:card_shown", getCardProperties(card, period));
      }
    }
  };

  // A new visit counts every card again, also after Back from a pushed page.
  const [visit, setVisit] = useState(0);
  useFocusEffect(
    useCallback(() => {
      shown.current = new Set();
      setVisit((current) => current + 1);
    }, [])
  );
  const onVisit = useEffectEvent((visitCount: number) => {
    if (visitCount > 0) {
      trackShown();
    }
  });
  useEffect(() => {
    onVisit(visit);
  }, [visit]);

  const onCardLayout = (key: string) => (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    cardSpans.current.set(key, { y, height });
    trackShown();
  };

  const renderCard = (card: RecapCard) => {
    const key = cardKey(card, period);
    if (isNudgeCard(card)) {
      return (
        <NudgeCard
          key={key}
          card={card}
          tags={tags}
          reminderTime={nudge.reminderTime}
          onLayout={onCardLayout(key)}
          onTurnOn={() => nudge.turnOn(card)}
          onNotNow={() => {
            nudge.notNow(card);
            setHidden((current) => new Set([...current, key]));
          }}
        />
      );
    }
    if (isSummaryCard(card)) {
      return (
        <SummaryCard
          key={key}
          card={card}
          history={history}
          people={people}
          tags={tags}
          periodKind={period.kind}
          onLayout={onCardLayout(key)}
          footer={footerFor(card, key)}
        />
      );
    }
    if (isChangeCard(card)) {
      return (
        <ChangeCard
          key={key}
          card={card}
          people={people}
          tags={tags}
          onLayout={onCardLayout(key)}
          footer={footerFor(card, key)}
        />
      );
    }
    if (isPatternCard(card)) {
      return (
        <PatternCard
          key={key}
          card={card}
          people={people}
          tags={tags}
          categories={categories}
          onLayout={onCardLayout(key)}
          footer={footerFor(card, key)}
        />
      );
    }
    return (
      <MomentCard
        key={key}
        card={card}
        people={people}
        tags={tags}
        onLayout={onCardLayout(key)}
        footer={footerFor(card, key)}
      />
    );
  };

  const setPeriod = (next: Pick<Period, "kind" | "start">) =>
    router.setParams({ kind: next.kind, date: next.start });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, paddingBottom, gap: 16 }}
      scrollEventThrottle={100}
      onLayout={(event) => {
        viewport.current = {
          y: viewport.current.y,
          height: event.nativeEvent.layout.height,
        };
        trackShown();
      }}
      onScroll={(event) => {
        viewport.current = {
          y: event.nativeEvent.contentOffset.y,
          height: viewport.current.height,
        };
        trackShown();
      }}
    >
      <SegmentedControl
        values={KINDS.map(({ label }) => t(label))}
        selectedIndex={KINDS.findIndex((option) => option.kind === kind)}
        onChange={(event) => {
          const next = KINDS[event.nativeEvent.selectedSegmentIndex];
          if (next) {
            setPeriod({ kind: next.kind, start: today });
          }
        }}
        testID="recaps-period-kind"
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("recaps_period_previous")}
          hitSlop={12}
          onPress={() => setPeriod(shiftPeriod(period, -1, weekLocale))}
          testID="recaps-period-previous"
        >
          <ChevronLeft width={24} height={24} color={colors.text} />
        </Pressable>
        <Section
          accessibilityRole="header"
          testID="recaps-period-label"
          style={{ fontWeight: "700", fontVariant: ["tabular-nums"] }}
        >
          {PERIOD_LABELS[period.kind](period)}
        </Section>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("recaps_period_next")}
          accessibilityState={{ disabled: isCurrent }}
          disabled={isCurrent}
          hitSlop={12}
          onPress={() => setPeriod(shiftPeriod(period, 1, weekLocale))}
          testID="recaps-period-next"
          style={{ opacity: isCurrent ? 0.3 : 1 }}
        >
          <ChevronRight width={24} height={24} color={colors.text} />
        </Pressable>
      </View>
      <View
        style={{ gap: 24 }}
        onLayout={(event) => {
          listY.current = event.nativeEvent.layout.y;
          trackShown();
        }}
      >
        {cards.length === 0 && <EmptyRecaps />}
        {cards.map(renderCard)}
      </View>
      <FeedbackSheet
        visible={askingCard !== null}
        onCancel={() => setAskingCard(null)}
        onSend={(reasons, note) => {
          if (askingCard) {
            sendFeedback(askingCard, false, reasons, note);
          }
          setAskingCard(null);
        }}
      />
    </ScrollView>
  );
};

/** Recaps behind flag `recaps`. Deep links with the flag off go to Settings. */
export const RecapsScreen = () =>
  useFeatureFlag("recaps") ? <Recaps /> : <Redirect href="/settings" />;
