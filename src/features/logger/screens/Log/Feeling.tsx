import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { useLogState } from "@/features/logs";
import { FeelingCheckSheet } from "../../feelingCheck/FeelingCheckSheet";

/** Sheet route that the logger opens after saving a new entry. */
export const LogFeeling = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const logState = useLogState();
  const item = logState.items.find((logItem) => logItem.id === id);

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
    <FeelingCheckSheet
      item={item}
      entriesCount={logState.items.length}
      onClose={() => router.back()}
    />
  );
};
