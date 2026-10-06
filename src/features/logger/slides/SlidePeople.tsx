import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import noop from "lodash/noop";
import { Plus } from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import { MAX_PEOPLE } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useLogState } from "@/features/logs";
import {
  PersonChip,
  TILE_RING_GAP,
  TILE_RING_WIDTH,
  sortPeopleByUsage,
  usePeopleState,
} from "@/features/people";
import { SlideHeadline } from "../components/SlideHeadline";
import { useLogDraft } from "../logDraft";
import { Footer } from "./Footer";
import { getSlideMarginTop } from "./marginTop";

const COLUMNS = 3;
const SLIDE_PADDING = 20;
const COLUMN_GAP = 12;
const MAX_AVATAR_SIZE = 96;

/**
 * Last grid cell: opens the person form, hidden at {@link MAX_PEOPLE}.
 * Border, icon, and label share one placeholder gray so the tile reads as an
 * empty slot, quieter than the people around it.
 */
const AddPersonTile = ({ size }: { size: number }) => {
  const router = useRouter();
  const colors = useColors();
  const quiet = colors.textInputPlaceholder;
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
            borderRadius: size / 2,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: quiet,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus
            size={Math.round(size * 0.35)}
            color={quiet}
            strokeWidth={1.5}
          />
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={{
          marginTop: 6,
          maxWidth: outer,
          fontSize: 15,
          color: quiet,
        }}
      >
        {t("people_add")}
      </Text>
    </Pressable>
  );
};

/**
 * People picker slide: "Who played a part?". Archived people are hidden
 * unless the draft already has them. Chips show the most used people of the
 * last 90 days first, in a grid of avatars that ends with an add tile.
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
  const marginTop = getSlideMarginTop();

  const toggle = (id: string) => {
    setPeople(
      selectedIds.has(id)
        ? draft.people.filter((person) => person.id !== id)
        : [...draft.people, { id }]
    );
  };

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
          <ScrollView style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                columnGap: COLUMN_GAP,
                rowGap: 20,
                marginTop: 24,
                paddingBottom: insets.bottom,
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
              {people.length < MAX_PEOPLE && (
                <View style={{ width: columnWidth, alignItems: "center" }}>
                  <AddPersonTile size={avatarSize} />
                </View>
              )}
            </View>
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
