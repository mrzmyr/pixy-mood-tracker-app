import { describe, expect, test } from "bun:test";
import { buildRows, findPhone, toToken } from "../target.ts";
import type { AgentPhone, TargetInput } from "../target.ts";

const iphone: AgentPhone = {
  platform: "ios",
  id: "IOS-DEVICE-01",
  name: "my-iphone-14",
  kind: "device",
  target: "mobile",
};
const ipad: AgentPhone = {
  platform: "ios",
  id: "IOS-DEVICE-02",
  name: "my-ipad",
  kind: "device",
  target: "mobile",
};
const android: AgentPhone = {
  platform: "android",
  id: "AAAA1111BB09YW",
  name: "Pixel 8",
  kind: "device",
  target: "mobile",
};
const readyIos = [
  {
    hardwareProperties: { udid: iphone.id },
    connectionProperties: { pairingState: "paired" },
    deviceProperties: { bootState: "booted", developerModeStatus: "enabled" },
  },
];
const base: TargetInput = {
  agentDevices: [],
  iosDevices: [],
  lockStates: {},
  adbStates: {},
  managed: [
    { platform: "ios", name: "pixy-mood-tracker", state: "not created" },
    { platform: "android", name: "pixy-mood-tracker", state: "not created" },
  ],
  repositoryRoot: "/repo",
};

describe("phone targets", () => {
  test("creates exact stable tokens", () => {
    expect(toToken("Pixel 8", "AAAA1111BB09YW")).toBe("pixel-8-09yw");
    expect(toToken("my-iphone-14", "IOS-DEVICE-01")).toBe("my-iphone-14-ce01");
    expect(toToken("Jörg's Phone!", "ABC-12")).toBe("j-rg-s-phone-bc12");
    expect(toToken("!!!", "XYZ98765")).toBe("phone-8765");
  });
  test("keeps managed rows when no phone is connected", () => {
    expect(buildRows(base).map((row) => row.state)).toEqual([
      "not created",
      "not created",
    ]);
  });
  test("marks reachable and unreachable iPhones", () => {
    const rows = buildRows({
      ...base,
      agentDevices: [iphone, ipad],
      iosDevices: [
        ...readyIos,
        {
          hardwareProperties: { udid: ipad.id },
          connectionProperties: { pairingState: "paired" },
          deviceProperties: { developerModeStatus: "enabled" },
        },
      ],
    });
    expect(rows.find((row) => row.id === iphone.id)?.state).toBe("ready");
    expect(rows.find((row) => row.id === ipad.id)?.problem).toContain(
      "Phone not reachable."
    );
  });
  test("reports iPhone trust, developer mode, and lock blockers", () => {
    expect(
      buildRows({
        ...base,
        agentDevices: [iphone],
        iosDevices: [
          {
            ...readyIos[0],
            connectionProperties: { pairingState: "unpaired" },
          },
        ],
      }).at(-1)?.problem
    ).toContain("does not trust this Mac");
    expect(
      buildRows({
        ...base,
        agentDevices: [iphone],
        iosDevices: [
          {
            ...readyIos[0],
            deviceProperties: {
              bootState: "booted",
              developerModeStatus: "disabled",
            },
          },
        ],
      }).at(-1)?.state
    ).toBe("blocked");
    expect(
      buildRows({
        ...base,
        agentDevices: [iphone],
        iosDevices: readyIos,
        lockStates: { [iphone.id]: true },
      }).at(-1)?.problem
    ).toBe("Phone locked. Unlock the phone.");
  });
  test("shows unauthorized adb phones without agent-device rows", () => {
    const row = buildRows({
      ...base,
      adbStates: { unauthorized: "unauthorized" },
    }).at(-1);
    expect(row).toMatchObject({
      option: "-",
      name: "unknown",
      state: "blocked",
    });
  });
  test("marks claimed phones and uses full IDs for token collisions", () => {
    const held = { ...android, claimedBy: { workspace: "/other" } };
    expect(
      buildRows({
        ...base,
        agentDevices: [held],
        adbStates: { [android.id]: "device" },
      }).at(-1)
    ).toMatchObject({ state: "in use", problem: "Held by /other." });
    const duplicate = { ...android, id: "OTHER-09YW" };
    expect(
      buildRows({
        ...base,
        agentDevices: [android, duplicate],
        adbStates: { [android.id]: "device", [duplicate.id]: "device" },
      })
        .slice(-2)
        .map((row) => row.option)
    ).toEqual([`--target=${android.id}`, `--target=${duplicate.id}`]);
  });
  test("excludes Mac host and filters platform", () => {
    // SAFETY: buildRows must filter non-mobile hosts despite wider runtime platform values.
    const mac = { ...iphone, platform: "macos", name: "Mac" } as AgentPhone;
    const rows = buildRows({
      ...base,
      agentDevices: [mac, iphone],
      iosDevices: readyIos,
    });
    expect(rows.map((row) => row.name)).not.toContain("Mac");
    expect(
      buildRows({
        ...base,
        agentDevices: [iphone],
        iosDevices: readyIos,
        platform: "android",
      }).every((row) => row.os === "android")
    ).toBe(true);
  });
  test("sorts ten phones after two managed devices", () => {
    const phones: AgentPhone[] = [];
    for (let index = 0; index < 10; index += 1) {
      phones.push({
        platform: index % 2 ? "android" : "ios",
        id: `ID000${index}`,
        name: `Phone ${index}`,
        kind: "device",
        target: "mobile",
      });
    }
    const iosDevices = phones
      .filter((phone) => phone.platform === "ios")
      .map((phone) => ({
        hardwareProperties: { udid: phone.id },
        connectionProperties: { pairingState: "paired" },
        deviceProperties: {
          bootState: "booted",
          developerModeStatus: "enabled",
        },
      }));
    const rows = buildRows({
      ...base,
      agentDevices: phones,
      iosDevices,
      adbStates: Object.fromEntries(
        phones
          .filter((phone) => phone.platform === "android")
          .map((phone) => [phone.id, "device"])
      ),
    });
    expect(rows).toHaveLength(12);
    expect(rows[0].kind).toBe("simulator");
    expect(rows[1].kind).toBe("emulator");
    expect(rows.slice(2).map((row) => row.os)).toEqual([
      "ios",
      "ios",
      "ios",
      "ios",
      "ios",
      "android",
      "android",
      "android",
      "android",
      "android",
    ]);
  });
  test("resolves token or full ID and reports ambiguous token", () => {
    expect(findPhone([android], "pixel-8-09yw")).toBe(android);
    expect(findPhone([android], android.id)).toBe(android);
    expect(() =>
      findPhone([android, { ...android, id: "OTHER-09YW" }], "pixel-8-09yw")
    ).toThrow("Target");
  });
});
