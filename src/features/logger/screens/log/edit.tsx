import { useLocalSearchParams } from "expo-router";
import type { LoggerStep } from "@/constants/logger-steps";
import { LoggerEdit } from "../../logger";

/**
 * Route wrapper that opens the logger for an existing entry, optionally at
 * a given step.
 */
export const LogEdit = () => {
  const { id, step } = useLocalSearchParams<{
    id: string;
    step?: LoggerStep;
  }>();
  return <LoggerEdit id={id} initialStep={step} />;
};
