import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { useLogState } from "@/features/logs";
import { FeelingCheckCelebrate } from "../../feelingCheck/FeelingCheckCelebrate";

/**
 * Route shown after saving a new entry. `closeTo` keeps the logger's close
 * target: `calendar` when the day list should close too, else `back`.
 */
export const LogSaved = () => {
  const { id, closeTo } = useLocalSearchParams<{
    id: string;
    closeTo: "calendar" | "back";
  }>();
  const router = useRouter();
  const logState = useLogState();
  const item = logState.items.find((logItem) => logItem.id === id);

  const close = () => {
    if (closeTo === "calendar") {
      router.dismissTo("/calendar");
      return;
    }
    router.back();
  };

  // The entry can be gone, for example after a data reset in another tab.
  useEffect(() => {
    if (item === undefined) {
      router.back();
    }
  }, [item, router]);

  if (item === undefined) {
    return null;
  }

  return (
    <FeelingCheckCelebrate
      item={item}
      entriesCount={logState.items.length}
      onClose={close}
    />
  );
};
