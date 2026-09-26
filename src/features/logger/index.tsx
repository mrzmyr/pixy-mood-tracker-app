import { DATE_FORMAT } from "@/constants/Config";
import { askToDisableFeedbackStep, askToDisableStep } from "@/helpers/prompts";
import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { useLogState } from "@/features/logs";
import type { IQuestion } from "@/features/questioner";
import { useQuestioner } from "@/features/questioner";
import { useSettings } from "@/state/settings";
import type { TemporaryLogState } from "./temporaryLog";
import { useTemporaryLog } from "./temporaryLog";
import type { Emotion, TagReference } from "@/types";
import dayjs from "dayjs";
import type { ReactElement } from "react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { TextInput } from "react-native";
import { Dimensions, Keyboard, Platform, Text, View } from "react-native";
import type { CarouselRef } from "react-native-reanimated-carousel";
import { Carousel } from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import { SlideAction } from "./components/SlideAction";
import { LoggerHeader } from "./components/LoggerHeader";
import type { LoggerStep } from "./config";
import { SlideEmotions } from "./slides/SlideEmotions";
import { SlideFeedback } from "./slides/SlideFeedback";
import { SlideMessage } from "./slides/SlideMessage";
import { SlideMood } from "./slides/SlideMood";
import { SlideReminder } from "./slides/SlideReminder";
import { SlideTags } from "./slides/SlideTags";
import { useLoggerActions } from "./hooks/useLoggerActions";

/** Whether the logger creates a new entry or edits an existing one. */
export type LoggerMode = "create" | "edit";

// Slide order in the carousel; `rating` is always shown.
const SLIDE_ORDER: LoggerStep[] = [
  "rating",
  "emotions",
  "tags",
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

const getAvailableStepsForCreate = ({
  question,
  hasStep,
  reminderEnabled,
  itemsCount,
}: {
  question: IQuestion | null;
  hasStep: ReturnType<typeof useSettings>["hasStep"];
  reminderEnabled: boolean;
  itemsCount: number;
}) => {
  const slides: LoggerStep[] = ["rating"];

  if (hasStep("emotions")) {
    slides.push("emotions");
  }
  if (hasStep("tags")) {
    slides.push("tags");
  }
  if (hasStep("message")) {
    slides.push("message");
  }

  if (itemsCount === 1 && !reminderEnabled) {
    slides.push("reminder");
  }

  if (itemsCount >= 3 && question !== null && hasStep("feedback")) {
    slides.push("feedback");
  }

  return slides;
};

const getAvailableStepsForEdit = ({
  item,
  hasStep,
}: {
  item: LogItem;
  hasStep: ReturnType<typeof useSettings>["hasStep"];
}) => {
  const slides: LoggerStep[] = ["rating"];

  if (hasStep("emotions") || item.emotions.length > 0) {
    slides.push("emotions");
  }
  if (hasStep("tags") || item.tags.length > 0) {
    slides.push("tags");
  }
  if (hasStep("message") || item.message.length > 0) {
    slides.push("message");
  }

  return slides;
};

/**
 * Slide-based entry editor shared by create and edit.
 *
 * Must render inside `TemporaryLogProvider`, which holds the draft. Slides
 * outside `avaliableSteps` are skipped; `rating` always shows, and
 * `feedback` also needs a `question`. With rating as the only slide,
 * picking a rating saves at once.
 */
export const Logger = ({
  initialItem,
  initialStep,
  avaliableSteps,
  mode,
  question,
}: {
  initialItem: TemporaryLogState;
  initialStep?: LoggerStep;
  avaliableSteps: LoggerStep[];
  mode: LoggerMode;
  question?: IQuestion | null;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const logState = useLogState();

  const { toggleStep } = useSettings();

  const tempLog = useTemporaryLog(initialItem);

  const texAreaRef = useRef<TextInput>(null);
  const isEditing = mode === "edit";
  const showDisable = logState.items.length <= 3 && !isEditing;

  const [touched, setTouched] = useState(false);

  const indexFound = initialStep ? avaliableSteps.indexOf(initialStep) : -1;
  const initialIndex = indexFound === -1 ? 0 : indexFound;
  const [slideIndex, setSlideIndex] = useState(initialIndex);

  const { save, remove, cancel } = useLoggerActions({ mode, tempLog });

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
      save(tempLog.data);
    } else if (_carousel.current) {
      _carousel.current.next();
    }
  };

  const content: {
    key: string;
    slide: ReactElement;
    action?: ReactElement;
  }[] = [];

  const isRatingActionVisible = slideIndex !== 0 || touched || mode === "edit";
  const ratingActionType = content.length === 1 ? "save" : "next";

  content.push({
    key: "rating",
    slide: (
      <SlideMood
        onChange={(rating) => {
          if (tempLog.data.rating !== rating) {
            if (slideKeys.length === 1) {
              save({
                ...tempLog.data,
                rating,
              });
            } else {
              // oxlint-disable-next-line node/callback-return -- `next` advances the carousel, it is not a Node-style callback; `tempLog.update` must still run afterwards
              next();
            }
          }
          tempLog.update({ rating });
        }}
      />
    ),
    action: (
      <SlideAction
        type={isRatingActionVisible ? ratingActionType : "hidden"}
        onPress={next}
      />
    ),
  });

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
            defaultIndex={
              EMOTIONS_INDEX_MAPPING[tempLog.data.rating || "neutral"]
            }
            onChange={(emotions: Emotion[]) => {
              tempLog.update({
                emotions: emotions.map((emotion) => emotion.key),
              });
            }}
            showDisable={showDisable}
          />
        </View>
      ),
    });
  }

  if (slideKeys.includes("tags")) {
    content.push({
      key: "tags",
      slide: (
        <SlideTags
          onChange={(tags: TagReference[]) => {
            tempLog.update({ tags });
          }}
          onDisableStep={async () => {
            await askToDisableStep();
            toggleStep("tags");
            next();
          }}
          showDisable={showDisable}
        />
      ),
    });
  }

  if (slideKeys.includes("message")) {
    content.push({
      key: "message",
      slide: (
        <SlideMessage
          onChange={(message) => {
            tempLog.update({ message });
          }}
          onDisableStep={async () => {
            await askToDisableStep();
            toggleStep("message");
            next();
          }}
          ref={texAreaRef}
          showDisable={showDisable}
        />
      ),
    });
  }

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

  useEffect(() => {
    if (isMounted.current) {
      Keyboard.dismiss();

      if (slideIndex === getFocusableMessageSlideIndex()) {
        texAreaRef.current?.focus();
      }
    }
  }, [slideIndex]);

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
          setSlideIndex={setSlideIndex}
          isEditing={isEditing}
          tempLog={tempLog}
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
 * off; the feedback slide needs 3+ entries and an available question.
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
  const logState = useLogState();

  const initialItem = {
    id,
    date: dateTime
      ? dayjs(dateTime).format(DATE_FORMAT)
      : dayjs().format(DATE_FORMAT),
    dateTime,
    rating: null,
    message: "",
    emotions: [],
    tags: [],
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
      reminderEnabled: settings.reminderEnabled,
      itemsCount: logState.items.length,
    });

  return (
    <Logger
      mode="create"
      initialItem={initialItem}
      initialStep={initialStep}
      avaliableSteps={steps}
      question={questioner.question}
    />
  );
};
