import { LoggerCreate } from "@/features/logger";
import type { RootStackScreenProps } from "../../../types";

/** Route wrapper that opens the logger for a new entry at the rating slide. */
export const LogCreate = ({ route }: RootStackScreenProps<"LogCreate">) => (
  <LoggerCreate
    dateTime={route.params.dateTime}
    initialStep="rating"
    avaliableSteps={route.params.avaliableSteps}
  />
);
