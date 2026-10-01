import fs from "node:fs";
import path from "node:path";

import appJson from "../../../app.json";
import { createI18n } from "../translation";

const LOCALES_DIR = path.join(__dirname, "../../../assets/locales");

/** Locale file name to the iOS language code of its translation. */
const IOS_LANGUAGE_BY_FILE = new Map([["no", "nb"]]);

describe("translation", () => {
  it("declares every locale file as an iOS localization", () => {
    // SAFETY: app.json configures expo-localization with `supportedLocales.ios`.
    const plugin = appJson.expo.plugins.find(
      (entry) => Array.isArray(entry) && entry[0] === "expo-localization"
    ) as [string, { supportedLocales: { ios: string[] } }] | undefined;
    const declared = plugin?.[1].supportedLocales.ios ?? [];
    const declaredLanguages = declared.map((tag) => tag.split("-")[0]);
    const fileLanguages = fs
      .readdirSync(LOCALES_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""))
      .map((name) => IOS_LANGUAGE_BY_FILE.get(name) ?? name);

    expect([...declaredLanguages].sort()).toEqual([...fileLanguages].sort());
  });

  it("uses the Norwegian translation for a Norwegian Bokmål device", () => {
    expect(createI18n("nb-NO").t("save")).toBe("Lagre");
  });
});
