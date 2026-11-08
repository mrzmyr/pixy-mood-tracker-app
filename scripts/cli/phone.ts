// Phones sit on a simlock fleet (https://github.com/callstackincubator/simlock).
// simlock leases a phone to one session at a time. agent-device drives it
// through simlock's agent-device proxy, so the CLI never runs devicectl or adb
// on a phone, and the phone does not need to be on this Mac.
import path from "node:path";

import { agentDevice, setPhoneSession } from "./agent-device.ts";
import type { Device } from "./device.ts";
import { CACHE_DIR, CliError, getCheckoutDir, note } from "./shared.ts";
import { toPhones } from "./target.ts";
import type { SimlockStatus } from "./target.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
// Own state dir: a proxy connection in agent-device's default state dir takes
// over every local simulator call on this Mac.
const PHONE_STATE_DIR = path.join(CACHE_DIR, "agent-device-phones");
const LEASE_TIMEOUT_MS = 180_000;
const INSTALL_TIMEOUT_MS = 600_000;

const getSimlock = () => {
  const url = process.env.SIMLOCK_URL?.replace(/\/+$/u, "");
  const token = process.env.SIMLOCK_TOKEN;
  if (!url || !token) {
    throw new CliError({
      status: "simlock_not_configured",
      message: "Phones need simlock",
      why: "SIMLOCK_URL or SIMLOCK_TOKEN is not set. Phones are leased from a simlock fleet.",
      fix: "Set SIMLOCK_URL and SIMLOCK_TOKEN (an agent token of your simlock gateway or daemon), then retry. See docs/development.md#phones.",
    });
  }
  return { url, token };
};

/** Read the phones of the simlock fleet. Does not lease. */
export const readPhones = async () => {
  const { url, token } = getSimlock();
  let response: Response;
  try {
    response = await fetch(`${url}/v1/status`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new CliError({
      status: "simlock_unreachable",
      message: `simlock at ${url} did not answer`,
      why: error instanceof Error ? error.message : String(error),
      fix: "Check SIMLOCK_URL and the network to the simlock gateway, then retry.",
    });
  }
  if (!response.ok) {
    const body = await response.text();
    throw new CliError({
      status: "simlock_request_failed",
      message: `simlock status answered ${response.status}`,
      why: body.slice(0, 300),
      fix: "Check SIMLOCK_TOKEN with `simlock whoami`, then retry.",
    });
  }
  // SAFETY: simlock's GET /v1/status returns devices, leases, and workers.
  return toPhones((await response.json()) as SimlockStatus);
};

const getSelector = (phone: Device) => [
  "--platform",
  phone.platform,
  phone.platform === "ios" ? "--udid" : "--serial",
  phone.id,
];

/** agent-device session and environment that reach the phone through simlock's proxy. */
export const getPhoneSession = (phone: Device) => ({
  session: `${phone.key}-${path.basename(getCheckoutDir(REPO_ROOT))}`,
  env: {
    AGENT_DEVICE_STATE_DIR: PHONE_STATE_DIR,
    AGENT_DEVICE_DAEMON_AUTH_TOKEN: getSimlock().token,
  },
});

/** Route later agent-device calls that select the phone through its proxy session. Does not lease. */
export const attachPhone = (phone: Device) => {
  setPhoneSession({ ...getPhoneSession(phone), id: phone.id });
};

/** End the phone session and give the lease back. simlock then removes apps installed during the lease. */
export const releasePhone = async (phone: Device) => {
  try {
    await agentDevice(["disconnect", ...getSelector(phone)]);
  } catch (error) {
    if (!(error instanceof CliError)) {
      throw error;
    }
    note(`note: ${phone.key} disconnect: ${error.message}`);
  }
};

/** Lease the phone for this checkout, or keep the lease it holds. */
export const leasePhone = async (phone: Device) => {
  const { url } = getSimlock();
  attachPhone(phone);
  const selector = getSelector(phone);
  const status = await agentDevice<{
    connected?: boolean;
    leaseAllocated?: boolean;
  }>(["connection", "status", ...selector]).catch(() => null);
  if (status?.connected && status.leaseAllocated) {
    return;
  }
  await agentDevice([
    "connect",
    "proxy",
    "--daemon-base-url",
    `${url}/v1/agent-device`,
    "--force",
    ...selector,
  ]);
  note(`Leasing ${phone.key} from simlock`);
  try {
    await agentDevice(
      [
        "open",
        "--physical",
        ...(phone.osVersion ? ["--os", phone.osVersion] : []),
        ...selector,
      ],
      { timeoutMs: LEASE_TIMEOUT_MS }
    );
  } catch (error) {
    await releasePhone(phone);
    throw error;
  }
};

/** Upload and install an app bundle on the leased phone. */
export const installPhoneApp = (phone: Device, appPath: string) =>
  agentDevice(["install", appPath, ...getSelector(phone)], {
    timeoutMs: INSTALL_TIMEOUT_MS,
  });

/** Open a link in an app on the leased iPhone. */
export const openIosPhoneLink = (
  phone: Device,
  bundleId: string,
  url: string,
  options: { terminateExisting?: boolean } = {}
) =>
  agentDevice([
    "open",
    bundleId,
    url,
    ...(options.terminateExisting ? ["--relaunch"] : []),
    ...getSelector(phone),
  ]);

/** Stop an app on the leased phone. The phone stays on. */
export const stopPhoneApp = (phone: Device, bundleId: string) =>
  agentDevice(["close", bundleId, ...getSelector(phone)]);
