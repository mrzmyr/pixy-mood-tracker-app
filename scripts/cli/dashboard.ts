// `bun dashboard`: a local web view of devices, e2e sessions, and cached
// builds. Serves dashboard.html, a JSON snapshot of the state the CLIs read,
// session logs, reports, and recordings. Actions run the same CLI commands
// (`bun builds prune`, `bun sessions kill`, ...) so behavior never diverges.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { listBuilds, toBuildId } from "./builds.ts";
import { listDevices, readInstall, readLeases } from "./devices.ts";
import {
  getStaleReason,
  readBuildFromLog,
  readSessions,
} from "./session-store.ts";
import {
  CliError,
  DEFAULT_MAX_AGE,
  parseDuration,
  readJson,
} from "./shared.ts";
import type { Session, SessionBuild } from "./shared.ts";

interface ReportFlow {
  name: string;
  sourceFile: string;
  status: string;
  duration?: number;
  assetsDir?: string;
}

interface Report {
  summary?: Record<string, number>;
  flows?: ReportFlow[];
  device?: { osVersion?: string };
  app?: { id?: string; version?: string; build?: string };
  maestroRunner?: { version?: string; driver?: string };
}

const DEFAULT_PORT = 4848;
const HTML_FILE = path.join(import.meta.dir, "dashboard.html");
const CLI_FILE = path.join(import.meta.dir, "index.ts");
const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const PR_CACHE_MS = 60_000;
// Device, session, and build IDs: UUIDs, serials, emulator-5554, avd:name.
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

const errorResponse = (httpStatus: number, fields: ErrorFields) =>
  Response.json(fields, { status: httpStatus });

const sessionBuilds = new Map<string, SessionBuild>();

// Sessions record their build since `bun sessions run` saves it; older ones
// fall back to their log, parsed once after they finish.
const getSessionBuild = (session: Session) => {
  if (session.build) {
    return session.build;
  }
  const cached = sessionBuilds.get(session.id);
  if (cached && session.finishedAt) {
    return cached;
  }
  const build = readBuildFromLog(session.logFile);
  sessionBuilds.set(session.id, build);
  return build;
};

// Adds the maestro-runner report summary, per-flow recordings, and the
// build and device the session used.
const describeSession = (session: Session, maxAgeMs: number) => {
  const report = readJson<Report>(path.join(session.reportDir, "report.json"));
  const flows = (report?.flows ?? []).map((flow) => {
    const video = flow.assetsDir
      ? path.join(flow.assetsDir, "recording.mp4")
      : null;
    return {
      duration: flow.duration ?? null,
      name: flow.name,
      sourceFile: flow.sourceFile,
      status: flow.status,
      video:
        video && fs.existsSync(path.join(session.reportDir, video))
          ? video
          : null,
    };
  });
  const build = getSessionBuild(session);
  return {
    ...session,
    app: report?.app ?? null,
    build: {
      ...build,
      id: build.key ? toBuildId(build.key) : null,
    },
    flowResults: flows,
    osVersion: report?.device?.osVersion ?? null,
    runner: report?.maestroRunner ?? null,
    hasReport: fs.existsSync(path.join(session.reportDir, "report.html")),
    staleReason: getStaleReason(session, maxAgeMs),
    summary: report?.summary ?? null,
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

const getState = () => {
  void refreshPullRequests();
  const maxAgeMs = parseDuration(DEFAULT_MAX_AGE);
  const sessions = readSessions()
    .toReversed()
    .map((session) => describeSession(session, maxAgeMs));
  const leases = new Map(readLeases().map((lease) => [lease.deviceId, lease]));
  const devices = listDevices().map((device) => {
    const install = readInstall(device.id);
    return {
      ...device,
      install: install ? { ...install, id: toBuildId(install.key) } : null,
      lease: leases.get(device.id) ?? null,
      sessionId:
        sessions.find(
          (session) =>
            session.deviceId === device.id &&
            (session.status === "building" || session.status === "running")
        )?.id ?? null,
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

const findSession = (id: string) =>
  readSessions().find((session) => session.id === id) ?? null;

// Serves a file from inside `root` only; rejects paths that escape it.
const serveFile = (root: string, relative: string) => {
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${path.resolve(root)}${path.sep}`)) {
    return errorResponse(400, {
      fix: "Use a link from the dashboard.",
      message: "Invalid file path",
      status: "invalid_path",
      why: `${relative} points outside the session report.`,
    });
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return errorResponse(404, {
      fix: "Run `bun sessions list --all` to check the session still exists.",
      message: "File not found",
      status: "file_not_found",
      why: `${relative} does not exist in the session report.`,
    });
  }
  return new Response(Bun.file(file));
};

const handleSession = (url: URL) => {
  // /sessions/<id>/<kind>/<file...>
  const [id = "", kind = "", ...rest] = url.pathname.split("/").slice(2);
  const session = findSession(decodeURIComponent(id));
  if (!session) {
    return errorResponse(404, {
      fix: "Run `bun sessions list --all` to find a session ID.",
      message: `Session ${id} not found`,
      status: "session_not_found",
      why: "No session record has this ID. `bun sessions gc` removes sessions after 7 days.",
    });
  }
  if (kind === "log") {
    return fs.existsSync(session.logFile)
      ? new Response(Bun.file(session.logFile), {
          headers: { "content-type": "text/plain; charset=utf-8" },
        })
      : errorResponse(404, {
          fix: "Rerun the session to create a new log.",
          message: "Log not found",
          status: "log_not_found",
          why: `${session.logFile} does not exist.`,
        });
  }
  if (kind === "report") {
    return serveFile(
      session.reportDir,
      decodeURIComponent(rest.join("/") || "report.html")
    );
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
const focusDevice = async (id: string) => {
  const device = listDevices().find((candidate) => candidate.id === id);
  if (!device || device.kind === "physical" || device.state !== "booted") {
    return errorResponse(400, {
      fix: "Boot the device with `bun devices boot <id>` first.",
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

const ACTIONS = new Map<string, (id: string) => Promise<Response>>([
  ["builds/prune", () => runCli(["builds", "prune"])],
  ["builds/rm", (id) => runCli(["builds", "rm", id])],
  ["devices/focus", focusDevice],
  ["devices/shutdown", (id) => runCli(["devices", "shutdown", id])],
  ["sessions/kill", (id) => runCli(["sessions", "kill", id])],
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
    return Response.json(getState(), {
      headers: { "cache-control": "no-store" },
    });
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
    why: "The dashboard serves /, /api/state, POST /api/<noun>/<verb>, and /sessions/<id>/log|report.",
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
        return errorResponse(500, {
          fix: "Reload the page. If it fails again, run `bun devices list` to see the underlying error.",
          message: error instanceof Error ? error.message : String(error),
          status: "state_read_failed",
          why: "Reading devices, sessions, or builds failed.",
        });
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
