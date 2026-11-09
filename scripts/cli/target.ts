import { CliError } from "./shared.ts";
import type { Platform } from "./shared.ts";

/** One phone of the simlock fleet. `id` is its UDID or adb serial. */
export interface Phone {
  platform: Platform;
  id: string;
  name: string;
  osVersion: string;
  state: "ready" | "in use" | "blocked";
  problem: string;
}
/** One printable managed-device or phone row. */
export interface DeviceRow {
  option: string;
  kind: "simulator" | "emulator" | "phone";
  os: Platform;
  name: string;
  state: string;
  problem: string;
  id?: string;
  token?: string;
}
/** Pure input snapshot used to render device list rows. */
export interface TargetInput {
  phones: Phone[];
  managed: {
    platform: Platform;
    name: string;
    id?: string;
    state: string;
    claimedBy?: string;
  }[];
  repositoryRoot: string;
  platform?: Platform;
}
/** Fields of simlock's `GET /v1/status` that phones need. */
export interface SimlockStatus {
  devices?: {
    id: string;
    physical?: boolean;
    state?: string;
    driverDeviceId?: string;
    workerId?: string;
    presence?: { present?: boolean };
    spec?: { platform?: string; model?: string; osVersion?: string };
  }[];
  leases?: { deviceId?: string }[];
  workers?: { id: string; drained?: boolean }[];
}

/** Phones of a simlock status. Leased phones are in use; absent phones and phones of drained workers are blocked. */
export const toPhones = (status: SimlockStatus): Phone[] =>
  (status.devices ?? []).flatMap((device) => {
    const platform = device.spec?.platform;
    if (
      !device.physical ||
      device.state === "deleted" ||
      !device.driverDeviceId ||
      (platform !== "ios" && platform !== "android")
    ) {
      return [];
    }
    const worker = status.workers?.find((item) => item.id === device.workerId);
    let state: Phone["state"] = "ready";
    let problem = "";
    if (device.presence?.present === false) {
      state = "blocked";
      problem = "Phone not reachable from its simlock worker. Check the cable.";
    } else if (worker?.drained) {
      state = "blocked";
      problem = "Its simlock worker is drained.";
    } else if (status.leases?.some((lease) => lease.deviceId === device.id)) {
      state = "in use";
      problem = "Leased by another session. A lease request waits for it.";
    }
    return [
      {
        platform,
        id: device.driverDeviceId,
        name: device.spec?.model ?? "phone",
        osVersion: device.spec?.osVersion ?? "",
        state,
        problem,
      },
    ];
  });

/** Create stateless phone target token from display name and device ID. */
export const toToken = (name: string, id: string) => {
  const slug =
    name
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/gu, "-")
      .replaceAll(/^-|-$/gu, "") || "phone";
  const suffix = id
    .replaceAll(/[^a-z0-9]/giu, "")
    .slice(-4)
    .toLowerCase();
  return `${slug}-${suffix}`;
};

/** Build managed and phone table rows without changing any device state. */
export const buildRows = (input: TargetInput): DeviceRow[] => {
  const { phones } = input;
  const phoneTokens = phones.map((phone) => toToken(phone.name, phone.id));
  const rows: DeviceRow[] = input.managed.map((device) => ({
    option: `--platform=${device.platform}`,
    kind: device.platform === "ios" ? "simulator" : "emulator",
    os: device.platform,
    name: device.name,
    state:
      device.claimedBy && device.claimedBy !== input.repositoryRoot
        ? "in use"
        : device.state,
    problem:
      device.claimedBy && device.claimedBy !== input.repositoryRoot
        ? `Held by ${device.claimedBy}.`
        : "",
    id: device.id,
  }));
  for (const [index, phone] of phones.entries()) {
    const token = phoneTokens[index];
    const useId = phoneTokens.filter((item) => item === token).length > 1;
    rows.push({
      option: useId ? `--target=${phone.id}` : `--target=${token}`,
      kind: "phone",
      os: phone.platform,
      name: `${phone.name} (${phone.osVersion})`,
      state: phone.state,
      problem: phone.problem,
      id: phone.id,
      token,
    });
  }
  const ordered = rows
    .filter((row) => !input.platform || row.os === input.platform)
    .toSorted((a, b) => {
      if (a.kind !== "phone" || b.kind !== "phone") {
        const rank = (row: DeviceRow) => {
          if (row.kind === "simulator") {
            return 0;
          }
          if (row.kind === "emulator") {
            return 1;
          }
          return 2;
        };
        return rank(a) - rank(b);
      }
      return (
        (a.os === "ios" ? 0 : 1) - (b.os === "ios" ? 0 : 1) ||
        (a.token || "").localeCompare(b.token || "")
      );
    });
  return ordered;
};

/** Resolve one phone token or full ID. Duplicate tokens require full IDs. */
export const findPhone = <T extends Pick<Phone, "id" | "name">>(
  phones: T[],
  target: string
): T => {
  const matches = phones.filter(
    (phone) => phone.id === target || toToken(phone.name, phone.id) === target
  );
  if (matches.length > 1) {
    throw new CliError({
      exitCode: 2,
      status: "target_ambiguous",
      message: `Target "${target}" matches more than one phone`,
      why: `Matching IDs: ${matches.map((phone) => phone.id).join(", ")}.`,
      fix: `Pass one full phone ID: ${matches.map((phone) => phone.id).join(" or ")}.`,
    });
  }
  if (matches.length === 0) {
    throw new CliError({
      exitCode: 2,
      status: "target_not_found",
      message: `No connected phone has target "${target}"`,
      why: "No matching phone is connected.",
      fix: "Run `bun devices list` and pass one current phone target. Simulators and emulators use --platform.",
    });
  }
  return matches[0];
};
