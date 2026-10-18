import dayjs from "dayjs";
import * as Localization from "expo-localization";

import { createStructuredError } from "@/lib/errors";
import type * as TranslationExports from "@/lib/translation";
import {
  applyLocale,
  getLanguage,
  getLocale,
  getWeekLocale,
  t,
} from "@/lib/translation";

describe("applyLocale", () => {
  afterEach(() => {
    applyLocale("en-US");
  });

  it("switches translations and dayjs without a restart", () => {
    applyLocale("en-US");
    expect(t("cancel")).toBe("Cancel");

    applyLocale("de-DE");

    expect(getLocale()).toBe("de-DE");
    expect(getLanguage()).toBe("de");
    expect(t("cancel")).toBe("Abbrechen");
    expect(dayjs.locale()).toBe("de");
    expect(
      dayjs("2026-10-05")
        .locale(getWeekLocale({ weekStart: 1 }))
        .format("MMMM")
    ).toBe("Oktober");
  });

  it("falls back to English for a language without translations", () => {
    applyLocale("xx-XX");

    expect(t("cancel")).toBe("Cancel");
    expect(dayjs.locale()).toBe("en");
    expect(getWeekLocale({ weekStart: 1 })).toBe("en-week-1");
  });
});

const LOCALES_DIR = "../../../assets/locales";
const LOCALE_FILES = [
  "ar",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "fi",
  "fr",
  "he",
  "hi",
  "hr",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "ms",
  "nl",
  "no",
  "pl",
  "pt",
  "ro",
  "ru",
  "sk",
  "sv",
  "th",
  "tr",
  "uk",
  "vi",
  "zh",
];

type TranslationModule = typeof TranslationExports;

/**
 * Start a fresh translation module on a device that reports `languageTag`.
 * Returns the module, the dayjs it configured, and the locale files it
 * evaluated, in order. `afterStart` runs inside the same module registry,
 * so locales loaded on demand register in the returned dayjs.
 */
const startWithDeviceLocale = (
  languageTag: string,
  {
    overrides = {},
    afterStart,
  }: {
    overrides?: Record<string, Record<string, string>>;
    afterStart?: (translation: TranslationModule) => void;
  } = {}
) => {
  const evaluated: string[] = [];
  let translation: TranslationModule | undefined;
  let deviceDayjs = dayjs;
  jest.isolateModules(() => {
    // oxlint-disable-next-line typescript/no-require-imports -- same registry as the module under test.
    const localization = require("expo-localization");
    jest
      .spyOn(localization, "getLocales")
      .mockReturnValue([{ ...Localization.getLocales()[0], languageTag }]);
    for (const file of LOCALE_FILES) {
      // oxlint-disable-next-line anti-slop/no-module-mocking -- which locale JSON modules evaluate at startup is the behavior under test.
      jest.doMock(`${LOCALES_DIR}/${file}.json`, () => {
        evaluated.push(file);
        return (
          overrides[file] ?? jest.requireActual(`${LOCALES_DIR}/${file}.json`)
        );
      });
    }
    // oxlint-disable-next-line typescript/no-require-imports -- fresh module instance per device locale.
    translation = require("@/lib/translation");
    // oxlint-disable-next-line typescript/no-require-imports -- the dayjs instance the module under test configures.
    deviceDayjs = require("dayjs");
    if (translation) {
      afterStart?.(translation);
    }
  });
  if (!translation) {
    throw createStructuredError({
      status: "test_setup_failed",
      message: "Translation module did not load",
      why: "jest.isolateModules ran without assigning the module",
      fix: "Check the require paths in startWithDeviceLocale",
    });
  }
  return { translation, dayjs: deviceDayjs, evaluated };
};

describe("device locale at startup", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    for (const file of LOCALE_FILES) {
      jest.dontMock(`${LOCALES_DIR}/${file}.json`);
    }
  });

  it("loads only English and the device language", () => {
    const { translation, evaluated } = startWithDeviceLocale("de-DE");

    expect(translation.t("cancel")).toBe("Abbrechen");
    expect(evaluated).toEqual(["en", "de"]);
  });

  it.each([
    ["pt-BR", "Cancelar", "pt", "pt"],
    ["zh-Hant-TW", "取消", "zh", "zh"],
    ["nb-NO", "Avbryt", "nb", "no"],
    ["nn-NO", "Avbryt", "nn", "no"],
  ])(
    "resolves %s to its language table",
    (tag, cancel, dayjsLocale, localeFile) => {
      const {
        translation,
        dayjs: deviceDayjs,
        evaluated,
      } = startWithDeviceLocale(tag);

      expect(translation.getLocale()).toBe(tag);
      expect(translation.t("cancel")).toBe(cancel);
      expect(deviceDayjs.locale()).toBe(dayjsLocale);
      expect(evaluated).toEqual(["en", localeFile]);
    }
  );

  it("falls back to English for an unsupported device language", () => {
    const {
      translation,
      dayjs: deviceDayjs,
      evaluated,
    } = startWithDeviceLocale("lt-LT");

    expect(translation.t("cancel")).toBe("Cancel");
    expect(deviceDayjs.locale()).toBe("en");
    expect(evaluated).toEqual(["en"]);
  });

  it("uses English for a key missing from the device language", () => {
    const { translation } = startWithDeviceLocale("de-DE", {
      overrides: { de: { cancel: "Abbrechen" } },
    });

    expect(translation.t("cancel")).toBe("Abbrechen");
    expect(translation.t("close")).toBe("Close");
  });

  it("loads a new language on demand when the locale changes", () => {
    const {
      translation,
      dayjs: deviceDayjs,
      evaluated,
    } = startWithDeviceLocale("en-US", {
      afterStart: (started) => started.applyLocale("fr-FR"),
    });

    expect(translation.t("cancel")).toBe(
      jest.requireActual(`${LOCALES_DIR}/fr.json`).cancel
    );
    expect(deviceDayjs.locale()).toBe("fr");
    expect(evaluated).toEqual(["en", "fr"]);
  });
});
