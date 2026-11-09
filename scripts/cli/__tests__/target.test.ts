import { describe, expect, test } from "bun:test";
import { buildRows, findPhone, toPhones, toToken } from "../target.ts";
import type { Phone, SimlockStatus, TargetInput } from "../target.ts";

const iphone: Phone = {
  platform: "ios",
  id: "IOS-DEVICE-01",
  name: "iPhone 14 Pro",
  osVersion: "26.2",
  state: "ready",
  problem: "",
};
const android: Phone = {
  platform: "android",
  id: "AAAA1111BB09YW",
  name: "Pixel 8",
  osVersion: "37",
  state: "ready",
  problem: "",
};
const base: TargetInput = {
  phones: [],
  managed: [
    { platform: "ios", name: "pixy-mood-tracker", state: "not created" },
    { platform: "android", name: "pixy-mood-tracker", state: "not created" },
  ],
  repositoryRoot: "/repo",
};
const phoneDevice = (
  id: string,
  driverDeviceId: string,
  extra: Partial<NonNullable<SimlockStatus["devices"]>[number]> = {}
) => ({
  id,
  physical: true,
  state: "ready",
  driverDeviceId,
  workerId: "worker-1",
  presence: { present: true },
  spec: { platform: "android", model: "Pixel 8", osVersion: "37" },
  ...extra,
});

describe("simlock phones", () => {
  test("keeps only physical iOS and Android phones", () => {
    const phones = toPhones({
      devices: [
        phoneDevice("dev_1", "SERIAL-1"),
        { ...phoneDevice("dev_2", "SIM-1"), physical: false },
        { ...phoneDevice("dev_3", "SERIAL-3"), state: "deleted" },
        {
          ...phoneDevice("dev_4", "MAC-1"),
          spec: { platform: "macos", model: "Mac" },
        },
      ],
      workers: [{ id: "worker-1" }],
    });
    expect(phones.map((phone) => phone.id)).toEqual(["SERIAL-1"]);
    expect(phones[0]).toMatchObject({
      platform: "android",
      name: "Pixel 8",
      osVersion: "37",
      state: "ready",
    });
  });
  test("marks leased phones in use and unreachable or drained phones blocked", () => {
    const phones = toPhones({
      devices: [
        phoneDevice("dev_1", "LEASED"),
        phoneDevice("dev_2", "ABSENT", { presence: { present: false } }),
        phoneDevice("dev_3", "DRAINED", { workerId: "worker-2" }),
      ],
      leases: [{ deviceId: "dev_1" }],
      workers: [{ id: "worker-1" }, { id: "worker-2", drained: true }],
    });
    expect(phones.map((phone) => [phone.id, phone.state])).toEqual([
      ["LEASED", "in use"],
      ["ABSENT", "blocked"],
      ["DRAINED", "blocked"],
    ]);
  });
});

describe("phone targets", () => {
  test("creates exact stable tokens", () => {
    expect(toToken("Pixel 8", "AAAA1111BB09YW")).toBe("pixel-8-09yw");
    expect(toToken("my-iphone-14", "IOS-DEVICE-01")).toBe("my-iphone-14-ce01");
    expect(toToken("Jörg's Phone!", "ABC-12")).toBe("j-rg-s-phone-bc12");
    expect(toToken("!!!", "XYZ98765")).toBe("phone-8765");
  });
  test("keeps managed rows when simlock has no phone", () => {
    expect(buildRows(base).map((row) => row.state)).toEqual([
      "not created",
      "not created",
    ]);
  });
  test("shows phone state and uses full IDs for token collisions", () => {
    const busy: Phone = { ...android, state: "in use", problem: "Leased." };
    expect(buildRows({ ...base, phones: [busy] }).at(-1)).toMatchObject({
      option: "--target=pixel-8-09yw",
      name: "Pixel 8 (37)",
      state: "in use",
      problem: "Leased.",
    });
    const duplicate = { ...android, id: "OTHER-09YW" };
    expect(
      buildRows({ ...base, phones: [android, duplicate] })
        .slice(-2)
        .map((row) => row.option)
    ).toEqual([`--target=${android.id}`, `--target=${duplicate.id}`]);
  });
  test("filters platform and sorts iPhones before Android phones", () => {
    const rows = buildRows({ ...base, phones: [android, iphone] });
    expect(rows.map((row) => row.kind)).toEqual([
      "simulator",
      "emulator",
      "phone",
      "phone",
    ]);
    expect(rows.slice(2).map((row) => row.os)).toEqual(["ios", "android"]);
    expect(
      buildRows({ ...base, phones: [android, iphone], platform: "android" })
        .map((row) => row.os)
        .every((os) => os === "android")
    ).toBe(true);
  });
  test("resolves token or full ID and reports ambiguous token", () => {
    expect(findPhone([android], "pixel-8-09yw")).toBe(android);
    expect(findPhone([android], android.id)).toBe(android);
    expect(() =>
      findPhone([android, { ...android, id: "OTHER-09YW" }], "pixel-8-09yw")
    ).toThrow("Target");
  });
});
