import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { MapPin, Navigation, XCircle } from "react-native-feather";
import { CloseButton } from "@/components/CloseButton";
import { SheetModal } from "@/components/SheetModal";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { LogLocation } from "@/types";
import {
  getCurrentPlace,
  getLocationLabel,
  getPlaceAt,
  hasLocationAccess,
  requestLocationAccess,
  searchPlaces,
} from "../places";
import { showLocationDenied } from "../useLocationSetting";
import { PlaceMap } from "./PlaceMap";
import type { MapCoordinates } from "./placeMapProps";
import { RADIUS } from "@/constants/Radius";

/** Wait after the last keystroke before asking the geocoder. */
const SEARCH_DELAY_MS = 400;

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "done"; results: LogLocation[] };

/** Places for `query`, looked up after typing pauses. */
const useSearch = (query: string): SearchState => {
  const trimmed = query.trim();
  const [found, setFound] = useState<{
    query: string;
    results: LogLocation[];
  } | null>(null);

  useEffect(() => {
    if (trimmed.length === 0) {
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      const results = await searchPlaces(trimmed);
      if (isCurrent) {
        setFound({ query: trimmed, results });
      }
    }, SEARCH_DELAY_MS);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [trimmed]);

  if (trimmed.length === 0) {
    return { status: "idle" };
  }
  if (found?.query !== trimmed) {
    return { status: "searching" };
  }
  return { status: "done", results: found.results };
};

/**
 * Device position for the map camera when the entry has no place yet. Never
 * asks for access. `null` until known or without access.
 */
const useCurrentPosition = (isNeeded: boolean): MapCoordinates | null => {
  const [position, setPosition] = useState<MapCoordinates | null>(null);

  useEffect(() => {
    if (!isNeeded) {
      return;
    }
    let isCurrent = true;
    const locate = async () => {
      const place = await getCurrentPlace();
      if (isCurrent && place !== null) {
        setPosition({ latitude: place.latitude, longitude: place.longitude });
      }
    };
    void locate();
    return () => {
      isCurrent = false;
    };
  }, [isNeeded]);

  return position;
};

interface Pinned {
  coordinates: MapCoordinates;
  /** `null` while the name lookup runs. */
  place: LogLocation | null;
}

/** Place the user tapped on the map, named once the lookup returns. */
const usePinnedPlace = () => {
  const [pinned, setPinned] = useState<Pinned | null>(null);

  const pinAt = async (coordinates: MapCoordinates) => {
    setPinned({ coordinates, place: null });
    const place = await getPlaceAt(coordinates);
    // A later tap wins over a slower earlier lookup.
    setPinned((current) =>
      current?.coordinates === coordinates ? { coordinates, place } : current
    );
  };

  return { pinned, pinAt };
};

const SheetContent = ({
  value,
  onChange,
  onClose,
}: {
  value: LogLocation | undefined;
  onChange: (location: LogLocation | undefined) => void;
  onClose: () => void;
}) => {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const search = useSearch(query);
  const here = useCurrentPosition(value === undefined);
  const { pinned, pinAt } = usePinnedPlace();

  /** Sets the location, or removes it without `location`, and closes. */
  const pick = (location?: LogLocation) => {
    onChange(location);
    onClose();
  };

  const useCurrentLocation = async () => {
    if (!(await hasLocationAccess()) && !(await requestLocationAccess())) {
      showLocationDenied();
      return;
    }
    setIsLocating(true);
    const place = await getCurrentPlace();
    setIsLocating(false);
    if (place !== null) {
      pick(place);
    }
  };

  const iconProps = { width: 20, height: 20, color: colors.text };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: 22, fontWeight: "700", color: colors.text }}
        >
          {t("location_picker_title")}
        </Text>
        <CloseButton
          testID="location-picker-close"
          onPress={onClose}
          style={{ marginRight: -10 }}
        />
      </View>
      <TextInput
        testID="location-search"
        accessibilityLabel={t("location_search_placeholder")}
        autoComplete="off"
        autoCorrect={false}
        textContentType="none"
        returnKeyType="search"
        value={query}
        onChangeText={setQuery}
        placeholder={t("location_search_placeholder")}
        placeholderTextColor={colors.textInputPlaceholder}
        style={{
          marginTop: 20,
          borderRadius: RADIUS.sm,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 17,
          backgroundColor: colors.textInputBackground,
          color: colors.text,
        }}
      />
      {search.status === "idle" && (
        <View style={{ marginTop: 16 }}>
          <PlaceMap
            // The map stays put on taps; only the pin moves.
            center={value ?? here}
            pin={pinned?.coordinates ?? value ?? null}
            onPick={pinAt}
          />
        </View>
      )}
      {search.status === "idle" && (
        <MenuList style={{ marginTop: 16 }}>
          {pinned !== null && (
            <MenuListItem
              testID="location-pinned"
              title={
                pinned.place === null
                  ? t("location_locating")
                  : t("location_use_place", {
                      place: getLocationLabel(pinned.place),
                    })
              }
              iconLeft={<MapPin {...iconProps} />}
              deactivated={pinned.place === null}
              onPress={() => {
                if (pinned.place !== null) {
                  pick(pinned.place);
                }
              }}
            />
          )}
          <MenuListItem
            testID="location-current"
            title={isLocating ? t("location_locating") : t("location_current")}
            iconLeft={<Navigation {...iconProps} />}
            deactivated={isLocating}
            onPress={useCurrentLocation}
          />
          {value !== undefined && (
            <MenuListItem
              testID="location-remove"
              title={t("location_remove")}
              iconLeft={<XCircle {...iconProps} />}
              onPress={() => pick()}
            />
          )}
        </MenuList>
      )}
      {search.status === "searching" && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ marginTop: 16, fontSize: 15, color: colors.textSecondary }}
        >
          {t("location_searching")}
        </Text>
      )}
      {search.status === "done" && search.results.length === 0 && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ marginTop: 16, fontSize: 15, color: colors.textSecondary }}
        >
          {t("location_no_results")}
        </Text>
      )}
      {search.status === "done" && search.results.length > 0 && (
        <MenuList style={{ marginTop: 16 }}>
          {search.results.map((place, index) => (
            <MenuListItem
              key={`${place.latitude},${place.longitude}`}
              testID={`location-result-${index}`}
              title={getLocationLabel(place)}
              iconLeft={<MapPin {...iconProps} />}
              onPress={() => pick(place)}
            />
          ))}
        </MenuList>
      )}
    </ScrollView>
  );
};

/**
 * Page sheet to change an entry's location: search a place, tap the map
 * (iOS), take the current location, or remove it. Picking closes the sheet. Every opening starts with
 * an empty search.
 */
export const LocationPicker = ({
  visible,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: LogLocation | undefined;
  onChange: (location: LogLocation | undefined) => void;
  onClose: () => void;
}) => {
  const colors = useColors();
  // Remount the content on each opening, but keep it during the close animation.
  const [session, setSession] = useState(0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setSession((count) => count + 1);
    }
  }

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      backgroundColor={colors.background}
    >
      <SheetContent
        key={session}
        value={value}
        onChange={onChange}
        onClose={onClose}
      />
    </SheetModal>
  );
};
