// Probe Apple's device service. When it wedges, every devicectl call hangs.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CliError } from "./shared.ts";

const PROBE_TIMEOUT_MS = 20_000;
const RESTART = "pkill -f CoreDeviceService.xpc";

/** Run one probe command. Throws core_device_service_wedged when it does not exit in time. */
export const probeDeviceService = ({
  command,
  args,
  timeoutMs = PROBE_TIMEOUT_MS,
}: {
  command: string;
  args: string[];
  timeoutMs?: number;
}) => {
  const start = Date.now();
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    stdio: ["ignore", "ignore", "pipe"],
    timeout: timeoutMs,
    killSignal: "SIGKILL",
  });
  // SAFETY: spawnSync sets error only to a Node system error with `code`.
  const error = result.error as NodeJS.ErrnoException | undefined;
  if (error?.code === "ETIMEDOUT") {
    throw new CliError({
      status: "core_device_service_wedged",
      message: "Apple's device service does not answer",
      why: `\`${[command, ...args.slice(0, 3)].join(" ")}\` did not exit within ${timeoutMs / 1000} seconds. Every devicectl call hangs, and phones report "Device is busy".`,
      fix: `Run \`${RESTART}\`. macOS starts it again. It interrupts phone work in every other checkout and session, so check \`bun devices menubar\` for reservations first. If the probe still hangs, reconnect the cable.`,
    });
  }
  if (error || result.status !== 0) {
    throw new CliError({
      status: "devicectl_failed",
      message: `${path.basename(command)} ${args.slice(0, 3).join(" ")} failed`,
      why:
        error?.message ??
        (result.stderr.trim() || `Exited with ${result.status}.`),
      fix: "Install Xcode command line tools with `xcode-select --install`, then retry.",
    });
  }
  return Date.now() - start;
};

/** Check that devicectl answers. Prints the probe time on success. */
export const doctor = () => {
  if (process.platform !== "darwin") {
    console.log("devicectl skipped: not macOS");
    return;
  }
  const file = path.join(
    os.tmpdir(),
    `pixy-mood-tracker-doctor-${process.pid}.json`
  );
  try {
    const ms = probeDeviceService({
      command: "xcrun",
      args: ["devicectl", "list", "devices", "--json-output", file],
    });
    console.log(`devicectl ok in ${(ms / 1000).toFixed(1)}s`);
  } finally {
    fs.rmSync(file, { force: true });
  }
};
