import noop from "lodash/noop";
import { useState } from "react";
import { useAnalytics } from "@/state/analytics";
import type { MissedTag } from "./missed-tag-sheet";
import { buildRoughNightSlides, EMPTY_ANSWER } from "./sleep";
import type { RoughNightsAnswer } from "./sleep";
import type { RoughNightsControls } from "./slides";
import type { RoughNight, SleepSlide, StorySlide } from "./types";

const isSleep = (slide: StorySlide): slide is SleepSlide =>
  slide.type === "sleep";

const toggled = (picks: ReadonlySet<string>, key: string) => {
  const next = new Set(picks);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
};

const suggestionKind = (suggestion: string | null) => {
  if (suggestion === null) {
    return null;
  }
  return suggestion.startsWith("person:") ? "person" : "tag";
};

/** Props of the "I missed a tag" sheet, `null` without rough nights. */
export interface MissedSheetProps {
  visible: boolean;
  roughNights: RoughNight[];
  shownTagIds: ReadonlySet<string>;
  onClose: () => void;
  onAdded: (missed: MissedTag) => void;
}

/**
 * State of the sleep slide's "Look closer?" and the rough-night slides it
 * opens. `story` is `deck` plus the rough-night slides after the sleep slide
 * once the user said yes. Tracks the answer to "Look closer?" and the
 * question, counts and booleans only.
 */
export const useRoughNights = (deck: StorySlide[] | null) => {
  const analytics = useAnalytics();
  const sleep = deck?.find(isSleep);
  // `null` until answered.
  const [isLookingCloser, setIsLookingCloser] = useState<boolean | null>(null);
  const [answer, setAnswer] = useState<RoughNightsAnswer>(EMPTY_ANSWER);
  const [isMissedOpen, setIsMissedOpen] = useState(false);
  const roughNights = sleep?.roughNights.length ?? 0;

  const story =
    deck && sleep && isLookingCloser
      ? deck.flatMap((slide) =>
          slide === sleep ? [slide, ...buildRoughNightSlides(sleep)] : [slide]
        )
      : deck;

  const lookCloser = (opened: boolean) => {
    setIsLookingCloser(opened);
    analytics.track("recaps:rough_nights_opened", {
      opened,
      rough_nights: roughNights,
    });
  };

  const done = () => {
    const picks = [...answer.picks];
    const suggestion = sleep?.suggestion ?? null;
    analytics.track("recaps:rough_nights_answered", {
      rough_nights: roughNights,
      picked_count: picks.length,
      picked_tags: picks.filter((key) => key.startsWith("tag:")).length,
      picked_people: picks.filter((key) => key.startsWith("person:")).length,
      not_sure: answer.isNotSure,
      had_suggestion: suggestion !== null,
      matched_suggestion: suggestion !== null && answer.picks.has(suggestion),
      suggestion_kind: suggestionKind(suggestion),
      missed_tag: answer.added.length > 0,
      missed_tag_created: answer.added.some((added) => added.isNew),
      missed_tag_evenings: answer.added.reduce(
        (sum, added) => sum + added.evenings,
        0
      ),
    });
  };

  const controls: RoughNightsControls = {
    onLook: () => lookCloser(true),
    onSkip: () => lookCloser(false),
    answer,
    onToggle: (key) =>
      setAnswer((current) => ({
        ...current,
        picks: toggled(current.picks, key),
        isNotSure: false,
      })),
    onNotSure: () =>
      setAnswer((current) => ({
        ...current,
        picks: new Set(),
        isNotSure: !current.isNotSure,
      })),
    onMissed: () => setIsMissedOpen(true),
    onDone: done,
    onBack: noop,
  };

  /** Sleep slide that still waits for "Look closer?". */
  const isAsking = (slide: StorySlide) =>
    isSleep(slide) && slide.roughNights.length > 0 && isLookingCloser === null;

  const missed: MissedSheetProps | null = sleep
    ? {
        visible: isMissedOpen,
        roughNights: sleep.roughNights,
        shownTagIds: new Set([
          ...sleep.items.flatMap((item) =>
            item.kind === "tag" ? [item.id] : []
          ),
          ...answer.added.map((added) => added.tagId),
        ]),
        onClose: () => setIsMissedOpen(false),
        onAdded: (added) => {
          setIsMissedOpen(false);
          setAnswer((current) => ({
            picks: new Set([...current.picks, `tag:${added.tagId}`]),
            isNotSure: false,
            added: [...current.added, added],
          }));
        },
      }
    : null;

  return { story, controls, isAsking, missed, isMissedOpen };
};
