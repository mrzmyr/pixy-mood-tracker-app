import { useRouter } from "expo-router";
import type { AnimatedRef } from "react-native-reanimated";
import type Animated from "react-native-reanimated";
import { Platform, View } from "react-native";
import Sortable from "react-native-sortables";
import type {
  SortableGridDragEndParams,
  SortableGridRenderItemInfo,
} from "react-native-sortables";
import { cardCorners } from "@/components/sortable/card-corners";
import { ReorderHandle } from "@/components/sortable/reorder-handle";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import type { Person } from "../people-provider";
import { usePeopleUpdater } from "../people-provider";
import { PersonListItem } from "./person-list-item";

const IS_IOS = Platform.OS === "ios";

/**
 * Active people in check-in order. Tap a row to edit the person, drag the
 * handle to reorder. The order is the order of the check-in people step.
 * `people` must be every active person: a drag across a filtered list
 * cannot tell where hidden people go.
 */
export const SortablePeopleList = ({
  people,
  scrollRef,
}: {
  people: Person[];
  scrollRef: AnimatedRef<Animated.ScrollView>;
}) => {
  const router = useRouter();
  const colors = useColors();
  const analytics = useAnalytics();
  const { reorderPeople } = usePeopleUpdater();

  const reorder = (
    ids: Person["id"][],
    method: "drag" | "accessibility_action"
  ) => {
    analytics.track("people:people_reordered", {
      people_count: ids.length,
      method,
    });
    reorderPeople(ids);
  };

  const onDragEnd = ({
    data,
    fromIndex,
    toIndex,
  }: SortableGridDragEndParams<Person>) => {
    if (fromIndex !== toIndex) {
      reorder(
        data.map((person) => person.id),
        "drag"
      );
    }
  };

  const onMove = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= people.length) {
      return;
    }
    const ids = people.map((person) => person.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder(ids, "accessibility_action");
  };

  const renderItem = ({ item, index }: SortableGridRenderItemInfo<Person>) => (
    <View
      style={{
        backgroundColor: colors.menuListItemBackground,
        overflow: "hidden",
        ...cardCorners(index === 0, index === people.length - 1),
      }}
    >
      <View style={{ marginTop: index === 0 && IS_IOS ? -1 : 0 }}>
        <PersonListItem
          person={item}
          hasTrailingControl
          onPress={() =>
            router.push({ pathname: "/people/[id]", params: { id: item.id } })
          }
        />
        <View style={{ position: "absolute", top: 0, right: 0, bottom: 0 }}>
          <ReorderHandle
            testID={`person-drag-handle-${item.id}`}
            label={t("tags_reorder_handle", { title: item.name })}
            onMove={(offset) => onMove(index, offset)}
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ paddingTop: 16, paddingHorizontal: IS_IOS ? 16 : 0 }}>
      <Sortable.Grid
        columns={1}
        data={people}
        keyExtractor={(person) => person.id}
        renderItem={renderItem}
        onDragEnd={onDragEnd}
        customHandle
        // Handles only drag, so the drag starts on touch like iOS reorder controls.
        dragActivationDelay={0}
        hapticsEnabled
        overDrag="vertical"
        activeItemScale={1.03}
        scrollableRef={scrollRef}
      />
    </View>
  );
};
