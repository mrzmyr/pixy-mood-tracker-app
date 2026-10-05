import dayjs from "dayjs";
import { useEffect, useEffectEvent, useState } from "react";
import { getCurrentPlace, useLocationSetting } from "@/features/location";
import { useLogDraft } from "../logDraft";
import type { LoggerMode } from "../Logger";

/**
 * Adds the current place to a new entry for today when the location setting
 * is on. Entries for another day start without a place: today's position
 * would be wrong there. Moving the time to another day removes the passive
 * place; a picked place stays. Never asks for access and never marks the
 * draft dirty. Edits keep the stored location.
 *
 * - `isLocationVisible`: the setting is on or the entry has a location
 * - `isLocating`: the lookup still runs
 */
export const usePassiveLocation = ({ mode }: { mode: LoggerMode }) => {
  const { isEnabled } = useLocationSetting();
  const { draft, prefillLocation, dropPrefilledLocation } = useLogDraft();
  const isToday = dayjs(draft.dateTime).isSame(dayjs(), "day");
  const isActive = mode === "create" && isEnabled && isToday;
  const [isLocating, setIsLocating] = useState(isActive);

  const onPlace = useEffectEvent(
    (place: Awaited<ReturnType<typeof getCurrentPlace>>) => {
      setIsLocating(false);
      if (place !== null) {
        prefillLocation(place);
      }
    }
  );

  const onInactive = useEffectEvent(() => dropPrefilledLocation());

  useEffect(() => {
    if (!isActive) {
      onInactive();
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
