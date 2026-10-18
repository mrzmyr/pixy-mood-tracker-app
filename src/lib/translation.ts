import * as Localization from "expo-localization";
import { I18n } from "i18n-js";
import type { TranslateOptions } from "i18n-js";

import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import weekOfYear from "dayjs/plugin/weekOfYear";

import type en from "../../assets/locales/en.json";

type TranslationTable = Record<string, string>;

/**
 * Translation tables by language code. Each entry is a loader, so Metro only
 * evaluates the JSON module for languages the app uses.
 */
const translationLoaders = new Map<string, () => TranslationTable>([
  ["ar", () => require("../../assets/locales/ar.json")],
  ["zh", () => require("../../assets/locales/zh.json")],
  ["hr", () => require("../../assets/locales/hr.json")],
  ["cs", () => require("../../assets/locales/cs.json")],
  ["da", () => require("../../assets/locales/da.json")],
  ["nl", () => require("../../assets/locales/nl.json")],
  ["en", () => require("../../assets/locales/en.json")],
  ["fi", () => require("../../assets/locales/fi.json")],
  ["fr", () => require("../../assets/locales/fr.json")],
  ["de", () => require("../../assets/locales/de.json")],
  ["el", () => require("../../assets/locales/el.json")],
  ["he", () => require("../../assets/locales/he.json")],
  ["hi", () => require("../../assets/locales/hi.json")],
  ["hu", () => require("../../assets/locales/hu.json")],
  ["id", () => require("../../assets/locales/id.json")],
  ["it", () => require("../../assets/locales/it.json")],
  ["ja", () => require("../../assets/locales/ja.json")],
  ["ko", () => require("../../assets/locales/ko.json")],
  ["ms", () => require("../../assets/locales/ms.json")],
  // no.json is Norwegian Bokmål. iOS and Android report Bokmål as `nb`.
  ["nb", () => require("../../assets/locales/no.json")],
  ["nn", () => require("../../assets/locales/no.json")],
  ["pl", () => require("../../assets/locales/pl.json")],
  ["pt", () => require("../../assets/locales/pt.json")],
  ["ro", () => require("../../assets/locales/ro.json")],
  ["ru", () => require("../../assets/locales/ru.json")],
  ["sk", () => require("../../assets/locales/sk.json")],
  ["es", () => require("../../assets/locales/es.json")],
  ["sv", () => require("../../assets/locales/sv.json")],
  ["th", () => require("../../assets/locales/th.json")],
  ["tr", () => require("../../assets/locales/tr.json")],
  ["uk", () => require("../../assets/locales/uk.json")],
  ["vi", () => require("../../assets/locales/vi.json")],
]);

/**
 * Day.js locales by language code. Requiring a locale registers it in
 * `dayjs.Ls`, so each loader runs at most once per language.
 */
const dayjsLocaleLoaders = new Map<string, () => void>([
  ["ar", () => require("dayjs/locale/ar")],
  ["ca", () => require("dayjs/locale/ca")],
  ["zh", () => require("dayjs/locale/zh")],
  ["hr", () => require("dayjs/locale/hr")],
  ["cs", () => require("dayjs/locale/cs")],
  ["da", () => require("dayjs/locale/da")],
  ["nl", () => require("dayjs/locale/nl")],
  ["en", () => require("dayjs/locale/en")],
  ["fi", () => require("dayjs/locale/fi")],
  ["fr", () => require("dayjs/locale/fr")],
  ["de", () => require("dayjs/locale/de")],
  ["el", () => require("dayjs/locale/el")],
  ["he", () => require("dayjs/locale/he")],
  ["hi", () => require("dayjs/locale/hi")],
  ["hu", () => require("dayjs/locale/hu")],
  ["id", () => require("dayjs/locale/id")],
  ["it", () => require("dayjs/locale/it")],
  ["ja", () => require("dayjs/locale/ja")],
  ["ko", () => require("dayjs/locale/ko")],
  ["ms", () => require("dayjs/locale/ms")],
  ["nb", () => require("dayjs/locale/nb")],
  ["nn", () => require("dayjs/locale/nn")],
  ["pl", () => require("dayjs/locale/pl")],
  ["pt", () => require("dayjs/locale/pt")],
  ["ro", () => require("dayjs/locale/ro")],
  ["ru", () => require("dayjs/locale/ru")],
  ["sk", () => require("dayjs/locale/sk")],
  ["es", () => require("dayjs/locale/es")],
  ["sv", () => require("dayjs/locale/sv")],
  ["th", () => require("dayjs/locale/th")],
  ["tr", () => require("dayjs/locale/tr")],
  ["uk", () => require("dayjs/locale/uk")],
  ["vi", () => require("dayjs/locale/vi")],
]);

/** Language part of a locale tag (for example `de` for `de-DE`). */
const toLanguage = (locale: string) => locale.split("-")[0] ?? "en";

const storedLanguages = new Set<string>();

/**
 * Store the translation table for the language of `locale` once.
 *
 * Tables are keyed by language only, so i18n-js resolves `pt-BR` and
 * `zh-Hant-TW` to `pt` and `zh`. Other languages fall back to English.
 */
const storeTranslations = (instance: I18n, locale: string) => {
  const language = toLanguage(locale);
  const load = translationLoaders.get(language);
  if (!load || storedLanguages.has(language)) {
    return;
  }
  instance.store({ [language]: load() });
  storedLanguages.add(language);
};

/** i18n for `locale` (for example `de-DE`), falling back to English. */
const createI18n = (locale: string) => {
  const instance = new I18n();
  storeTranslations(instance, "en");
  storeTranslations(instance, locale);
  instance.locale = locale;
  instance.defaultLocale = "en";
  instance.enableFallback = true;
  return instance;
};

const deviceLocale = Localization.getLocales()[0]?.languageTag ?? "en";

const i18n = createI18n(deviceLocale);

/** App locale tag (for example `de-DE`). Follows the device or per-app language. */
export const getLocale = () => i18n.locale;
/** Language part of {@link getLocale} (for example `de`). */
export const getLanguage = () => toLanguage(i18n.locale);

let dayjsLanguage = "en";

/**
 * Set global dayjs to the app language and register its week locales.
 *
 * Immutable week locales keep cached dates valid when settings change,
 * without changing global dayjs.
 * https://day.js.org/docs/en/i18n/instance-locale
 */
const applyDayjsLanguage = () => {
  const language = getLanguage();
  const load = dayjsLocaleLoaders.get(language);
  dayjsLanguage = load ? language : "en";
  load?.();
  for (let weekStart = 0; weekStart < 7; weekStart += 1) {
    dayjs.locale(
      {
        ...dayjs.Ls[dayjsLanguage],
        name: `${dayjsLanguage}-week-${weekStart}`,
        weekStart,
      },
      undefined,
      true
    );
  }
  dayjs.locale(dayjsLanguage);
};

// Before first render.
applyDayjsLanguage();
dayjs.extend(weekOfYear);
dayjs.extend(localizedFormat);

/**
 * Switch translations and dayjs to `locale` (for example `de-DE`).
 *
 * iOS restarts the app after a language change in Settings. Android 13+
 * keeps the app running, so the root layout calls this again with the new
 * locale. Unsupported languages fall back to English.
 */
export const applyLocale = (locale: string) => {
  storeTranslations(i18n, locale);
  i18n.locale = locale;
  applyDayjsLanguage();
};

/**
 * Day.js uses Sunday=0. A missing browser calendar preference retains
 * the date locale's week start without mutating existing date instances.
 */
export const getWeekLocale = ({
  weekStart,
}: {
  weekStart: number | null;
}): string => {
  if (weekStart === null) {
    return dayjsLanguage;
  }
  return `${dayjsLanguage}-week-${weekStart}`;
};

/** Key in `assets/locales/en.json`. */
export type TranslationKey = keyof typeof en;

/** Translate `key` for the app locale, falling back to English. */
export const t = (key: TranslationKey, options?: TranslateOptions) =>
  i18n.t(key, options);

/**
 * Translate a key built at runtime, such as `` `log_emotion_${key}` ``.
 * Type-check cannot prove the key exists. Prefer {@link t} with a literal key.
 */
export const tDynamic = (key: string, options?: TranslateOptions) =>
  i18n.t(key, options);
