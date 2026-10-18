import { describe, expect, test } from "bun:test";
import {
  devClientUrl,
  devLinks,
  parseFlagOverrides,
  pickSeedVariant,
} from "../dev-client.ts";
import { CliError } from "../shared.ts";

const statusOf = (work: () => void) => {
  try {
    work();
  } catch (error) {
    return error instanceof CliError ? error.status : "not_cli_error";
  }
  return "no_error";
};

describe("dev links", () => {
  test("open fixture before flags, in passed order", () => {
    const flags = parseFlagOverrides("people=on,photos=off");
    expect(devLinks("pixy-dev", { fixture: "year", flags })).toEqual([
      "pixy-dev://dev/fixture?id=year",
      "pixy-dev://dev/feature-flag?key=people&value=on",
      "pixy-dev://dev/feature-flag?key=photos&value=off",
    ]);
  });

  test("open nothing without fixture and flags", () => {
    expect(devLinks("pixy-dev", { flags: parseFlagOverrides() })).toEqual([]);
  });

  test("reject unknown keys, bad values, and repeated keys", () => {
    for (const raw of [
      "nope=on",
      "people=yes",
      "people",
      "people=on=off",
      "people=on,people=off",
      "people=on,",
    ]) {
      expect(statusOf(() => parseFlagOverrides(raw))).toBe("invalid_flag");
    }
  });
});

describe("dev client launch URL", () => {
  test("load this Metro with dev menu onboarding, button, and launch menu off", () => {
    const url = new URL(devClientUrl("pixy-dev", "http://localhost:8090"));
    expect(url.protocol).toBe("pixy-dev:");
    expect(url.host).toBe("");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      __expo_disable_auto_launch: "1",
      __expo_disable_fab: "1",
      __expo_disable_onboarding: "1",
      __expo_url: "http://localhost:8090",
    });
  });
});

const pick = (
  variant: string | undefined,
  isPhone: boolean,
  isDevSessionRunning: boolean
) => pickSeedVariant({ variant, isPhone, isDevSessionRunning });

describe("seed variant", () => {
  test("follow this checkout's dev session unless --variant is passed", () => {
    expect(pick(undefined, false, true)).toBe("dev");
    expect(pick(undefined, false, false)).toBe("preview");
    expect(pick(undefined, true, true)).toBe("preview");
    expect(pick("preview", false, true)).toBe("preview");
    expect(pick("dev", false, false)).toBe("dev");
    expect(statusOf(() => pick("dev", true, true))).toBe("variant_unsupported");
  });
});
