import { CliError } from "./shared.ts";
import type { Platform } from "./shared.ts";

/** Agent-device phone identity and optional ownership metadata. */
export interface AgentPhone {
  platform: Platform;
  id: string;
  name: string;
  kind: string;
  target: string;
  claimedBy?: { workspace?: string };
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
  agentDevices: AgentPhone[];
  iosDevices?: IosState[];
  lockStates?: Record<string, boolean | undefined>;
  adbStates?: Record<string, string>;
  /** Active reservations by other checkouts, keyed by phone ID. */
  reservations?: Record<string, { holder: string; expiresAt: string }>;
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
/** Relevant devicectl fields for one iOS phone. */
export interface IosState {
  hardwareProperties?: { udid?: string };
  connectionProperties?: { pairingState?: string; tunnelState?: string };
  deviceProperties?: { bootState?: string; developerModeStatus?: string };
}

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

const phoneProblem = (phone: AgentPhone, input: TargetInput) => {
  if (phone.platform === "ios") {
    const device = input.iosDevices?.find(
      (item) => item.hardwareProperties?.udid === phone.id
    );
    if (!device || device.deviceProperties?.bootState !== "booted") {
      return [
        "phone_offline",
        "Phone not reachable. Connect the phone by cable.",
      ];
    }
    if (device.connectionProperties?.pairingState !== "paired") {
      return [
        "phone_not_paired",
        "Phone does not trust this Mac. Unlock the phone, tap Trust.",
      ];
    }
    if (device.deviceProperties?.developerModeStatus !== "enabled") {
      return [
        "developer_mode_off",
        "Developer Mode off. Turn it on in Settings > Privacy & Security > Developer Mode.",
      ];
    }
    if (input.lockStates?.[phone.id]) {
      return ["phone_locked", "Phone locked. Unlock the phone."];
    }
  } else {
    const state = input.adbStates?.[phone.id];
    if (state === "offline") {
      return [
        "phone_offline",
        "Phone not reachable. Connect the phone by cable.",
      ];
    }
    if (state === "unauthorized") {
      return [
        "phone_unauthorized",
        'USB debugging not allowed. Unlock the phone, accept "Allow USB debugging".',
      ];
    }
  }
  return null;
};

const problemForAdbState = (state: string) => {
  if (state === "unauthorized") {
    return 'USB debugging not allowed. Unlock the phone, accept "Allow USB debugging".';
  }
  return "Phone not reachable. Connect the phone by cable.";
};

/** Build managed and phone table rows without changing any device state. */
export const buildRows = (input: TargetInput): DeviceRow[] => {
  const phones = input.agentDevices.filter(
    (device) =>
      device.kind === "device" &&
      device.target === "mobile" &&
      (device.platform === "ios" || device.platform === "android")
  );
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
    const problem = phoneProblem(phone, input);
    const heldBy = phone.claimedBy?.workspace;
    const reservation = input.reservations?.[phone.id];
    let state = "ready";
    let why = problem?.[1] ?? "";
    if (problem) {
      state = "blocked";
    }
    if (heldBy && heldBy !== input.repositoryRoot) {
      state = "in use";
      why = `Held by ${heldBy}.`;
    } else if (reservation) {
      state = "in use";
      why = `Reserved by ${reservation.holder} until ${reservation.expiresAt}.`;
    }
    rows.push({
      option: useId ? `--target=${phone.id}` : `--target=${token}`,
      kind: "phone",
      os: phone.platform,
      name: phone.name,
      state,
      problem: why,
      id: phone.id,
      token,
    });
  }
  for (const [id, state] of Object.entries(input.adbStates ?? {})) {
    if (id.startsWith("emulator-") || phones.some((phone) => phone.id === id)) {
      continue;
    }
    if (state === "offline" || state === "unauthorized") {
      rows.push({
        option: "-",
        kind: "phone",
        os: "android",
        name: "unknown",
        state: "blocked",
        problem: problemForAdbState(state),
        id,
      });
    }
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
export const findPhone = <T extends AgentPhone>(
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
