import { useLocalSearchParams } from "expo-router";
import { LoggerCreate } from "../../logger";

/** Route wrapper that opens the logger for a new entry at the rating slide. */
export const LogCreate = () => {
  const { dateTime } = useLocalSearchParams<{ dateTime: string }>();
  return <LoggerCreate dateTime={dateTime} initialStep="rating" />;
};
