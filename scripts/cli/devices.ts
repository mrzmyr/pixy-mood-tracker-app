// `bun devices`: devices agent-device can drive, with the IDs and names that
// `--device` accepts. `bunx agent-device devices` prints names only.
import { listAgentDevices } from "./agent-device.ts";
import {
  PLATFORM_OPTION,
  defineCommand,
  getPlatform,
  printTable,
} from "./shared.ts";
import type { Noun, Platform } from "./shared.ts";

const cmdDevicesList = async (
  platform: Platform | undefined,
  isJson: boolean
) => {
  const all = await listAgentDevices();
  const devices = all.filter(
    (device) => !platform || device.platform === platform
  );
  if (isJson) {
    console.log(JSON.stringify(devices, null, 2));
    return;
  }
  if (devices.length === 0) {
    console.log(
      "No devices. Connect and unlock a phone, or create a simulator: `bun simulators create --platform <ios|android>`."
    );
    return;
  }
  printTable(
    ["ID", "NAME", "OS", "KIND", "BOOTED"],
    devices.map((device) => [
      device.id,
      device.name,
      device.platform,
      device.kind === "device" ? "physical" : device.kind,
      device.booted ? "yes" : "no",
    ])
  );
};

const DEVICES: Noun = {
  commands: {
    list: defineCommand({
      details: `--platform ios|android  Only this platform.
--json                  Print JSON instead of a table.

Pass the ID or the name to \`--device\` of \`bun app\` and \`bun e2e\`.`,
      options: { ...PLATFORM_OPTION, json: { type: "boolean" } },
      run: (_args, values) =>
        cmdDevicesList(getPlatform(values.platform), values.json ?? false),
      summary: "List devices with the ID and name `--device` accepts",
    }),
  },
  footer:
    "Boot and shut down: `bunx agent-device boot`, `bunx agent-device shutdown`.",
  summary: "List phones, simulators, and emulators agent-device can drive.",
};

/** `bun devices` commands. */
export { DEVICES };
