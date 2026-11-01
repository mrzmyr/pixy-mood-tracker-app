import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import noop from "lodash/noop";
import Plus from "lucide-react-native/icons/plus";
import { useEffect, useRef } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/button";
import { Copy, Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import LinkButton from "@/components/link-button";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import {
  PersonChip,
  TILE_RING_GAP,
  TILE_RING_WIDTH,
  getPeopleLimit,
  getPersonMenuActions,
  movePerson,
  usePeopleState,
  usePeopleUpdater,
  usePersonMenu,
} from "@/features/people";
import type { Person } from "@/features/people";
import { PeopleTileGrid } from "../components/people-tile-grid";
import { SlideHeadline } from "../components/slide-headline";
import { useLogDraft } from "../log-draft";
import { Footer } from "./footer";
import { useSlideMarginTop } from "./margin-top";

const COLUMNS = 3;
const SLIDE_PADDING = 20;
const COLUMN_GAP = 12;
const MAX_AVATAR_SIZE = 96;
const ROW_GAP = 20;

/**
 * Last grid cell: opens the person form, hidden at `MAX_PEOPLE`. Dashed
 * circle, icon, and label use the tint color, so the cell reads as an action
 * and not as a disabled slot. Same size as the person cells; the whole cell
 * is the target. Copy it for add actions in other picker grids.
 */
const AddPersonTile = ({ size }: { size: number }) => {
  const router = useRouter();
  const colors = useColors();
  const outer = size + 2 * (TILE_RING_GAP + TILE_RING_WIDTH);

  return (
    <Pressable
      onPress={() => router.push("/people/create")}
      accessibilityRole="button"
      accessibilityLabel={t("people_add")}
      testID="log-people-add"
      style={({ pressed }) => ({
        alignItems: "center",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: outer,
          height: outer,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: RADIUS.full,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: colors.tint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus
            size={Math.round(size * 0.35)}
            color={colors.tint}
            strokeWidth={2}
          />
        </View>
      </View>
      <Label
        size={14}
        numberOfLines={1}
        style={{
          marginTop: 6,
          maxWidth: outer,
          fontWeight: "500",
          color: colors.tint,
        }}
      >
        {t("people_add")}
      </Label>
    </Pressable>
  );
};

/**
 * People picker slide: "Who played a part?". Archived people are hidden
 * unless the draft already has them. Chips follow the stored order, in a
 * grid of avatars that ends with an add tile. Without people it offers one
 * way out: add some.
 *
 * Tiles reorder by drag and have a menu: Edit, Archive, Delete. iOS: hold
 * shows the system context menu, moving the finger drags. Elsewhere: hold
 * lifts the tile, release in place opens the editor. Archive and Delete
 * also take the person off the draft, so the tile goes away at once.
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
  const analytics = useAnalytics();
  const { people } = usePeopleState();
  const { reorderPeople } = usePeopleUpdater();
  const runMenuAction = usePersonMenu();
  const { width } = useWindowDimensions();
  const columnWidth =
    (width - 2 * SLIDE_PADDING - (COLUMNS - 1) * COLUMN_GAP) / COLUMNS;
  const avatarSize = Math.min(
    MAX_AVATAR_SIZE,
    Math.floor(columnWidth - 2 * (TILE_RING_GAP + TILE_RING_WIDTH))
  );

  const selectedIds = new Set(draft.people.map((person) => person.id));
  const visible = people.filter(
    (person) => !person.isArchived || selectedIds.has(person.id)
  );
  const marginTop = useSlideMarginTop();

  const reorder = (
    orderedIds: Person["id"][],
    method: "drag" | "accessibility_action"
  ) => {
    analytics.track("people:people_reordered", {
      people_count: orderedIds.length,
      method,
    });
    reorderPeople(orderedIds);
  };

  const move = (id: string, offset: -1 | 1) => {
    const orderedIds = movePerson(visible, id, offset);
    if (orderedIds) {
      reorder(orderedIds, "accessibility_action");
    }
  };

  const deselect = (id: string) =>
    setPeople(draft.people.filter((person) => person.id !== id));

  const editPerson = (id: string) =>
    router.push({ pathname: "/people/[id]", params: { id } });

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
        {people.length === 0 && (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 16,
            }}
          >
            <Copy
              size={16}
              style={{
                color: colors.textSecondary,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {t("people_slide_empty")}
            </Copy>
            <Button
              onPress={() => router.push("/people/create")}
              testID="log-people-add"
            >
              {t("people_add")}
            </Button>
          </View>
        )}
        {people.length > 0 && (
          <PeopleTileGrid
            people={visible}
            columns={COLUMNS}
            columnGap={COLUMN_GAP}
            rowGap={ROW_GAP}
            paddingBottom={insets.bottom + 32}
            onReorder={(orderedIds) => reorder(orderedIds, "drag")}
            addTile={
              getPeopleLimit(people).reached ? null : (
                <AddPersonTile size={avatarSize} />
              )
            }
            menuActions={getPersonMenuActions}
            onMenuAction={(person, actionId) =>
              runMenuAction(person, actionId, {
                onEdit: () => editPerson(person.id),
                onArchived: () => deselect(person.id),
                onDeleted: () => deselect(person.id),
              })
            }
            renderTile={(person, isPressBlocked) => (
              <PersonChip
                variant="tile"
                size={avatarSize}
                person={person}
                selected={selectedIds.has(person.id)}
                onPress={() => {
                  if (!isPressBlocked()) {
                    toggle(person.id);
                  }
                }}
                // Hold opens the menu or lifts the tile; screen readers keep "edit".
                onLongPress={() => editPerson(person.id)}
                editOnLongPress={false}
                onMove={(offset) => move(person.id, offset)}
                testID={`log-person-${person.id}`}
              />
            )}
          />
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
