// `bun dashboard`: a local read-only web view of devices, e2e sessions, and
// cached builds. Serves dashboard.html and a JSON snapshot of the same state
// the CLIs read, plus session logs, reports, and recordings.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { listBuilds } from "./builds.ts";
import { listDevices, readLeases } from "./devices.ts";
import { getStaleReason, readSessions } from "./session-store.ts";
import {
  CliError,
  DEFAULT_MAX_AGE,
  parseDuration,
  readJson,
} from "./shared.ts";
import type { Session } from "./shared.ts";

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
}

const DEFAULT_PORT = 4848;
const HTML_FILE = path.join(import.meta.dir, "dashboard.html");

interface ErrorFields {
  status: string;
  message: string;
  why: string;
  fix: string;
}

const errorResponse = (httpStatus: number, fields: ErrorFields) =>
  Response.json(fields, { status: httpStatus });

// Adds the maestro-runner report summary and per-flow recordings.
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
  return {
    ...session,
    flowResults: flows,
    hasReport: fs.existsSync(path.join(session.reportDir, "report.html")),
    staleReason: getStaleReason(session, maxAgeMs),
    summary: report?.summary ?? null,
  };
};

const getState = () => {
  const maxAgeMs = parseDuration(DEFAULT_MAX_AGE);
  const sessions = readSessions()
    .toReversed()
    .map((session) => describeSession(session, maxAgeMs));
  const leases = new Map(readLeases().map((lease) => [lease.deviceId, lease]));
  const devices = listDevices().map((device) => ({
    ...device,
    lease: leases.get(device.id) ?? null,
    sessionId:
      sessions.find(
        (session) =>
          session.deviceId === device.id &&
          (session.status === "building" || session.status === "running")
      )?.id ?? null,
  }));
  const builds = listBuilds().toSorted((a, b) =>
    b.lastUsedAt.localeCompare(a.lastUsedAt)
  );
  return { builds, devices, generatedAt: new Date().toISOString(), sessions };
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

const handle = (request: Request) => {
  const url = new URL(request.url);
  if (url.pathname === "/") {
    return new Response(Bun.file(HTML_FILE), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
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
    why: "The dashboard serves /, /api/state, and /sessions/<id>/log|report.",
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
    fetch: (request) => {
      try {
        return handle(request);
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
