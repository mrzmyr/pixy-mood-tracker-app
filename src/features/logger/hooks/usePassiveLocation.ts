import { useEffect, useEffectEvent, useState } from "react";
import { getCurrentPlace, useLocationSetting } from "@/features/location";
import { useLogDraft } from "../logDraft";
import type { LoggerMode } from "../Logger";

/**
 * Adds the current place to a new entry when the location setting is on.
 * Never asks for access and never marks the draft dirty. Edits keep the
 * stored location.
 *
 * - `isLocationVisible`: the setting is on or the entry has a location
 * - `isLocating`: the lookup still runs
 */
export const usePassiveLocation = ({ mode }: { mode: LoggerMode }) => {
  const { isEnabled } = useLocationSetting();
  const { draft, prefillLocation } = useLogDraft();
  const isActive = mode === "create" && isEnabled;
  const [isLocating, setIsLocating] = useState(isActive);

  const onPlace = useEffectEvent(
    (place: Awaited<ReturnType<typeof getCurrentPlace>>) => {
      setIsLocating(false);
      if (place !== null) {
        prefillLocation(place);
      }
    }
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }
    let isCurrent = true;
    const locate = async () => {
      const place = await getCurrentPlace();
      if (isCurrent) {
        onPlace(place);
      }
    };
    void locate();
    return () => {
      isCurrent = false;
    };
  }, [isActive]);

  return {
    isLocationVisible: isEnabled || draft.location !== undefined,
    isLocating: isActive && isLocating,
  };
};
