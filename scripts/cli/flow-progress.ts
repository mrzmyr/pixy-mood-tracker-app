// Prints each finished flow step while `agent-device test` runs. agent-device
// prints one line per flow after the flow ends; its step log is the only live
// signal.
import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

const TIMING_FILE = "replay-timing.ndjson";
const POLL_MS = 1000;
const NEWLINE = 0x0a;

const stepSchema = z.object({
  type: z.literal("replay_action_stop"),
  replayPath: z.string(),
  step: z.number(),
  command: z.string(),
  ok: z.boolean(),
  durationMs: z.number(),
  errorCode: z.string().optional(),
});

/** One line for a finished step, or null for every other event. */
export const formatStep = (line: string) => {
  let json: unknown;
  try {
    json = JSON.parse(line);
  } catch {
    return null;
  }
  const result = stepSchema.safeParse(json);
  if (!result.success) {
    return null;
  }
  const { command, durationMs, errorCode, ok, replayPath, step } = result.data;
  const state = ok ? "ok" : `FAIL ${errorCode ?? "unknown"}`;
  return `  ${path.basename(replayPath)} #${step} ${command} ${state} ${durationMs}ms`;
};

const listTimingFiles = (dir: string) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { encoding: "utf-8", recursive: true })
        .filter((entry) => path.basename(entry) === TIMING_FILE)
        .map((entry) => path.join(dir, entry))
    : [];

/** Reads step logs created after this call and passes finished steps to `write`. */
export const createProgressReader = (
  dir: string,
  write: (line: string) => void
) => {
  // Step logs of older runs stay in the artifacts folder.
  const old = new Set(listTimingFiles(dir));
  const offsets = new Map<string, number>();
  const poll = () => {
    for (const file of listTimingFiles(dir)) {
      if (old.has(file)) {
        continue;
      }
      let content: Buffer;
      try {
        content = fs.readFileSync(file);
      } catch {
        continue;
      }
      const offset = offsets.get(file) ?? 0;
      // Read whole lines only, so no line and no character is cut in half.
      const end = content.lastIndexOf(NEWLINE) + 1;
      if (end <= offset) {
        continue;
      }
      offsets.set(file, end);
      for (const line of content.subarray(offset, end).toString().split("\n")) {
        const step = formatStep(line);
        if (step) {
          write(step);
        }
      }
    }
  };
  let timer: ReturnType<typeof setInterval> | null = null;
  return {
    poll,
    start() {
      timer = setInterval(poll, POLL_MS);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
      }
      poll();
    },
  };
};
