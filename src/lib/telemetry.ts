import * as Device from "expo-device";

import { APP_VARIANT, HAS_APP_VARIANT } from "@/constants/app-variant";
import type { AppVariant } from "@/constants/app-variant";

/** Facts fixed per build and device. */
export interface TelemetryBuild {
  /** `false` in Jest or when `EXPO_PUBLIC_APP_VARIANT` is missing. */
  hasVariant: boolean;
  variant: AppVariant;
  /** `false` on simulators and emulators, where E2E and local builds run. */
  isDevice: boolean;
}

/** This build and device. Tests pass their own `TelemetryBuild` instead. */
export const currentBuild: TelemetryBuild = {
  hasVariant: HAS_APP_VARIANT,
  variant: APP_VARIANT,
  isDevice: Device.isDevice,
};

/**
 * Only real devices on shipped variants report to Sentry and Observe.
 * Simulator, emulator, E2E, and development runs would otherwise skew
 * startup numbers and flood error lists.
 */
export const canReportTelemetry = ({
  hasVariant,
  variant,
  isDevice,
}: TelemetryBuild) => hasVariant && variant !== "development" && isDevice;

/** `canReportTelemetry` for this build and device. */
export const CAN_REPORT_TELEMETRY = canReportTelemetry(currentBuild);
