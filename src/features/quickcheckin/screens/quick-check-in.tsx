import dayjs from "dayjs";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import { HeaderButton } from "@/components/header-button";
import ModalHeader from "@/components/modal-header";
import TextArea from "@/components/text-area";
import { MAX_MESSAGE_LENGTH } from "@/constants/config";
import { SPACE } from "@/constants/space";
import { hasNegativeEmotion } from "@/features/logger";
import { useLogState, useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import {
  getShortNames,
  usePeopleAdded,
  usePeopleState,
} from "@/features/people";
import { useStoreReviewPrompt } from "@/features/review";
import { useTagsState } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { createQuickEntry } from "../check-in-state";
import { applyVoicePrefill, hasDraftChanges, toDraft } from "../draft";
import { useVoicePrefill } from "../use-voice-prefill";
import { getSheetSections } from "../sheet-sections";
import { InfluenceChips } from "./quick-check-in-chips";
import { QuickCheckInEmotions } from "./quick-check-in-emotions";
import { QuickCheckInMoodSlide } from "./quick-check-in-mood-slide";
import { PeopleRow, QuickCheckInListSheets } from "./quick-check-in-pickers";
import {
  QuickCheckInPhotos,
  useQuickCheckInPhotos,
} from "./quick-check-in-photos";
import { INSET, QuickCheckInSection } from "./quick-check-in-section";
import type { InfluenceOption } from "../ranking";

/**
 * Note grows from one line up to about five. iOS puts the line height slack
 * above the text, so the top padding is 4 pt smaller: one line then sits in
 * the vertical middle. Set top and bottom: `paddingVertical` would lose to
 * the `paddingTop` of `TextArea`.
 */
const NOTE_STYLE = {
  height: undefined,
  maxHeight: 140,
  paddingTop: 10,
  paddingBottom: 14,
};

/** Swiping between slides closes the keyboard. */
const handleSlideDrag = () => Keyboard.dismiss();

/** Emotion grid and people row pad themselves to the screen edges. */
const SELF_PADDED = { paddingHorizontal: 0 };

/** The note, above the sections. Always open. */
const Note = ({
  message,
  onChange,
}: {
  message: string;
  onChange: (message: string) => void;
}) => (
  <View style={{ paddingHorizontal: INSET, paddingBottom: SPACE.xxl }}>
    <TextArea
      testID="quick-check-in-note"
      accessibilityLabel={t("logger_step_message")}
      placeholder={t("log_note_question")}
      value={message}
      onChange={onChange}
      maxLength={MAX_MESSAGE_LENGTH}
      style={NOTE_STYLE}
    />
  </View>
);

/** Close and Save: iOS sheet bar items, Android Material top app bar. */
const QuickCheckInHeader = ({
  canSave,
  onClose,
  onSave,
}: {
  canSave: boolean;
  onClose: () => void;
  onSave: () => void;
}) =>
  Platform.OS === "ios" ? (
    <>
      <Stack.Screen options={{ title: t("quick_check_in_title") }} />
      {/* Title doubles as label: expo-router drops `accessibilityLabel`
          on iOS bar items. With an icon, iOS shows only the icon. */}
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t("close")}
          onPress={onClose}
        >
          {t("close")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="checkmark"
          accessibilityLabel={t("save")}
          variant="prominent"
          disabled={!canSave}
          onPress={onSave}
        >
          {t("save")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  ) : (
    <ModalHeader
      title={t("quick_check_in_title")}
      left={
        <HeaderButton
          kind="cancel"
          label={t("close")}
          testID="quick-check-in-close"
          onPress={onClose}
        />
      }
      right={
        <HeaderButton
          kind="confirm"
          label={t("save")}
          testID="quick-check-in-save"
          disabled={!canSave}
          onPress={onSave}
        />
      }
    />
  );

/**
 * Quick check-in on two slides, like the logger. First the mood buttons of
 * the logger; a tap slides on. Second one scrolling page: a one-line note,
 * then sections for emotions as in the logger, a row of people, the top 20
 * tags, and photos. Swiping forward needs a mood; swiping back returns to it.
 * Swiping pauses while the emotion pages, which swipe themselves, show. Each section folds under a hairline divider; the folded state stays
 * on the device. The full list of people opens in a sheet, with "Add
 * Person" on top. Opens from the calendar, from voice mode (with
 * `prefill`), and from More in the Android notification.
 *
 * - `id` names an entry saved in the notification: the screen edits it.
 * - `id` `new` or unknown: Save creates an entry. Save needs a mood.
 * - `prefill`: set by voice mode, added to the draft once. With a spoken
 *   mood the screen opens on the second slide.
 */
export const QuickCheckIn = () => {
  const { id, prefill } = useLocalSearchParams<{
    id: string;
    prefill?: string;
  }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const analytics = useAnalytics();
  const { items } = useLogState();
  const logUpdater = useLogUpdater();
  const requestStoreReviewPrompt = useStoreReviewPrompt();
  const { people } = usePeopleState();
  const { tags } = useTagsState();

  const entry = items.find((item) => item.id === id);
  const [draft, setDraft] = useState(() => toDraft(entry));
  // Android imports notification entries on start, so the entry can land
  // after the screen opened. Take it until the user changes something.
  if (entry && draft.source === "empty") {
    setDraft(toDraft(entry));
  }
  // A spoken mood answers the first slide: open on the second.
  const [skipsMood, setSkipsMood] = useState(false);
  useVoicePrefill(prefill, (parsed) => {
    setDraft((current) => applyVoicePrefill(current, parsed));
    if (parsed.rating !== undefined) {
      setSkipsMood(true);
    }
  });
  const { rating, emotions, picked, message, photos } = draft;
  const setRating = (value: LogItem["rating"]) =>
    setDraft((current) => ({ ...current, rating: value, source: "user" }));
  const setEmotions = (value: string[]) =>
    setDraft((current) => ({ ...current, emotions: value, source: "user" }));
  const setPicked = (update: (current: string[]) => string[]) =>
    setDraft((current) => ({
      ...current,
      picked: update(current.picked),
      source: "user",
    }));
  const setMessage = (value: string) =>
    setDraft((current) => ({ ...current, message: value, source: "user" }));
  const draftPhotos = useQuickCheckInPhotos({
    entry,
    photos,
    onChange: (value) =>
      setDraft((current) => ({ ...current, photos: value, source: "user" })),
  });
  const [isPeopleOpen, setIsPeopleOpen] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const slidesRef = useRef<ScrollView>(null);
  const [isEmotionPaging, setIsEmotionPaging] = useState(false);
  const rate = (value: LogItem["rating"]) => {
    setRating(value);
    slidesRef.current?.scrollTo({ x: windowWidth, animated: true });
  };
  // Ranking time is fixed when the screen opens.
  const now = useMemo(() => dayjs(), []);

  const shortNames = useMemo(() => getShortNames(people), [people]);
  const sections = useMemo(
    () =>
      getSheetSections({
        rating,
        items,
        people,
        tags,
        picked,
        now,
      }),
    [rating, items, people, tags, picked, now]
  );

  const toggle = (option: Pick<InfluenceOption, "kind" | "id">) => {
    const key = `${option.kind}:${option.id}`;
    setPicked((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key]
    );
  };

  const references = (kind: InfluenceOption["kind"]) => {
    const prefix = `${kind}:`;
    const result: { id: string }[] = [];
    for (const key of picked) {
      if (key.startsWith(prefix)) {
        result.push({ id: key.slice(prefix.length) });
      }
    }
    return result;
  };

  // Close, Android back, and the swipe down ask before dropping input.
  const { allowLeave } = useDiscardGuard({
    isDirty: hasDraftChanges(draft, entry),
  });

  const isSheet = router.canGoBack();
  // Opened from a notification with the app closed: nothing to go back to.
  const close = () => (isSheet ? router.back() : router.replace("/"));

  const save = () => {
    if (rating === null) {
      return;
    }
    const changes = {
      rating,
      emotions,
      people: references("person"),
      tags: references("tag"),
      message,
      photos,
    };
    // An existing id is the entry the notification saved: this screen
    // completes it, so it still counts as a new check-in.
    const isNew = !items.some((item) => item.id === id);
    if (isNew) {
      logUpdater.addLog(createQuickEntry(uuidv4(), dayjs(), changes));
      analytics.track("quick_check_in:entry_saved", { source: "app" });
    } else {
      logUpdater.editLog({ id, ...changes });
    }
    requestStoreReviewPrompt({
      kind: "entry_saved",
      // `items` predates this save, so count a new entry.
      entriesCount: items.length + (isNew ? 1 : 0),
      rating,
      hasNegativeEmotion: hasNegativeEmotion(emotions),
    });
    analytics.track("quick_check_in:completed", {
      source: "app",
      has_emotion: emotions.length > 0,
      influences_count: picked.length,
      has_note: message.trim() !== "",
      photos_count: photos.length,
    });
    allowLeave();
    close();
  };

  const pickedKeys = new Set(picked);
  const emotionKeys = new Set(emotions);
  const pickedPeople = new Set(
    references("person").map((reference) => reference.id)
  );

  const toggleEmotion = (key: string) =>
    setEmotions(
      emotionKeys.has(key)
        ? emotions.filter((value) => value !== key)
        : [...emotions, key]
    );
  const togglePerson = (personId: string) =>
    toggle({ kind: "person", id: personId });
  // "Add Person" opens the person form on top: select whoever it adds.
  usePeopleAdded(people, (added) =>
    setPicked((current) => [
      ...current,
      ...added.map((person) => `person:${person.id}`),
    ])
  );
  const personById = new Map(people.map((person) => [person.id, person]));

  const isIOS = Platform.OS === "ios";

  return (
    <View
      style={{
        flex: 1,
        // Same surface as the logger: both are check-ins.
        backgroundColor: colors.logBackground,
        // A cold deep link opens the screen as the root, not as a sheet.
        marginTop:
          !isIOS && (Platform.OS === "android" || !isSheet) ? insets.top : 0,
      }}
    >
      <QuickCheckInHeader
        canSave={rating !== null}
        onClose={close}
        onSave={save}
      />
      <View style={{ flex: 1, paddingTop: isIOS ? headerHeight : 0 }}>
        <ScrollView
          ref={slidesRef}
          testID="quick-check-in-slides"
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={rating !== null && !isEmotionPaging}
          contentOffset={skipsMood ? { x: windowWidth, y: 0 } : undefined}
          onScrollBeginDrag={handleSlideDrag}
        >
          <View style={{ width: windowWidth }}>
            <QuickCheckInMoodSlide rating={rating} onRate={rate} />
          </View>
          <View style={{ width: windowWidth }}>
            <ScrollView
              testID="quick-check-in-scroll"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{
                paddingBottom: insets.bottom + SPACE.xxxl,
              }}
            >
              <Note message={message} onChange={setMessage} />
              {/* Hairlines above and below each section. */}
              <View
                style={{
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.logCardBorder,
                }}
              >
                <QuickCheckInSection
                  section="emotions"
                  title={t("emotions")}
                  contentStyle={SELF_PADDED}
                >
                  <QuickCheckInEmotions
                    picked={emotions}
                    rating={rating}
                    items={items}
                    onToggle={toggleEmotion}
                    onPagingChange={setIsEmotionPaging}
                  />
                </QuickCheckInSection>
                {sections.people.length > 0 && (
                  <QuickCheckInSection
                    section="people"
                    title={t("people")}
                    contentStyle={SELF_PADDED}
                  >
                    <PeopleRow
                      people={sections.people.flatMap((option) => {
                        const person = personById.get(option.id);
                        return person ? [person] : [];
                      })}
                      shortNames={shortNames}
                      picked={pickedPeople}
                      onToggle={togglePerson}
                      onShowAll={() => setIsPeopleOpen(true)}
                    />
                  </QuickCheckInSection>
                )}
                {sections.tags.length > 0 && (
                  <QuickCheckInSection section="tags" title={t("tags")}>
                    <InfluenceChips
                      options={sections.tags}
                      people={people}
                      tags={tags}
                      picked={pickedKeys}
                      onToggle={toggle}
                    />
                  </QuickCheckInSection>
                )}
                <QuickCheckInSection
                  section="photos"
                  title={t("logger_step_photos")}
                >
                  <QuickCheckInPhotos draft={draftPhotos} />
                </QuickCheckInSection>
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
      <QuickCheckInListSheets
        isOpen={isPeopleOpen}
        people={people}
        picked={pickedPeople}
        onToggle={togglePerson}
        onClose={() => setIsPeopleOpen(false)}
      />
    </View>
  );
};
