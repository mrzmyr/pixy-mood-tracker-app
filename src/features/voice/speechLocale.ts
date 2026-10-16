import * as Localization from "expo-localization";
import { getLanguage } from "@/lib/translation";

// Region with the widest dictation support per language, where it differs
// from the language code ("en" + "US", not "EN").
const MAIN_REGION = new Map([
  ["en", "US"],
  ["ar", "SA"],
  ["zh", "CN"],
  ["ja", "JP"],
  ["ko", "KR"],
  ["he", "IL"],
  ["hi", "IN"],
  ["ms", "MY"],
  ["sv", "SE"],
  ["da", "DK"],
  ["cs", "CZ"],
  ["el", "GR"],
  ["uk", "UA"],
  ["vi", "VN"],
  ["no", "NO"],
  ["pt", "PT"],
]);

/**
 * Recognizer locales to try, in order, for the app language.
 *
 * 1. App language with the region of a device locale of the same language
 *    ("de" + device "de-AT" = "de-AT")
 * 2. `null`: the system recognizer, which follows the Siri and Dictation
 *    language
 * 3. App language with its main region ("de-DE", "en-US")
 *
 * A region without an on-device model (for example "en-DE") fails with
 * `voice_on_device_unavailable`, so voice mode moves to the next locale.
 */
export const getSpeechLocales = (): (string | null)[] => {
  const language = getLanguage();
  const device = Localization.getLocales().find(
    (locale) => locale.languageCode === language
  );
  const main = `${language}-${MAIN_REGION.get(language) ?? language.toUpperCase()}`;
  const candidates = [device?.languageTag ?? main, null, main];
  return candidates.filter(
    (locale, index) => candidates.indexOf(locale) === index
  );
};
