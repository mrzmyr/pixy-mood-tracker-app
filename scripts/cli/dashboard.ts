// `bun dashboard`: a local web view of devices, e2e runs, and cached builds.
// Devices and their owners come from agent-device (`devices`, `device status`),
// e2e runs from the run.json that scripts/cli/e2e-reporter.mjs writes into
// each worktree's .agent-device/test-artifacts, and builds from `bun builds`.
// Actions run the same commands (`bun builds prune`, `agent-device close`, ...)
// so behavior never diverges.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { listBuilds } from "./builds.ts";
import { CliError, isProcessAlive, readJson, tryRun } from "./shared.ts";

type Platform = "ios" | "android";

interface RunFlow {
  artifactsDir: string;
  attempts: number;
  durationMs: number | null;
  file: string;
  message: string | null;
  status: string;
  video: string | null;
}

// Written by scripts/cli/e2e-reporter.mjs.
interface Run {
  branch: string;
  deviceId: string | null;
  finishedAt: string | null;
  flows: RunFlow[];
  id: string;
  pid: number;
  platform: Platform | null;
  startedAt: string;
  status: "running" | "passed" | "failed";
  worktree: string;
}

interface AgentDevice {
  id: string;
  name: string;
  platform: string;
  kind: "simulator" | "emulator" | "device";
  booted?: boolean;
}

interface Claim {
  classification: string;
  device: AgentDevice;
  owner: { session: string; workspace: string; pid: number; startTime: string };
}

const DEFAULT_PORT = 4848;
const HTML_FILE = path.join(import.meta.dir, "dashboard.html");
const CLI_FILE = path.join(import.meta.dir, "index.ts");
const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const AGENT_DEVICE = path.join(
  REPO_ROOT,
  "node_modules",
  ".bin",
  "agent-device"
);
const ARTIFACTS_DIR = path.join(".agent-device", "test-artifacts");
const PR_CACHE_MS = 60_000;
// Device IDs, run IDs, and agent-device session addresses
// (cwd:<hash>:android, UUIDs, serials, emulator-5554).
const SAFE_ID = /^[\w.:-]+$/u;
// Browsers send this header only from same-origin scripts; cross-site pages
// would need a CORS preflight, which this server never answers.
const ACTION_HEADER = "x-pixy-mood-tracker-dashboard";

interface PullRequest {
  number: number;
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  headRefName: string;
}

interface ErrorFields {
  status: string;
  message: string;
  why: string;
  fix: string;
}

// Copies the fields; Error#message is not enumerable, so CliError alone
// would serialize without it.
const errorResponse = (
  httpStatus: number,
  { fix, message, status, why }: ErrorFields
) => Response.json({ fix, message, status, why }, { status: httpStatus });

// Runs agent-device with --json and returns its data, or throws its error.
const agentDevice = async <T>(args: string[]): Promise<T> => {
  const child = Bun.spawn([AGENT_DEVICE, ...args, "--json"], {
    cwd: REPO_ROOT,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  let body: {
    success?: boolean;
    data?: T;
    error?: { code?: string; message?: string; hint?: string };
  } | null = null;
  try {
    // SAFETY: agent-device --json prints one { success, data | error } object.
    body = JSON.parse(stdout);
  } catch {
    body = null;
  }
  if (body?.success && body.data !== undefined) {
    return body.data;
  }
  throw new CliError({
    fix:
      body?.error?.hint ??
      `Run \`bunx agent-device ${args.join(" ")}\` in a terminal to see the full output.`,
    message: body?.error?.message ?? `agent-device ${args[0]} failed`,
    status: body?.error?.code?.toLowerCase() ?? "agent_device_failed",
    why: stderr.trim() || "agent-device returned no JSON result.",
  });
};

// Every checkout of this repo, so runs from all worktrees show up.
const listWorktrees = () =>
  (tryRun("git", ["-C", REPO_ROOT, "worktree", "list", "--porcelain"]) ?? "")
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length));

const runDir = (run: Run) => path.join(run.worktree, ARTIFACTS_DIR, run.id);

const readRuns = () =>
  listWorktrees().flatMap((worktree) => {
    const root = path.join(worktree, ARTIFACTS_DIR);
    return fs.existsSync(root)
      ? fs
          .readdirSync(root)
          .map((id) => readJson<Run>(path.join(root, id, "run.json")))
          .filter((run): run is Run => run !== null)
      : [];
  });

const toKind = (device: AgentDevice) =>
  device.kind === "device" ? "physical" : device.kind;

const toState = (device: AgentDevice) => {
  if (device.kind === "device") {
    return "connected";
  }
  return device.booted ? "booted" : "shutdown";
};

// A run whose CLI process died never wrote its final status.
const getStaleReason = (run: Run) =>
  run.status === "running" && !isProcessAlive(run.pid)
    ? "its agent-device process exited without a result"
    : null;

// Adds device details and the per-flow results the dashboard renders.
const describeRun = (run: Run, devices: AgentDevice[]) => {
  const device = devices.find((candidate) => candidate.id === run.deviceId);
  return {
    branch: run.branch,
    deviceId: run.deviceId ?? "",
    deviceName: device?.name ?? run.deviceId ?? "Auto-selected device",
    finishedAt: run.finishedAt,
    flowResults: run.flows.map((flow) => ({
      duration: flow.durationMs,
      name: path.basename(flow.file),
      result: path.join(
        flow.artifactsDir,
        `attempt-${flow.attempts || 1}`,
        "result.txt"
      ),
      sourceFile: flow.file,
      status: flow.status,
      video: flow.video,
    })),
    flows: run.flows.map((flow) => flow.file),
    id: run.id,
    kind: device ? toKind(device) : "simulator",
    platform: run.platform ?? device?.platform ?? "ios",
    staleReason: getStaleReason(run),
    startedAt: run.startedAt,
    status: run.status,
    worktree: run.worktree,
  };
};

// Branch -> newest pull request, refreshed in the background from `gh`.
const pullRequests = {
  byBranch: new Map<string, PullRequest>(),
  fetchedAt: 0,
  isFetching: false,
};

const refreshPullRequests = async () => {
  if (
    pullRequests.isFetching ||
    Date.now() - pullRequests.fetchedAt < PR_CACHE_MS
  ) {
    return;
  }
  pullRequests.isFetching = true;
  try {
    const child = Bun.spawn(
      [
        "gh",
        "pr",
        "list",
        "--state",
        "all",
        "--limit",
        "200",
        "--json",
        "number,url,state,isDraft,headRefName",
      ],
      { cwd: REPO_ROOT, stderr: "ignore", stdout: "pipe" }
    );
    const output = await new Response(child.stdout).text();
    if ((await child.exited) === 0) {
      // SAFETY: shape requested with --json above.
      const list = JSON.parse(output) as PullRequest[];
      // gh lists newest first; keep the newest PR per branch.
      pullRequests.byBranch = new Map(
        list.toReversed().map((pr) => [pr.headRefName, pr])
      );
    }
  } catch {
    // gh missing or offline: keep the last known links.
  } finally {
    pullRequests.fetchedAt = Date.now();
    pullRequests.isFetching = false;
  }
};

const getState = async () => {
  void refreshPullRequests();
  const [{ devices: all }, { claims }] = await Promise.all([
    agentDevice<{ devices: AgentDevice[] }>(["devices"]),
    agentDevice<{ claims: Claim[] }>(["device", "status"]),
  ]);
  // agent-device also lists the Mac itself and TV targets.
  const found = all.filter(
    (device) => device.platform === "ios" || device.platform === "android"
  );
  const sessions = readRuns()
    .map((run) => describeRun(run, found))
    .toSorted((a, b) => b.startedAt.localeCompare(a.startedAt));
  const devices = found.map((device) => {
    const claim = claims.find((candidate) => candidate.device.id === device.id);
    // Test sessions are named <workspace>:<platform>:test:<run-id>:...
    const runId = claim?.owner.session.split(":test:")[1]?.split(":")[0];
    return {
      claim: claim
        ? {
            classification: claim.classification,
            session: claim.owner.session,
            since: new Date(claim.owner.startTime).toISOString(),
            worktree: claim.owner.workspace,
          }
        : null,
      id: device.id,
      kind: toKind(device),
      name: device.name,
      platform: device.platform,
      sessionId: runId ?? null,
      state: toState(device),
    };
  });
  const builds = listBuilds().toSorted((a, b) =>
    b.lastUsedAt.localeCompare(a.lastUsedAt)
  );
  return {
    builds,
    devices,
    generatedAt: new Date().toISOString(),
    pullRequests: Object.fromEntries(pullRequests.byBranch),
    sessions,
  };
};

const findRun = (id: string) => readRuns().find((run) => run.id === id) ?? null;

// Serves a file from inside `root` only; rejects paths that escape it.
const serveFile = (root: string, relative: string) => {
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${path.resolve(root)}${path.sep}`)) {
    return errorResponse(400, {
      fix: "Use a link from the dashboard.",
      message: "Invalid file path",
      status: "invalid_path",
      why: `${relative} points outside the run's artifacts.`,
    });
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return errorResponse(404, {
      fix: "Rerun the flow with `bun e2e`. Delete .agent-device/test-artifacts to drop old runs.",
      message: "File not found",
      status: "file_not_found",
      why: `${relative} does not exist in the run's artifacts.`,
    });
  }
  return new Response(Bun.file(file), {
    headers:
      file.endsWith(".txt") || file.endsWith(".json")
        ? { "content-type": "text/plain; charset=utf-8" }
        : {},
  });
};

const handleSession = (url: URL) => {
  // /sessions/<run-id>/<kind>/<file...>
  const [id = "", kind = "", ...rest] = url.pathname.split("/").slice(2);
  const run = findRun(decodeURIComponent(id));
  if (!run) {
    return errorResponse(404, {
      fix: "Reload the dashboard to see the current runs.",
      message: `Run ${id} not found`,
      status: "run_not_found",
      why: "No worktree has a run.json for this ID in .agent-device/test-artifacts.",
    });
  }
  if (kind === "log") {
    return serveFile(runDir(run), "run.json");
  }
  if (kind === "report") {
    return serveFile(runDir(run), decodeURIComponent(rest.join("/")));
  }
  return null;
};

// Runs `bun <noun> <verb> [args]` and maps its error output back to fields.
const runCli = async (args: string[]) => {
  const child = Bun.spawn(["bun", CLI_FILE, ...args], {
    cwd: REPO_ROOT,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode === 0) {
    return Response.json({ output: stdout.trim() });
  }
  const match =
    /error \[(?<status>[^\]]+)\]: (?<message>.*)\n\s+why: (?<why>.*)\n\s+fix: (?<fix>.*)/u.exec(
      stderr
    );
  return errorResponse(
    500,
    match?.groups
      ? {
          fix: match.groups.fix,
          message: match.groups.message,
          status: match.groups.status,
          why: match.groups.why,
        }
      : {
          fix: `Run \`bun ${args.join(" ")}\` in a terminal to see the full output.`,
          message: `bun ${args.slice(0, 2).join(" ")} failed`,
          status: "cli_failed",
          why: stderr.trim() || `Exited with code ${exitCode}.`,
        }
  );
};

// AppleScript run with argv, so names are never spliced into the script.
const FOCUS_SCRIPT = `on run argv
  set needle to item 1 of argv
  tell application "System Events"
    set procNames to name of every process
    repeat with i from 1 to count of procNames
      set procName to item i of procNames
      if procName is "Simulator" or procName starts with "qemu-system" then
        set p to process i
        repeat with j from 1 to (count of windows of p)
          try
            set w to window j of p
            if (name of w as text) contains needle then
              set frontmost of p to true
              perform action "AXRaise" of w
              delay 0.2
              if not frontmost of p then set frontmost of p to true
              return "ok"
            end if
          end try
        end repeat
      end if
    end repeat
  end tell
  return "missing"
end run`;

// Brings a simulator or emulator window to the front.
const findDevice = async (id: string) => {
  const { devices } = await agentDevice<{ devices: AgentDevice[] }>([
    "devices",
  ]);
  return devices.find((candidate) => candidate.id === id) ?? null;
};

const focusDevice = async (id: string) => {
  const found = await findDevice(id);
  const device = found
    ? { ...found, kind: toKind(found), state: toState(found) }
    : null;
  if (!device || device.kind === "physical" || device.state !== "booted") {
    return errorResponse(400, {
      fix: "Boot the device with `bunx agent-device boot --platform <ios|android> --device <name>` first.",
      message: "Device has no window",
      status: "focus_unavailable",
      why: "Only booted simulators and emulators have a window to show.",
    });
  }
  // Simulator titles windows "<name> – iOS 26.4"; the emulator uses
  // "Android Emulator - <avd>:<port>".
  const needle =
    device.platform === "ios"
      ? `${device.name.replace(/ \(iOS [\d.]+\)$/u, "")} – `
      : `:${device.id.replace("emulator-", "")}`;
  const child = Bun.spawn(["osascript", "-e", FOCUS_SCRIPT, needle], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (stdout.trim() === "ok") {
    return Response.json({ output: `Showing ${device.name}` });
  }
  return errorResponse(stderr ? 500 : 404, {
    fix: stderr
      ? "Allow your terminal under System Settings > Privacy & Security > Accessibility."
      : "The emulator may run without a window (-no-window). Restart it with a window.",
    message: `No window found for ${device.name}`,
    status: stderr ? "focus_denied" : "window_not_found",
    why:
      stderr.trim() ||
      `No Simulator or emulator window title contains "${needle}".`,
  });
};

// Runs an agent-device action and maps its result to a response.
const runAgentDevice = async (args: string[], output: string) => {
  try {
    await agentDevice(args);
    return Response.json({ output });
  } catch (error) {
    return errorResponse(
      500,
      error instanceof CliError
        ? error
        : {
            fix: `Run \`bunx agent-device ${args.join(" ")}\` in a terminal.`,
            message: String(error),
            status: "agent_device_failed",
            why: "agent-device could not run.",
          }
    );
  }
};

// Shuts down an idle simulator or emulator. agent-device refuses devices a
// session still holds; release those first.
const shutdownDevice = async (id: string) => {
  const device = await findDevice(id);
  if (!device) {
    return errorResponse(404, {
      fix: "Reload the dashboard to see the current devices.",
      message: `Device ${id} not found`,
      status: "device_not_found",
      why: "agent-device does not list this device.",
    });
  }
  const selector = device.platform === "ios" ? "--udid" : "--serial";
  return runAgentDevice(
    ["shutdown", "--platform", device.platform, selector, id],
    `Shut down ${device.name}`
  );
};

// Stops a running `bun e2e` the same way Ctrl+C does.
const killRun = (id: string) => {
  const run = findRun(id);
  if (!run || run.status !== "running" || !isProcessAlive(run.pid)) {
    return Promise.resolve(
      errorResponse(404, {
        fix: "Reload the dashboard. Finished runs cannot be stopped.",
        message: `No running e2e run ${id}`,
        status: "run_not_running",
        why: "The run finished or its agent-device process already exited.",
      })
    );
  }
  process.kill(run.pid, "SIGINT");
  return Promise.resolve(Response.json({ output: `Stopping run ${id}` }));
};

const ACTIONS = new Map<string, (id: string) => Promise<Response>>([
  ["builds/prune", () => runCli(["builds", "prune"])],
  ["builds/rm", (id) => runCli(["builds", "rm", id])],
  ["devices/focus", focusDevice],
  [
    "devices/release",
    (address) =>
      runAgentDevice(["close", "--session", address], `Released ${address}`),
  ],
  ["devices/shutdown", shutdownDevice],
  ["sessions/kill", killRun],
]);

// POST /api/<noun>/<verb>[/<id>]
const handleAction = (request: Request, url: URL) => {
  const origin = request.headers.get("origin");
  if (
    request.headers.get(ACTION_HEADER) !== "1" ||
    (origin !== null && origin !== url.origin)
  ) {
    return errorResponse(403, {
      fix: "Use the buttons in the dashboard.",
      message: "Action rejected",
      status: "action_forbidden",
      why: "Actions only run from the dashboard page itself.",
    });
  }
  const [noun = "", verb = "", rawId = ""] = url.pathname
    .split("/")
    .slice(2)
    .map(decodeURIComponent);
  const action = ACTIONS.get(`${noun}/${verb}`);
  if (!action || (rawId !== "" && !SAFE_ID.test(rawId))) {
    return errorResponse(404, {
      fix: "Use the buttons in the dashboard.",
      message: `Unknown action ${noun}/${verb}`,
      status: "unknown_action",
      why: "The action or ID is not supported.",
    });
  }
  return action(rawId);
};

const handle = (request: Request) => {
  const url = new URL(request.url);
  if (url.pathname === "/") {
    return new Response(Bun.file(HTML_FILE), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (request.method === "POST" && url.pathname.startsWith("/api/")) {
    return handleAction(request, url);
  }
  if (url.pathname === "/api/state") {
    return getState().then((state) =>
      Response.json(state, { headers: { "cache-control": "no-store" } })
    );
  }
  if (url.pathname.startsWith("/sessions/")) {
    const response = handleSession(url);
    if (response) {
      return response;
    }
  }
  return errorResponse(404, {
    fix: "Open the dashboard at /.",
    message: `No route for ${url.pathname}`,
    status: "not_found",
    why: "The dashboard serves /, /api/state, POST /api/<noun>/<verb>, and /sessions/<run-id>/log|report.",
  });
};

const getPort = () => {
  const { values } = parseArgs({
    options: { port: { default: String(DEFAULT_PORT), type: "string" } },
  });
  const port = Number(values.port);
  if (!Number.isInteger(port) || port <= 0) {
    throw new CliError({
      fix: `Pass a port number, for example --port ${DEFAULT_PORT}.`,
      message: `Invalid port "${values.port}"`,
      status: "invalid_port",
      why: "The port must be a positive integer.",
    });
  }
  return port;
};

try {
  const server = Bun.serve({
    fetch: async (request) => {
      try {
        return await handle(request);
      } catch (error) {
        return errorResponse(
          500,
          error instanceof CliError
            ? error
            : {
                fix: "Reload the page. If it fails again, run `bunx agent-device devices` to see the underlying error.",
                message: error instanceof Error ? error.message : String(error),
                status: "state_read_failed",
                why: "Reading devices, e2e runs, or builds failed.",
              }
        );
      }
    },
    // Local state and file paths only; never expose beyond this machine.
    hostname: "127.0.0.1",
    port: getPort(),
  });
  console.log(`Dashboard: ${server.url}`);
} catch (error) {
  const fields =
    error instanceof CliError
      ? error
      : {
          fix: "Pass another port with --port.",
          message: error instanceof Error ? error.message : String(error),
          status: "server_start_failed",
          why: "The port is probably in use by another dashboard.",
        };
  console.error(
    `error [${fields.status}]: ${fields.message}\n  why: ${fields.why}\n  fix: ${fields.fix}`
  );
  process.exitCode = 1;
}
