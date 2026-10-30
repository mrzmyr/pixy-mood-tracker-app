import { isConfirmed } from "@/lib/prompt-cancel";
import { askToDisableFeedbackStep, askToDisableStep } from "@/lib/prompts";
import useColors from "@/hooks/use-colors";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";

import { useQuestioner } from "@/features/questioner";
import type { IQuestion } from "@/features/questioner";

import { useSettings } from "@/state/settings";
import { useFeatureFlag } from "@/state/feature-flags";
import { useAnalytics } from "@/state/analytics";
import { useHealthSleepSetting } from "@/features/health";
import { LogDraftProvider, useLogDraft } from "./log-draft";
import { finalizeDraft } from "./finalize-draft";
import type { LogDraft } from "./finalize-draft";
import { getItemDate, toLogDate } from "@/lib/log-dates";

import dayjs from "dayjs";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import type { ReactElement, RefObject } from "react";

import { Keyboard, Text, useWindowDimensions, View } from "react-native";
import type { TextInput } from "react-native";

import { Carousel } from "react-native-reanimated-carousel";
import type { CarouselRef } from "react-native-reanimated-carousel";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import { SlideAction } from "./components/slide-action";
import { LoggerHeader } from "./components/logger-header";
import type { LoggerStep } from "@/constants/logger-steps";
import { SlideEmotions } from "./slides/slide-emotions";
import { SlideFeedback } from "./slides/slide-feedback";
import { SlideMessage } from "./slides/slide-message";
import { SlideMood } from "./slides/slide-mood";
import FlagHighlight from "@/components/flag-highlight";
import { SlidePhotos } from "./slides/slide-photos";
import { SlideReminder } from "./slides/slide-reminder";
import { SlidePeople } from "./slides/slide-people";
import { SlideMenstruation } from "./slides/slide-menstruation";
import { SlideSleep } from "./slides/slide-sleep";
import { SlideTags } from "./slides/slide-tags";
import { useLoggerActions } from "./hooks/use-logger-actions";
import { useLoggerTracking } from "./hooks/use-logger-tracking";
import { usePassiveLocation } from "./hooks/use-passive-location";
import { useRecoverySnapshot } from "./recovery/use-recovery-snapshot";
import type { SavedEntry } from "./hooks/use-logger-actions";
import { Confirmation } from "./confirmation/confirmation";
import type { LoggerPrefill } from "./prefill";
import { VoiceFeedbackSheet } from "@/features/feedback";
import {
  getAvailableStepsForCreate,
  getAvailableStepsForEdit,
  getRatingActionType,
  hasSleepOnDate,
  hasMenstruationOnDate,
} from "./steps";

/** Whether the logger creates a new entry or edits an existing one. */
export type LoggerMode = "create" | "edit";

// Slide order in the carousel; `rating` is always shown.
const SLIDE_ORDER: LoggerStep[] = [
  "rating",
  "sleep",
  "menstruation",
  "emotions",
  "tags",
  "people",
  "photos",
  "message",
  "reminder",
  "feedback",
];

const EMOTIONS_INDEX_MAPPING = {
  extremely_bad: 0,
  very_bad: 1,
  bad: 1,
  neutral: 2,
  good: 3,
  very_good: 3,
  extremely_good: 4,
};

interface SlideContent {
  key: string;
  slide: ReactElement;
  action?: ReactElement;
}

/** Slides of the steps the user can turn off from the logger, in order. */
const useStepSlides = ({
  slideKeys,
  isPhotosSlideActive,
  mode,
  showDisable,
  texAreaRef,
  disableStep,
}: {
  slideKeys: LoggerStep[];
  isPhotosSlideActive: boolean;
  mode: LoggerMode;
  showDisable: boolean;
  texAreaRef: RefObject<TextInput | null>;
  disableStep: (
    step: "tags" | "people" | "message" | "photos"
  ) => Promise<void>;
}) => {
  const slides: SlideContent[] = [];

  if (slideKeys.includes("tags")) {
    slides.push({
      key: "tags",
      slide: (
        <SlideTags
          onDisableStep={() => disableStep("tags")}
          showDisable={showDisable}
        />
      ),
    });
  }

  if (slideKeys.includes("people")) {
    slides.push({
      key: "people",
      slide: (
        <FlagHighlight flag="people" pillOnly style={{ flex: 1 }}>
          <SlidePeople
            onDisableStep={() => disableStep("people")}
            showDisable={showDisable}
          />
        </FlagHighlight>
      ),
    });
  }

  if (slideKeys.includes("photos")) {
    slides.push({
      key: "photos",
      slide: (
        <FlagHighlight flag="photos" pillOnly style={{ flex: 1 }}>
          <SlidePhotos
            mode={mode}
            isActive={isPhotosSlideActive}
            onDisableStep={() => disableStep("photos")}
            showDisable={showDisable}
          />
        </FlagHighlight>
      ),
    });
  }

  if (slideKeys.includes("message")) {
    slides.push({
      key: "message",
      slide: (
        <SlideMessage
          onDisableStep={() => disableStep("message")}
          ref={texAreaRef}
          showDisable={showDisable}
        />
      ),
    });
  }

  return slides;
};

interface LoggerProps {
  initialItem: LogDraft;
  /** `initialItem` holds content from outside the logger. See `LogDraftProvider`. */
  isPrefilled?: boolean;
  initialStep?: LoggerStep;
  avaliableSteps: LoggerStep[];
  mode: LoggerMode;
  question?: IQuestion | null;
  onCreated?: (saved: SavedEntry) => void;
}

type OptionalStep =
  | "menstruation"
  | "sleep"
  | "emotions"
  | "tags"
  | "people"
  | "message"
  | "photos";

/**
 * Slides the logger shows, in order. Menstruation follows its own rules: off
 * with the flag off, in edit mode only when the entry can edit it, and in
 * create mode once per day unless this draft already holds it.
 */
const getSlideKeys = ({
  mode,
  avaliableSteps,
  hasQuestion,
  isMenstruationEnabled,
  hasStep,
  draft,
  items,
}: {
  mode: LoggerMode;
  avaliableSteps: LoggerStep[];
  hasQuestion: boolean;
  isMenstruationEnabled: boolean;
  hasStep: (step: LoggerStep) => boolean;
  draft: LogDraft;
  items: LogItem[];
}) =>
  SLIDE_ORDER.filter((key) => {
    if (key === "menstruation") {
      if (!isMenstruationEnabled) {
        return false;
      }
      if (mode === "edit") {
        return avaliableSteps.includes(key);
      }
      return (
        hasStep(key) &&
        (draft.menstruation !== undefined ||
          !hasMenstruationOnDate(items, toLogDate(draft.dateTime)))
      );
    }
    return (
      key === "rating" ||
      (avaliableSteps.includes(key) && (key !== "feedback" || hasQuestion))
    );
  });

/**
 * Closes the keyboard on every slide change and focuses the note input on its
 * slide. The returned ref turns false on unmount, so late carousel progress
 * events skip state updates.
 */
const useSlideFocus = ({
  slideIndex,
  focusSlideIndex,
  texAreaRef,
}: {
  slideIndex: number;
  focusSlideIndex: number | null;
  texAreaRef: RefObject<TextInput | null>;
}) => {
  const isMounted = useRef(true);

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  // Effect event: reads the latest note slide position without re-running
  // the effect below when it changes; only slide changes should dismiss the
  // keyboard or focus the note input.
  const getFocusSlideIndex = useEffectEvent(() => focusSlideIndex);

  useEffect(() => {
    if (isMounted.current) {
      Keyboard.dismiss();

      if (slideIndex === getFocusSlideIndex()) {
        texAreaRef.current?.focus();
      }
    }
    // `texAreaRef` is stable; listed because the lint rule cannot tell.
  }, [slideIndex, texAreaRef]);

  return isMounted;
};

const LoggerSlides = ({
  initialStep,
  avaliableSteps,
  mode,
  question,
  onCreated,
}: Omit<LoggerProps, "initialItem" | "isPrefilled">) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const logState = useLogState();

  const { toggleStep, hasStep } = useSettings();
  const isMenstruationEnabled = useFeatureFlag("menstruation");
  const analytics = useAnalytics();

  const { draft } = useLogDraft();

  const texAreaRef = useRef<TextInput>(null);
  const isEditing = mode === "edit";
  const showDisable = logState.items.length <= 3 && !isEditing;

  const indexFound = initialStep ? avaliableSteps.indexOf(initialStep) : -1;
  const initialIndex = indexFound === -1 ? 0 : indexFound;
  const [slideIndex, setSlideIndex] = useState(initialIndex);
  // Furthest slide the user has been on. Swiping forward stops here, so a
  // new entry cannot skip ahead; an existing entry has no such limit.
  const [furthestIndex, setFurthestIndex] = useState(
    isEditing ? Number.MAX_SAFE_INTEGER : initialIndex
  );
  // The advanced emotions page swipes sideways by itself, so slide swiping
  // pauses while it shows.
  const [emotionsMode, setEmotionsMode] = useState<"basic" | "advanced">(
    "basic"
  );

  const { save, cancel } = useLoggerActions({ mode, onCreated });
  const { isLocationVisible, isLocating } = usePassiveLocation({ mode });

  const _carousel = useRef<CarouselRef>(null);
  // iOS lays the modal out at full window height first, then shrinks it to
  // the sheet. Without an explicit height the carousel keeps the first,
  // taller slide height, and slide bottoms end up under the home indicator.
  const [carouselHeight, setCarouselHeight] = useState<number>();

  const slideKeys = getSlideKeys({
    mode,
    avaliableSteps,
    hasQuestion: !!question,
    isMenstruationEnabled,
    hasStep,
    draft,
    items: logState.items,
  });

  // Slide to open once the carousel holds it, see the effect below.
  const pendingIndex = useRef<number | null>(null);

  const advance = (nextIndex: number) => {
    if (nextIndex === slideKeys.length - 1) {
      Keyboard.dismiss();
    }

    if (nextIndex === slideKeys.length) {
      void save();
    } else if (nextIndex > furthestIndex) {
      pendingIndex.current = nextIndex;
      setFurthestIndex(nextIndex);
    } else {
      _carousel.current?.scrollTo({ index: nextIndex, animated: true });
    }
  };

  const next = () => advance(slideIndex + 1);

  // Shared by the optional slides: confirm, turn the step off, move on.
  const disableStep = async (step: OptionalStep) => {
    if (!(await isConfirmed(askToDisableStep()))) {
      return;
    }
    analytics.track("logger:step_disabled", { step });
    toggleStep(step);
    next();
  };

  const stepSlides = useStepSlides({
    slideKeys,
    isPhotosSlideActive: slideKeys[slideIndex] === "photos",
    mode,
    showDisable,
    texAreaRef,
    disableStep,
  });

  const ratingActionType = getRatingActionType({
    slideCount: slideKeys.length,
    slideIndex,
    isTouched: furthestIndex > 0,
    mode,
  });

  const content: SlideContent[] = [];

  content.push({
    key: "rating",
    slide: (
      <SlideMood
        isLocationVisible={isLocationVisible}
        isLocating={isLocating}
        isActionVisible={ratingActionType !== "hidden"}
        onRatingChanged={() => {
          if (slideKeys.length === 1) {
            void save();
            return;
          }
          next();
        }}
      />
    ),
    action: <SlideAction type={ratingActionType} onPress={next} />,
  });

  if (slideKeys.includes("sleep")) {
    content.push({
      key: "sleep",
      slide: (
        <SlideSleep
          onNext={next}
          onDisableStep={() => disableStep("sleep")}
          showDisable={showDisable}
        />
      ),
    });
  }

  if (slideKeys.includes("menstruation")) {
    content.push({
      key: "menstruation",
      slide: (
        <FlagHighlight flag="menstruation" pillOnly style={{ flex: 1 }}>
          <SlideMenstruation
            onSelect={() => advance(slideKeys.indexOf("menstruation") + 1)}
            onDisableStep={() => disableStep("menstruation")}
            showDisable={showDisable}
          />
        </FlagHighlight>
      ),
    });
  }

  if (slideKeys.includes("emotions")) {
    content.push({
      key: "emotions",
      slide: (
        <View
          style={{
            paddingBottom: insets.bottom + 20,
            flex: 1,
          }}
        >
          <SlideEmotions
            defaultIndex={EMOTIONS_INDEX_MAPPING[draft.rating ?? "neutral"]}
            onDisableStep={() => disableStep("emotions")}
            initialMode={emotionsMode}
            onModeChange={setEmotionsMode}
            showDisable={showDisable}
          />
        </View>
      ),
    });
  }

  content.push(...stepSlides);

  if (slideKeys.includes("reminder")) {
    content.push({
      key: "reminder",
      slide: <SlideReminder onPress={next} />,
      action: <SlideAction type="hidden" />,
    });
  }

  if (slideKeys.includes("feedback") && !!question) {
    content.push({
      key: "feedback",
      slide: (
        <SlideFeedback
          question={question}
          onPress={next}
          onDisableStep={async () => {
            if (!(await isConfirmed(askToDisableFeedbackStep()))) {
              return;
            }
            analytics.track("logger:step_disabled", { step: "feedback" });
            toggleStep("feedback");
            next();
          }}
        />
      ),
      action: <SlideAction type="hidden" />,
    });
  }

  const reachedIndex = Math.min(furthestIndex, content.length - 1);
  const reachedContent = content.slice(0, reachedIndex + 1);

  // The carousel only holds slides up to `reachedIndex`. A step forward adds
  // the next slide first, then scrolls to it.
  useEffect(() => {
    const target = pendingIndex.current;
    if (target === null) {
      return;
    }
    pendingIndex.current = null;
    _carousel.current?.scrollTo({
      index: Math.min(target, reachedIndex),
      animated: true,
    });
    // The refs are stable; listed because the lint rule cannot tell.
  }, [reachedIndex, _carousel, pendingIndex]);

  const messageSlideIndex = content.findIndex((item) => item.key === "message");

  const isMounted = useSlideFocus({
    slideIndex,
    focusSlideIndex:
      mode === "create" && messageSlideIndex !== -1 ? messageSlideIndex : null,
    texAreaRef,
  });

  useLoggerTracking({ mode, slideKeys, slideIndex });
  useRecoverySnapshot({ mode, step: slideKeys[slideIndex] });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
        position: "relative",
      }}
    >
      <View style={{ flex: 1 }}>
        <LoggerHeader
          carouselRef={_carousel}
          slideCount={content.length}
          slideIndex={slideIndex}
          onCancel={cancel}
        />
        <View
          onLayout={(event) =>
            setCarouselHeight(event.nativeEvent.layout.height)
          }
          style={{
            flex: 1,
            flexDirection: "column",
          }}
        >
          <Carousel
            loop={false}
            itemSize={windowWidth}
            style={carouselHeight ? { height: carouselHeight } : undefined}
            ref={_carousel}
            data={reachedContent}
            defaultIndex={Math.min(initialIndex, content.length - 1)}
            onProgressChange={(progress) => {
              if (isMounted.current) {
                setSlideIndex(Math.round(progress));
              }
            }}
            scrollEnabled={
              !(
                slideKeys[slideIndex] === "emotions" &&
                emotionsMode === "advanced"
              )
            }
            onConfigurePanGesture={(gesture) =>
              gesture.activeOffsetX([-10, 10]).failOffsetY([-10, 10])
            }
            renderItem={({ index }) => content[index].slide}
          />
        </View>
      </View>
      {content[slideIndex] &&
        (content[slideIndex].action || (
          <SlideAction
            type={slideIndex === content.length - 1 ? "save" : "next"}
            onPress={next}
          />
        ))}
    </View>
  );
};

/**
 * Slide-based entry editor shared by create and edit.
 *
 * Holds its own draft, which starts at `initialItem`. Slides read and write
 * the draft through `useLogDraft`; the logger passes them only flow
 * callbacks. Slides outside `avaliableSteps` are skipped; `rating` always
 * shows, and `feedback` also needs a `question`. With rating as the only
 * slide, picking a new rating saves at once.
 */
export const Logger = ({ initialItem, isPrefilled, ...props }: LoggerProps) => (
  <LogDraftProvider initialDraft={initialItem} isPrefilled={isPrefilled}>
    <LoggerSlides {...props} />
  </LogDraftProvider>
);

/**
 * Logger for an existing entry. Shows a "Log not found" message when `id`
 * is unknown, for example after the entry was deleted.
 */
export const LoggerEdit = ({
  id,
  initialStep,
  restoredDraft,
}: {
  id: string;
  initialStep?: LoggerStep;
  /** Unsaved changes from a recovery snapshot; the logger starts dirty. */
  restoredDraft?: LogDraft | null;
}) => {
  const logState = useLogState();
  const { hasStep } = useSettings();
  const hasPeople = useFeatureFlag("people");
  const isPhotosEnabled = useFeatureFlag("photos");
  const isMenstruationEnabled = useFeatureFlag("menstruation");
  const storedItem = logState?.items.find((item) => item.id === id);

  if (storedItem === undefined) {
    return (
      <View>
        <Text>Log not found</Text>
      </View>
    );
  }

  const initialItem = restoredDraft
    ? finalizeDraft(restoredDraft, logState.items).item
    : storedItem;

  const avaliableSteps = getAvailableStepsForEdit({
    item: initialItem,
    hasStep,
    hasSleepOnDay: hasSleepOnDate(logState.items, getItemDate(initialItem)),
    hasPeople,
    isPhotosEnabled,
    isMenstruationEnabled,
  });

  return (
    <Logger
      mode="edit"
      initialItem={restoredDraft ?? initialItem}
      isPrefilled={!!restoredDraft}
      initialStep={initialStep}
      avaliableSteps={avaliableSteps}
    />
  );
};

/**
 * Logger for a new entry at `dateTime` (ISO).
 *
 * Without `avaliableSteps`, the slides follow the user's enabled steps. The
 * reminder slide shows only when exactly one entry exists and reminders are
 * off; the feedback slide needs 3+ entries and an available question. After
 * saving, the slides make way for the confirmation.
 */
export const LoggerCreate = ({
  dateTime,
  initialStep,
  avaliableSteps,
  prefill,
  restoredDraft,
}: {
  dateTime: string;
  initialStep?: LoggerStep;
  avaliableSteps?: LoggerStep[];
  /** Start values, for example from voice mode. */
  prefill?: LoggerPrefill | null;
  /**
   * Draft from a recovery snapshot. Replaces the new draft, keeping its id
   * and `createdAt`; the logger starts dirty.
   */
  restoredDraft?: LogDraft | null;
}) => {
  // Generated once per mount so the new entry keeps a stable id and timestamp.
  const { id, createdAt } = useMemo(
    () => ({ id: uuidv4(), createdAt: dayjs().toISOString() }),
    []
  );
  const questioner = useQuestioner();
  const { hasStep, settings } = useSettings();
  const hasPeople = useFeatureFlag("people");
  const isPhotosEnabled = useFeatureFlag("photos");
  const isMenstruationEnabled = useFeatureFlag("menstruation");
  const { isEnabled: isSleepAutoFilled } = useHealthSleepSetting();
  const logState = useLogState();
  const router = useRouter();
  const [saved, setSaved] = useState<SavedEntry | null>(null);

  const initialItem: LogDraft = restoredDraft ?? {
    id,
    date: toLogDate(dateTime || dayjs().toISOString()),
    dateTime,
    rating: prefill?.rating ?? null,
    message: prefill?.message ?? "",
    emotions: prefill?.emotions ?? [],
    tags: prefill?.tags.map((tagId) => ({ id: tagId })) ?? [],
    people: prefill?.people.map((personId) => ({ id: personId })) ?? [],
    photos: [],
    sleep: {
      quality: null,
    },
    createdAt,
  };

  const steps =
    avaliableSteps ||
    getAvailableStepsForCreate({
      question: questioner.question,
      hasStep,
      hasPeople,
      reminderEnabled: settings.reminderEnabled,
      itemsCount: logState.items.length,
      hasSleepOnDay: hasSleepOnDate(logState.items, initialItem.date),
      isSleepAutoFilled,
      isPhotosEnabled,
      isMenstruationEnabled,
      hasMenstruationOnDay: hasMenstruationOnDate(
        logState.items,
        initialItem.date
      ),
    });

  if (saved !== null) {
    return (
      <>
        <Confirmation
          item={saved.item}
          entriesCount={logState.items.length}
          onClose={() => {
            if (saved.closeTo === "calendar") {
              router.dismissTo("/calendar");
              return;
            }
            router.back();
          }}
        />
        {prefill?.source === "voice" && (
          <VoiceFeedbackSheet
            context={{
              durationMs: prefill.durationMs ?? 0,
              tagsCount: saved.item.tags.length,
              peopleCount: saved.item.people.length,
              emotionsCount: saved.item.emotions.length,
            }}
          />
        )}
      </>
    );
  }

  return (
    <Logger
      mode="create"
      onCreated={setSaved}
      initialItem={initialItem}
      isPrefilled={!!prefill || !!restoredDraft}
      initialStep={initialStep}
      avaliableSteps={steps}
      question={questioner.question}
    />
  );
};
