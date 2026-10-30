import dayjs from "dayjs";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useMemo, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import { HeaderButton } from "@/components/header-button";
import ModalHeader from "@/components/modal-header";
import TextArea from "@/components/text-area";
import { MAX_MESSAGE_LENGTH } from "@/constants/config";
import { RATING_KEYS } from "@/constants/ratings";
import { EMOTIONS } from "@/features/logger";
import { useLogState, useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { PersonChip, usePeopleState } from "@/features/people";
import { TagComponent, useTagsState } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { createQuickEntry } from "../check-in-state";
import { applyVoicePrefill, toDraft } from "../draft";
import { useVoicePrefill } from "../use-voice-prefill";
import { getSheetSections } from "../sheet-sections";
import { EmotionChip, MoodPixel } from "./quick-check-in-chips";
import {
  QuickCheckInPhotos,
  useQuickCheckInPhotos,
} from "./quick-check-in-photos";
import { QuickCheckInSearchBar } from "./quick-check-in-search-bar";
import type { InfluenceOption } from "../ranking";

const NO_PEOPLE: never[] = [];

/** Space between chips, same as emotion chips. */
const CHIP_GAP = 8;

/** Note field height, about four lines. */
const NOTE_HEIGHT = 120;

const SectionTitle = ({ children }: { children: string }) => {
  const colors = useColors();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: "600",
        marginTop: 24,
        marginBottom: 8,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
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
 * Quick check-in on one scrolling page: search and voice on top, then mood,
 * note, photos, emotions, Suggested, People A to Z, and Tags A to Z. Opens
 * from Settings and from More in the Android notification.
 *
 * - `id` names an entry saved in the notification: the screen edits it.
 * - `id` `new` or unknown: Save creates an entry. Save needs a mood.
 * - `prefill`: set by voice mode on return, added to the draft once.
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
        now,
      }),
    [query, rating, items, visiblePeople, tags, now]
  );

  const toggle = (option: InfluenceOption) => {
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
    close();
  };

  const pickedKeys = new Set(picked);
  const emotionKeys = new Set(emotions);
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const personById = new Map(people.map((person) => [person.id, person]));

  const renderOption = (option: InfluenceOption) => {
    const selected = pickedKeys.has(`${option.kind}:${option.id}`);
    const person =
      option.kind === "person" ? personById.get(option.id) : undefined;
    if (person) {
      return (
        <PersonChip
          key={`person:${option.id}`}
          person={person}
          selected={selected}
          onPress={() => toggle(option)}
        />
      );
    }
    const tag = tagById.get(option.id);
    if (!tag) {
      return null;
    }
    return (
      <TagComponent
        key={`tag:${option.id}`}
        title={tag.title}
        colorName={tag.color}
        selected={selected}
        onPress={() => toggle(option)}
      />
    );
  };

  const chipRow = (options: InfluenceOption[]) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: CHIP_GAP }}>
      {options.map(renderOption)}
    </View>
  );

  const openVoice = () =>
    router.push({ pathname: "/logs/voice", params: { returnTo: id } });

  const isIOS = Platform.OS === "ios";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        // iOS: the sheet bar is transparent (app layout) and the automatic
        // inset does not reach a ScrollView in a sheet. Offset by its height.
        contentInsetAdjustmentBehavior="never"
        scrollIndicatorInsets={{ top: isIOS ? headerHeight : 0 }}
        contentContainerStyle={{
          paddingTop: isIOS ? headerHeight : 0,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <QuickCheckInSearchBar
          query={query}
          onChange={setQuery}
          onVoice={openVoice}
        />
        {query.trim() === "" && (
          <>
            <SectionTitle>{t("logger_step_rating")}</SectionTitle>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[...RATING_KEYS].reverse().map((key) => (
                <MoodPixel
                  key={key}
                  rating={key}
                  selected={rating === key}
                  onPress={() => setRating(key)}
                />
              ))}
            </View>
            <SectionTitle>{t("logger_step_message")}</SectionTitle>
            <TextArea
              testID="quick-check-in-note"
              accessibilityLabel={t("logger_step_message")}
              placeholder={t("log_note_question")}
              value={message}
              onChange={setMessage}
              maxLength={MAX_MESSAGE_LENGTH}
              style={{ height: NOTE_HEIGHT }}
            />
            {hasPhotos && (
              <>
                <SectionTitle>{t("logger_step_photos")}</SectionTitle>
                <QuickCheckInPhotos draft={draftPhotos} />
              </>
            )}
          </>
        )}
        {sections.emotions.length > 0 && (
          <>
            <SectionTitle>{t("emotions")}</SectionTitle>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {sections.emotions.map((emotion) => (
                <EmotionChip
                  key={emotion.key}
                  emotion={emotion}
                  selected={emotionKeys.has(emotion.key)}
                  onPress={() =>
                    setEmotions(
                      emotionKeys.has(emotion.key)
                        ? emotions.filter((key) => key !== emotion.key)
                        : [...emotions, emotion.key]
                    )
                  }
                />
              ))}
            </View>
          </>
        )}
        {sections.suggested.length > 0 && (
          <>
            <SectionTitle>{t("quick_check_in_suggested")}</SectionTitle>
            {chipRow(sections.suggested)}
          </>
        )}
        {sections.people.length > 0 && (
          <>
            <SectionTitle>{t("people")}</SectionTitle>
            {chipRow(sections.people)}
          </>
        )}
        {sections.tags.length > 0 && (
          <>
            <SectionTitle>{t("tags")}</SectionTitle>
            {chipRow(sections.tags)}
          </>
        )}
      </ScrollView>
    </View>
  );
};
