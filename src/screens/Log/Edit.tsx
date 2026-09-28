import { LoggerEdit } from "@/features/logger";
import type { RootStackScreenProps } from "../../../types";

/**
 * Route wrapper that opens the logger for an existing entry, optionally at
 * a given step.
 */
export const LogEdit = ({ route }: RootStackScreenProps<"LogEdit">) => (
  <LoggerEdit id={route.params.id} initialStep={route.params.step} />
);
