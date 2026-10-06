import { AppleMaps } from "expo-maps";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Text, View, useWindowDimensions } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getLocationLabel } from "@/features/location";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/useColors";
import useScale from "@/hooks/useScale";
import { getItemDate } from "@/lib/logDates";
import { t } from "@/lib/translation";
import { useSetting } from "@/state/settings";
import { useCalendarFilters } from "../../../filters";
import { useCalendarNavigation } from "../../../navigation";
import { TimelineEntry } from "../Timeline/TimelineEntry";
import {
  getCameraCenter,
  getMapEntries,
  getMapPlaces,
  getPlaceKey,
} from "./places";
import type { MapEntry } from "./places";

/** Street level, close enough to tell neighborhoods apart. */
const ZOOM = 14;
// Neighbor cards peek in from both sides.
const CARD_INSET = 24;
const CARD_GAP = 8;
// Room for the float button below the cards.
const FLOAT_BUTTON_SPACE = 84;
// Floating header buttons above the map.
const HEADER_SPACE = 110;

const getKey = (entry: MapEntry) => entry.id;

const MapComponent = () => {
  const colors = useColors();
  const scale = useScale(useSetting("scaleType"));
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const logState = useLogState();
  const calendarFilters = useCalendarFilters();
  const { openDay } = useCalendarNavigation();
  const { isFiltering, filteredItems } = calendarFilters.data;
  const items = isFiltering ? filteredItems : logState.items;
  const entries = useMemo(() => getMapEntries(items), [items]);
  const places = useMemo(() => getMapPlaces(entries), [entries]);
  const mapRef = useRef<AppleMaps.MapView>(null);
  const listRef = useRef<FlatList<MapEntry>>(null);
  // `null`: the newest card. A deleted or filtered out entry falls back too.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const [cardsHeight, setCardsHeight] = useState(0);
  const cardWidth = width - CARD_INSET * 2;
  const interval = cardWidth + CARD_GAP;
  const active =
    entries.find((entry) => entry.id === activeId) ?? entries.at(-1);

  // Active pin in the middle of the map area between header and cards.
  // A prop, not `setCameraPosition`: the map ignores calls before it loads.
  const cardsTop = mapHeight - insets.bottom - FLOAT_BUTTON_SPACE - cardsHeight;
  const target = (HEADER_SPACE + insets.top + cardsTop) / 2;
  const camera =
    active === undefined || mapHeight === 0
      ? undefined
      : {
          coordinates: getCameraCenter(
            active.location,
            ZOOM,
            mapHeight / 2 - target
          ),
          zoom: ZOOM,
        };

  // Settled swipes only: the map moves once per card, not while dragging.
  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / interval);
      const entry = entries[Math.max(0, Math.min(entries.length - 1, index))];
      if (entry !== undefined) {
        setActiveId(entry.id);
        mapRef.current?.selectMarker(getPlaceKey(entry), { moveCamera: false });
      }
    },
    [interval, entries]
  );
  const openEntry = useCallback(
    (item: LogItem) => openDay({ date: getItemDate(item), source: "map" }),
    [openDay]
  );
  const getItemLayout = useCallback(
    (_data: ArrayLike<MapEntry> | null | undefined, index: number) => ({
      length: interval,
      offset: interval * index,
      index,
    }),
    [interval]
  );

  const markers = [...places].map(([key, entry]) => ({
    id: key,
    coordinates: entry.location,
    title: getLocationLabel(entry.location),
    tintColor: scale.colors[entry.rating].background,
  }));

  return (
    <View
      testID="calendar-map"
      style={{ flex: 1 }}
      onLayout={(event) => setMapHeight(event.nativeEvent.layout.height)}
    >
      <AppleMaps.View
        ref={mapRef}
        style={{ flex: 1 }}
        cameraPosition={camera}
        markers={markers}
        uiSettings={{
          compassEnabled: false,
          myLocationButtonEnabled: false,
          scaleBarEnabled: false,
          togglePitchEnabled: false,
        }}
        properties={{ pointsOfInterest: { including: [] } }}
        onMarkerClick={({ id }) => {
          // Selecting the active pin reports a click too; ignore it.
          const entry = id === undefined ? undefined : places.get(id);
          if (
            entry === undefined ||
            active === undefined ||
            id === getPlaceKey(active)
          ) {
            return;
          }
          setActiveId(entry.id);
          listRef.current?.scrollToIndex({
            index: entries.indexOf(entry),
            animated: true,
          });
        }}
      />
      {entries.length === 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            {t("calendar_map_empty")}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          testID="calendar-map-cards"
          horizontal
          data={entries}
          // 30 days stay small: render every card, so the start offset at
          // the newest card is not cut short by an unrendered list end.
          initialNumToRender={entries.length}
          contentOffset={{ x: interval * (entries.length - 1), y: 0 }}
          keyExtractor={getKey}
          getItemLayout={getItemLayout}
          showsHorizontalScrollIndicator={false}
          snapToInterval={interval}
          decelerationRate="fast"
          // One card per swipe: walking through the days, not flinging.
          disableIntervalMomentum
          onMomentumScrollEnd={onScrollEnd}
          onLayout={(event) => setCardsHeight(event.nativeEvent.layout.height)}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: insets.bottom + FLOAT_BUTTON_SPACE,
          }}
          contentContainerStyle={{
            paddingHorizontal: CARD_INSET,
            gap: CARD_GAP,
            alignItems: "flex-end",
          }}
          renderItem={({ item }) => (
            <View style={{ width: cardWidth }}>
              <TimelineEntry
                item={item}
                onPress={openEntry}
                showPlace={false}
              />
            </View>
          )}
        />
      )}
    </View>
  );
};

/**
 * Map layout of the calendar screen: entries of the last 30 days with a
 * place, as Timeline cards in a horizontal row, oldest left. Opens on the
 * newest card, on the right. Swiping walks through the days: the map follows the active
 * card and selects its pin. One pin per place; tapping one scrolls to the
 * newest card there; tapping a
 * card opens its day. Active calendar filters apply.
 */
export const CalendarMap = memo(MapComponent);
