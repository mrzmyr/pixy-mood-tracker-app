import { askToDisableFeedbackStep, askToDisableStep } from "@/helpers/prompts";
import useColors from "@/hooks/useColors";
import { useLogState } from "@/features/logs";

import { useQuestioner } from "@/features/questioner";
import type { IQuestion } from "@/features/questioner";

import { useSettings } from "@/state/settings";
import { useFeatureFlag } from "@/state/featureFlags";
import { useAnalytics } from "@/state/analytics";
import { LogDraftProvider, useLogDraft } from "./logDraft";
import type { LogDraft } from "./finalizeDraft";
import { getItemDate, toLogDate } from "@/lib/logDates";

import dayjs from "dayjs";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import type { ReactElement, RefObject } from "react";

import { Dimensions, Keyboard, Platform, Text, View } from "react-native";
import type { TextInput } from "react-native";

import { Carousel } from "react-native-reanimated-carousel";
import type { CarouselRef } from "react-native-reanimated-carousel";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import { SlideAction } from "./components/SlideAction";
import { LoggerHeader } from "./components/LoggerHeader";
import type { LoggerStep } from "@/constants/LoggerSteps";
import { SlideEmotions } from "./slides/SlideEmotions";
import { SlideFeedback } from "./slides/SlideFeedback";
import { SlideMessage } from "./slides/SlideMessage";
import { SlideMood } from "./slides/SlideMood";
import FlagHighlight from "@/components/FlagHighlight";
import { SlidePhotos } from "./slides/SlidePhotos";
import { SlideReminder } from "./slides/SlideReminder";
import { SlidePeople } from "./slides/SlidePeople";
import { SlideSleep } from "./slides/SlideSleep";
import { SlideTags } from "./slides/SlideTags";
import { useLoggerActions } from "./hooks/useLoggerActions";
import { useLoggerTracking } from "./hooks/useLoggerTracking";
import { usePassiveLocation } from "./hooks/usePassiveLocation";
import type { SavedEntry } from "./hooks/useLoggerActions";
import { Confirmation } from "./confirmation/Confirmation";
import {
  getAvailableStepsForCreate,
  getAvailableStepsForEdit,
  getRatingActionType,
  hasSleepOnDate,
} from "./steps";

/** Whether the logger creates a new entry or edits an existing one. */
export type LoggerMode = "create" | "edit";

// Slide order in the carousel; `rating` is always shown.
const SLIDE_ORDER: LoggerStep[] = [
  "rating",
  "sleep",
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
  initialStep?: LoggerStep;
  avaliableSteps: LoggerStep[];
  mode: LoggerMode;
  question?: IQuestion | null;
  onCreated?: (saved: SavedEntry) => void;
}

const LoggerSlides = ({
  initialStep,
  avaliableSteps,
  mode,
  question,
  onCreated,
}: Omit<LoggerProps, "initialItem">) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const logState = useLogState();

  const { toggleStep } = useSettings();
  const analytics = useAnalytics();

  const { draft } = useLogDraft();

  const texAreaRef = useRef<TextInput>(null);
  const isEditing = mode === "edit";
  const showDisable = logState.items.length <= 3 && !isEditing;

  const [touched, setTouched] = useState(false);

  const indexFound = initialStep ? avaliableSteps.indexOf(initialStep) : -1;
  const initialIndex = indexFound === -1 ? 0 : indexFound;
  const [slideIndex, setSlideIndex] = useState(initialIndex);

  const { save, remove, cancel } = useLoggerActions({ mode, onCreated });
  const { isLocationVisible, isLocating } = usePassiveLocation({ mode });

  const _carousel = useRef<CarouselRef>(null);

  const slideKeys = SLIDE_ORDER.filter(
    (key) =>
      key === "rating" ||
      (avaliableSteps.includes(key) && (key !== "feedback" || !!question))
  );

  const next = () => {
    if (slideIndex + 1 === slideKeys.length - 1) {
      Keyboard.dismiss();
    }

    if (slideIndex + 1 === slideKeys.length) {
      save();
    } else if (_carousel.current) {
      _carousel.current.next();
    }
  };

  // Shared by the optional slides: confirm, turn the step off, move on.
  const disableStep = async (
    step: "sleep" | "tags" | "people" | "message" | "photos"
  ) => {
    await askToDisableStep();
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
    isTouched: touched,
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
            save();
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
          onSelect={next}
          onDisableStep={() => disableStep("sleep")}
          showDisable={showDisable}
          canFillFromHealth={mode === "create"}
        />
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
            await askToDisableFeedbackStep();
            analytics.track("logger:step_disabled", { step: "feedback" });
            toggleStep("feedback");
            next();
          }}
        />
      ),
      action: <SlideAction type="hidden" />,
    });
  }

  const messageSlideIndex = content.findIndex((item) => item.key === "message");
  const hasMessageSlide = messageSlideIndex !== -1;

  const isMounted = useRef(true);

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  // Effect event: reads the latest message slide position without re-running
  // the effect below when it changes; only slide changes should dismiss the
  // keyboard or focus the message input.
  const getFocusableMessageSlideIndex = useEffectEvent(() =>
    hasMessageSlide && mode === "create" ? messageSlideIndex : null
  );

  useLoggerTracking({ mode, slideKeys, slideIndex });

  useEffect(() => {
    if (isMounted.current) {
      Keyboard.dismiss();

      if (slideIndex === getFocusableMessageSlideIndex()) {
        texAreaRef.current?.focus();
      }
    }
    // `texAreaRef` is stable; listed because the rating slide now reads the
    // slide index and the lint rule can no longer tell.
  }, [slideIndex, texAreaRef]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
        position: "relative",
      }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: Platform.OS === "android" ? insets.top : 0,
        }}
      >
        <LoggerHeader
          carouselRef={_carousel}
          slideCount={content.length}
          slideIndex={slideIndex}
          isEditing={isEditing}
          onCancel={cancel}
          onRemove={remove}
        />
        <View
          style={{
            flex: 1,
            flexDirection: "column",
          }}
        >
          <Carousel
            loop={false}
            itemSize={Dimensions.get("window").width}
            ref={_carousel}
            data={content}
            defaultIndex={Math.min(initialIndex, content.length - 1)}
            onProgressChange={(progress) => {
              if (isMounted.current) {
                setSlideIndex(Math.round(progress));
              }
            }}
            onScrollStart={() => {
              setTouched(true);
            }}
            scrollEnabled={false}
            renderItem={({ index }) => content[index].slide}
          />
        </View>
      </View>
      {content[slideIndex] &&
        (content[slideIndex].action ||
          (slideIndex === content.length - 1 ? (
            <SlideAction type="save" onPress={next} />
          ) : (
            <SlideAction type="next" onPress={next} />
          )))}
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
export const Logger = ({ initialItem, ...props }: LoggerProps) => (
  <LogDraftProvider initialDraft={initialItem}>
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
}: {
  id: string;
  initialStep?: LoggerStep;
}) => {
  const logState = useLogState();
  const { hasStep } = useSettings();
  const hasPeople = useFeatureFlag("people");
  const isPhotosEnabled = useFeatureFlag("photos");
  const initialItem = logState?.items.find((item) => item.id === id);

  if (initialItem === undefined) {
    return (
      <View>
        <Text>Log not found</Text>
      </View>
    );
  }

  const avaliableSteps = getAvailableStepsForEdit({
    item: initialItem,
    hasStep,
    hasSleepOnDay: hasSleepOnDate(logState.items, getItemDate(initialItem)),
    hasPeople,
    isPhotosEnabled,
  });

  return (
    <Logger
      mode="edit"
      initialItem={initialItem}
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
}: {
  dateTime: string;
  initialStep?: LoggerStep;
  avaliableSteps?: LoggerStep[];
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
  const logState = useLogState();
  const router = useRouter();
  const [saved, setSaved] = useState<SavedEntry | null>(null);

  const initialItem: LogDraft = {
    id,
    date: toLogDate(dateTime || dayjs().toISOString()),
    dateTime,
    rating: null,
    message: "",
    emotions: [],
    tags: [],
    people: [],
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
      isPhotosEnabled,
    });

  if (saved !== null) {
    return (
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
    );
  }

  return (
    <Logger
      mode="create"
      onCreated={setSaved}
      initialItem={initialItem}
      initialStep={initialStep}
      avaliableSteps={steps}
      question={questioner.question}
    />
  );
};
