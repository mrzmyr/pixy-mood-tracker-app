import dayjs from "dayjs";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useMemo, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import { HeaderButton } from "@/components/header-button";
import ModalHeader from "@/components/modal-header";
import { SearchInput } from "@/components/search-input";
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
import { getSheetSections } from "../sheet-sections";
import { EmotionChip, MoodPixel } from "./quick-check-in-chips";
import type { InfluenceOption } from "../ranking";

const NO_PEOPLE: never[] = [];

/** Space between chips, same as emotion chips. */
const CHIP_GAP = 8;

/** Screen values. `source` tells whether the user changed them yet. */
interface Draft {
  rating: LogItem["rating"] | null;
  emotions: string[];
  /** Picked people and tags as `kind:id`. */
  picked: string[];
  source: "empty" | "entry" | "user";
}

const toDraft = (entry: LogItem | undefined): Draft =>
  entry
    ? {
        rating: entry.rating,
        emotions: entry.emotions,
        picked: [
          ...entry.people.map((person) => `person:${person.id}`),
          ...entry.tags.map((tag) => `tag:${tag.id}`),
        ],
        source: "entry",
      }
    : { rating: null, emotions: [], picked: [], source: "empty" };

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

/**
 * Quick check-in on one scrolling page: search on top, then mood,
 * emotions, Suggested, People A to Z, and Tags A to Z. Opens from Settings
 * and from More in the Android notification.
 *
 * - `id` names an entry saved in the notification: the screen edits it.
 * - `id` `new` or unknown: Save creates an entry. Save needs a mood.
 */
export const QuickCheckIn = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const analytics = useAnalytics();
  const { items } = useLogState();
  const logUpdater = useLogUpdater();
  const hasPeople = useFeatureFlag("people");
  const { people } = usePeopleState();
  const { tags } = useTagsState();

  const entry = items.find((item) => item.id === id);
  const [draft, setDraft] = useState(() => toDraft(entry));
  // Android imports notification entries on start, so the entry can land
  // after the screen opened. Take it until the user changes something.
  if (entry && draft.source === "empty") {
    setDraft(toDraft(entry));
  }
  const { rating, emotions, picked } = draft;
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
      {isIOS ? (
        <>
          <Stack.Screen options={{ title: t("quick_check_in_title") }} />
          {/* Title doubles as label: expo-router drops `accessibilityLabel`
              on iOS bar items. With an icon, iOS shows only the icon. */}
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              icon="xmark"
              accessibilityLabel={t("close")}
              onPress={close}
            >
              {t("close")}
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon="checkmark"
              accessibilityLabel={t("save")}
              variant="prominent"
              disabled={rating === null}
              onPress={save}
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
              onPress={close}
            />
          }
          right={
            <HeaderButton
              kind="confirm"
              label={t("save")}
              testID="quick-check-in-save"
              disabled={rating === null}
              onPress={save}
            />
          }
        />
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
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
        <SearchInput
          testID="quick-check-in-search"
          value={query}
          onChange={setQuery}
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
