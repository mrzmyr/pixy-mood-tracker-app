import { describe, expect, test } from "bun:test";
import {
  devLinks,
  mergeAndroidDevMenuPrefs,
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

describe("android dev menu preferences", () => {
  test("create file on first launch, then report no change", () => {
    const first = mergeAndroidDevMenuPrefs();
    expect(first.changed).toBe(true);
    expect(mergeAndroidDevMenuPrefs(first.xml)).toEqual({
      changed: false,
      xml: first.xml,
    });
  });

  test("replace only dev menu values and keep other entries", () => {
    const existing = [
      "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>",
      "<map>",
      '    <boolean name="showFab" value="true" />',
      '    <boolean name="motionGestureEnabled" value="false" />',
      '    <string name="lastBundle">http://localhost:8090</string>',
      "</map>",
      "",
    ].join("\n");
    const { changed, xml } = mergeAndroidDevMenuPrefs(existing);
    expect(changed).toBe(true);
    expect(xml).toContain('<boolean name="showFab" value="false" />');
    expect(xml).not.toContain('<boolean name="showFab" value="true" />');
    expect(xml).toContain(
      '<boolean name="motionGestureEnabled" value="false" />'
    );
    expect(xml).toContain(
      '<string name="lastBundle">http://localhost:8090</string>'
    );
    expect(xml.match(/name="showFab"/gu)).toHaveLength(1);
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
