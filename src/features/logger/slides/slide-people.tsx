import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import noop from "lodash/noop";
import Plus from "lucide-react-native/icons/plus";
import { useEffect, useRef } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/button";
import { RADIUS } from "@/constants/radius";
import LinkButton from "@/components/link-button";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useLogState } from "@/features/logs";
import {
  PersonChip,
  TILE_RING_GAP,
  TILE_RING_WIDTH,
  getPeopleLimit,
  sortPeopleByUsage,
  usePeopleState,
} from "@/features/people";
import { SlideHeadline } from "../components/slide-headline";
import { useLogDraft } from "../log-draft";
import { Footer } from "./footer";
import { useSlideMarginTop } from "./margin-top";

const COLUMNS = 3;
const SLIDE_PADDING = 20;
const COLUMN_GAP = 12;
const MAX_AVATAR_SIZE = 96;

/**
 * Pill below the grid: opens the person form, hidden at `MAX_PEOPLE`.
 * Outlined like an unselected tag, so it stays quieter than the people.
 */
const AddPersonPill = () => {
  const router = useRouter();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const borderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  return (
    <Pressable
      onPress={() => router.push("/people/create")}
      accessibilityRole="button"
      accessibilityLabel={t("people_add")}
      testID="log-people-add"
      style={({ pressed }) => ({
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor,
        paddingLeft: 12,
        paddingRight: 16,
        paddingVertical: 8,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Plus size={16} color={colors.textSecondary} strokeWidth={2} />
      <Text style={{ fontSize: 15, color: colors.textSecondary }}>
        {t("people_add")}
      </Text>
    </Pressable>
  );
};

/**
 * People picker slide: "Who played a part?". Archived people are hidden
 * unless the draft already has them. Chips show the most used people of the
 * last 90 days first, in a grid of avatars with an add pill below.
 * Without people it offers one way out: add some.
 */
export const SlidePeople = ({
  onDisableStep = noop,
  showDisable,
}: {
  onDisableStep?: () => void;
  showDisable: boolean;
}) => {
  const { draft, setPeople } = useLogDraft();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { people } = usePeopleState();
  const { items } = useLogState();
  const { width } = useWindowDimensions();
  const columnWidth =
    (width - 2 * SLIDE_PADDING - (COLUMNS - 1) * COLUMN_GAP) / COLUMNS;
  const avatarSize = Math.min(
    MAX_AVATAR_SIZE,
    Math.floor(columnWidth - 2 * (TILE_RING_GAP + TILE_RING_WIDTH))
  );

  const selectedIds = new Set(draft.people.map((person) => person.id));
  const visible = sortPeopleByUsage(
    people.filter((person) => !person.isArchived || selectedIds.has(person.id)),
    items
  );
  const marginTop = useSlideMarginTop();

  const toggle = (id: string) => {
    setPeople(
      selectedIds.has(id)
        ? draft.people.filter((person) => person.id !== id)
        : [...draft.people, { id }]
    );
  };

  // The add-person form opens on top of this slide, which stays mounted.
  // Anyone who shows up in the list after mount is new: select them.
  const knownIds = useRef<Set<string> | null>(null);
  if (knownIds.current === null) {
    knownIds.current = new Set(people.map((person) => person.id));
  }
  useEffect(() => {
    const known = knownIds.current;
    const added = people.filter((person) => !known?.has(person.id));
    if (added.length === 0) {
      return;
    }
    for (const person of added) {
      known?.add(person.id);
    }
    setPeople([...draft.people, ...added.map((person) => ({ id: person.id }))]);
  }, [people, draft.people, setPeople]);

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        paddingHorizontal: SLIDE_PADDING,
        paddingBottom: insets.bottom + 20,
        marginTop,
      }}
    >
      <SlideHeadline>{t("log_people_question")}</SlideHeadline>
      <View style={{ position: "relative", flex: 1 }}>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.logBackground, colors.logBackgroundTransparent]}
          style={{
            position: "absolute",
            height: 24,
            top: 0,
            zIndex: 1,
            width: "100%",
          }}
        />
        <LinearGradient
          colors={[colors.logBackgroundTransparent, colors.logBackground]}
          style={{
            position: "absolute",
            height: 32,
            bottom: 0,
            zIndex: 1,
            width: "100%",
          }}
          pointerEvents="none"
        />
        {people.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 17,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {t("people_slide_empty")}
            </Text>
            <Button
              onPress={() => router.push("/people/create")}
              testID="log-people-add"
            >
              {t("people_add")}
            </Button>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                columnGap: COLUMN_GAP,
                rowGap: 20,
                marginTop: 24,
              }}
            >
              {visible.map((person) => (
                <View
                  key={person.id}
                  style={{ width: columnWidth, alignItems: "center" }}
                >
                  <PersonChip
                    variant="tile"
                    size={avatarSize}
                    person={person}
                    selected={selectedIds.has(person.id)}
                    onPress={() => toggle(person.id)}
                    onLongPress={() =>
                      router.push({
                        pathname: "/people/[id]",
                        params: { id: person.id },
                      })
                    }
                    testID={`log-person-${person.id}`}
                  />
                </View>
              ))}
            </View>
            {!getPeopleLimit(people).reached && (
              <View style={{ marginTop: 24 }}>
                <AddPersonPill />
              </View>
            )}
          </ScrollView>
        )}
      </View>
      <Footer>
        {showDisable && (
          <LinkButton
            type="secondary"
            onPress={onDisableStep}
            style={{ fontWeight: "400" }}
          >
            {t("log_people_disable")}
          </LinkButton>
        )}
      </Footer>
    </View>
  );
};
