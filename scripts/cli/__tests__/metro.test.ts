import { afterEach, describe, expect, test } from "bun:test";
import { once } from "node:events";
import net from "node:net";
import { createRequire } from "node:module";

import { isPortFree, isPortInUseLog } from "../metro.ts";

const servers: net.Server[] = [];

const listen = async (host: string) => {
  const server = net.createServer();
  servers.push(server);
  server.listen({ host, port: 0 });
  await once(server, "listening");
  // SAFETY: a TCP server listening on a host reports an AddressInfo.
  return (server.address() as net.AddressInfo).port;
};

const close = async (server: net.Server | undefined) => {
  if (server?.listening === true) {
    server.close();
    await once(server, "close");
  }
};

afterEach(async () => {
  await Promise.all(servers.splice(0).map(close));
});

describe("Metro port check", () => {
  test("finds a server bound to 127.0.0.1 only", async () => {
    // Expo CLI's own check binds the wildcard address and misses this one.
    const port = await listen("127.0.0.1");
    expect(await isPortFree(port)).toBe(false);
  });

  test("passes a port after its server closed", async () => {
    const port = await listen("127.0.0.1");
    await close(servers.pop());
    expect(await isPortFree(port)).toBe(true);
  });
});

// Contract with @expo/cli: `bun start --port <port>` runs without a TTY. An
// explicit busy port must stop Expo, not roll over to the next free port.
describe("Expo CLI with explicit --port", () => {
  // SAFETY: @expo/cli 58 `build/src/utils/port.js` exports this function.
  const port = createRequire(import.meta.url)(
    "@expo/cli/build/src/utils/port.js"
  ) as {
    _resolvePortAsync: (
      projectRoot: string,
      options: { defaultPort: number; preferredPort: number }
    ) => Promise<number | null>;
  };

  test("fails with PORT_IN_USE when the port is busy", async () => {
    const busy = await listen("::");
    const ci = process.env.CI;
    // Non-interactive like `bun app dev`, where stdout is the Metro log.
    process.env.CI = "1";
    try {
      const resolved = port._resolvePortAsync("/nowhere", {
        defaultPort: busy,
        preferredPort: 8081,
      });
      await expect(resolved).rejects.toMatchObject({ code: "PORT_IN_USE" });
      await expect(resolved).rejects.toThrow(`Port ${busy} is unavailable`);
    } finally {
      if (ci === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = ci;
      }
    }
  });
});

describe("Metro log", () => {
  test("detects Expo's PORT_IN_USE refusal only", () => {
    expect(
      isPortInUseLog(
        "› Port 8090 is being used by another process\nCommandError: Port 8090 is unavailable and 'npx expo' is running in non-interactive mode"
      )
    ).toBe(true);
    expect(isPortInUseLog("Waiting on http://localhost:8090\n")).toBe(false);
  });
});
