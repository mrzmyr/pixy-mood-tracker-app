import dayjs from "dayjs";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import { HeaderButton } from "@/components/header-button";
import ModalHeader from "@/components/modal-header";
import TextArea from "@/components/text-area";
import { MAX_MESSAGE_LENGTH } from "@/constants/config";
import { RATING_KEYS } from "@/constants/ratings";
import {
  EMOTIONS,
  EmotionBasicSelection,
  PullToSearch,
  toBasicCategory,
} from "@/features/logger";
import { useLogState, useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { createQuickEntry } from "../check-in-state";
import { applyVoicePrefill, hasDraftChanges, toDraft } from "../draft";
import { useVoicePrefill } from "../use-voice-prefill";
import { getSheetSections } from "../sheet-sections";
import { InfluenceChips, MoodPixel } from "./quick-check-in-chips";
import { QuickCheckInEmotions } from "./quick-check-in-emotions";
import { PeopleRow, QuickCheckInListSheets } from "./quick-check-in-pickers";
import {
  QuickCheckInPhotos,
  useQuickCheckInPhotos,
} from "./quick-check-in-photos";
import type { InfluenceOption } from "../ranking";

const NO_PEOPLE: never[] = [];

/** Screen edge to content, same as the logger. */
const INSET = 20;

/** Space between sections. No section titles: the content explains itself. */
const SECTION_GAP = 36;

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
 * Quick check-in on one scrolling page: mood, a one-line note, emotions as in
 * the logger, a row of people, the top 20 tags, and photos last. Search hides
 * above the page until the user pulls down. The full list of
 * people opens in a sheet. Opens from the calendar, from voice mode (with
 * `prefill`), and from More in the Android notification.
 *
 * - `id` names an entry saved in the notification: the screen edits it.
 * - `id` `new` or unknown: Save creates an entry. Save needs a mood.
 * - `prefill`: set by voice mode, added to the draft once.
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
  const hasPeople = useFeatureFlag("people");
  const hasPhotos = useFeatureFlag("photos");
  const { people } = usePeopleState();
  const { tags } = useTagsState();

  const entry = items.find((item) => item.id === id);
  const [draft, setDraft] = useState(() => toDraft(entry));
  // Android imports notification entries on start, so the entry can land
  // after the screen opened. Take it until the user changes something.
  if (entry && draft.source === "empty") {
    setDraft(toDraft(entry));
  }
  useVoicePrefill(prefill, (parsed) =>
    setDraft((current) => applyVoicePrefill(current, parsed))
  );
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
  const [query, setQuery] = useState("");
  const [isPeopleOpen, setIsPeopleOpen] = useState(false);
  // Ranking time is fixed when the screen opens.
  const now = useMemo(() => dayjs(), []);

  const visiblePeople = hasPeople ? people : NO_PEOPLE;
  const sections = useMemo(
    () =>
      getSheetSections({
        query,
        rating,
        items,
        people: visiblePeople,
        tags,
        emotions: EMOTIONS,
        picked,
        now,
      }),
    [query, rating, items, visiblePeople, tags, picked, now]
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
    if (items.some((item) => item.id === id)) {
      logUpdater.editLog({ id, ...changes });
    } else {
      logUpdater.addLog(createQuickEntry(uuidv4(), dayjs(), changes));
      analytics.track("quick_check_in:entry_saved", { source: "app" });
    }
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
  const personById = new Map(people.map((person) => [person.id, person]));

  const openRequest = () =>
    router.push({ pathname: "/request", params: { kind: "emotion" } });

  const isIOS = Platform.OS === "ios";
  const isSearching = query.trim() !== "";

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
        <PullToSearch
          testID="quick-check-in-search"
          placeholder={t("calendar_filters_search")}
          query={query}
          onChangeQuery={setQuery}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 32,
            gap: SECTION_GAP,
          }}
        >
          {isSearching ? (
            <>
              {sections.emotions.length > 0 && (
                <EmotionBasicSelection
                  emotions={sections.emotions.map(toBasicCategory)}
                  selectedEmotions={EMOTIONS.filter((emotion) =>
                    emotionKeys.has(emotion.key)
                  )}
                  onPress={(emotion) => toggleEmotion(emotion.key)}
                  onRequestEmotion={openRequest}
                  style={{ marginBottom: 0 }}
                />
              )}
              {sections.people.length > 0 && (
                <View style={{ paddingHorizontal: INSET }}>
                  <InfluenceChips
                    options={sections.people}
                    people={people}
                    tags={tags}
                    picked={pickedKeys}
                    onToggle={toggle}
                  />
                </View>
              )}
            </>
          ) : (
            <>
              <View style={{ paddingHorizontal: INSET, gap: 12 }}>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={t("logger_step_rating")}
                  style={{ flexDirection: "row", gap: 6 }}
                >
                  {[...RATING_KEYS].reverse().map((key) => (
                    <MoodPixel
                      key={key}
                      rating={key}
                      selected={rating === key}
                      onPress={() => setRating(key)}
                    />
                  ))}
                </View>
                <TextArea
                  testID="quick-check-in-note"
                  accessibilityLabel={t("logger_step_message")}
                  placeholder={t("log_note_question")}
                  value={message}
                  onChange={setMessage}
                  maxLength={MAX_MESSAGE_LENGTH}
                  style={NOTE_STYLE}
                />
              </View>
              <QuickCheckInEmotions
                picked={emotions}
                rating={rating}
                items={items}
                onToggle={toggleEmotion}
              />
              {sections.people.length > 0 && (
                <PeopleRow
                  people={sections.people.flatMap((option) => {
                    const person = personById.get(option.id);
                    return person ? [person] : [];
                  })}
                  picked={pickedPeople}
                  onToggle={togglePerson}
                  onShowAll={() => setIsPeopleOpen(true)}
                />
              )}
            </>
          )}
          {sections.tags.length > 0 && (
            <View style={{ paddingHorizontal: INSET }}>
              <InfluenceChips
                options={sections.tags}
                people={people}
                tags={tags}
                picked={pickedKeys}
                onToggle={toggle}
              />
            </View>
          )}
          {hasPhotos && !isSearching && (
            <View style={{ paddingHorizontal: INSET }}>
              <QuickCheckInPhotos draft={draftPhotos} />
            </View>
          )}
        </PullToSearch>
      </View>
      <QuickCheckInListSheets
        isOpen={isPeopleOpen}
        people={visiblePeople}
        picked={pickedPeople}
        onToggle={togglePerson}
        onClose={() => setIsPeopleOpen(false)}
      />
    </View>
  );
};
