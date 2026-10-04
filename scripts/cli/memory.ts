import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

import { CliError, note } from "./shared.ts";

const GIB = 1024 ** 3;
const RESERVE_BYTES = 4 * GIB;

const readNumber = (value: string | undefined) => {
  const number = Number(value);
  if (
    value === undefined ||
    value.trim() === "" ||
    !Number.isSafeInteger(number) ||
    number < 0
  ) {
    throw new CliError({
      status: "memory_stats_invalid",
      message: "Could not read RAM headroom",
      why: "System memory statistics contain a missing or invalid number.",
      fix: "Check system memory manually before starting another session.",
    });
  }
  return number;
};

const readMacMemory = () => {
  const output = execFileSync("/usr/bin/vm_stat", [], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 2000,
  });
  const [header, ...lines] = output.split("\n");
  const pageSize = readNumber(
    header?.match(/page size of (?<bytes>[1-9]\d*) bytes/u)?.groups?.bytes
  );
  const pages = new Map(
    lines.map((line) => {
      const [name, value] = line.split(":");
      return [name, value?.trim().replace(/\.$/u, "")] as const;
    })
  );
  const free = readNumber(pages.get("Pages free")) * pageSize;
  // vm_stat prints free pages separately from speculative pages. Inactive
  // pages may need writeback, so label this sum as an estimate, not a guarantee.
  // https://github.com/apple-oss-distributions/xnu/blob/main/osfmk/mach/vm_statistics.h
  const available =
    free +
    (readNumber(pages.get("Pages inactive")) +
      readNumber(pages.get("Pages speculative"))) *
      pageSize;
  return {
    available,
    free,
    total: os.totalmem(),
    source: "free + inactive + speculative",
  };
};

const readMemory = () => {
  if (process.platform === "darwin") {
    return readMacMemory();
  }
  if (process.platform === "linux") {
    const fields = new Map(
      fs
        .readFileSync("/proc/meminfo", "utf-8")
        .split("\n")
        .map((line) => {
          const [name, value] = line.split(":");
          return [name, value?.trim().split(/\s+/u)[0]] as const;
        })
    );
    // MemAvailable includes reclaimable cache, unlike MemFree.
    // https://docs.kernel.org/filesystems/proc.html
    return {
      available: readNumber(fields.get("MemAvailable")) * 1024,
      free: readNumber(fields.get("MemFree")) * 1024,
      total: readNumber(fields.get("MemTotal")) * 1024,
      source: "MemAvailable",
    };
  }
  const free = os.freemem();
  return {
    available: free,
    free,
    total: os.totalmem(),
    source: "free RAM only",
  };
};

const formatBytes = (bytes: number) => `${(bytes / GIB).toFixed(1)} GiB`;

/** Report host RAM to stderr. Measurement failure never prevents command execution. */
export const reportMemory = (phase: "before" | "after") => {
  try {
    const { available, free, total, source } = readMemory();
    const budget = Math.max(0, available - RESERVE_BYTES);
    note(
      `RAM ${phase}: ${formatBytes(available)} available estimate (${source}), ${formatBytes(free)} free / ${formatBytes(total)} total. Keep ${formatBytes(RESERVE_BYTES)} headroom; ${formatBytes(budget)} above reserve.`
    );
    if (available <= RESERVE_BYTES) {
      note(
        "RAM low: wait before starting another session. Finish existing work or close unused sessions first."
      );
    }
  } catch (error) {
    const fields =
      error instanceof CliError
        ? error
        : new CliError({
            status: "memory_stats_failed",
            message: "Could not read RAM headroom",
            why: "System memory statistics are unavailable on this host.",
            fix: "Check system memory manually before starting another session.",
          });
    note(
      `warning [${fields.status}]: ${fields.message}\n  why: ${fields.why}\n  fix: ${fields.fix}`
    );
  }
};
