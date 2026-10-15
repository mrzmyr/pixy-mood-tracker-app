import * as Localization from "expo-localization";
import { getLanguage } from "@/lib/translation";

/**
 * Recognizer locale for the app language. Takes the region from a device
 * locale of the same language ("de" + device "de-AT" = "de-AT"), because
 * iOS recognizers exist per region. Falls back to the bare language.
 */
export const getSpeechLocale = () => {
  const language = getLanguage();
  const device = Localization.getLocales().find(
    (locale) => locale.languageCode === language
  );
  return device?.languageTag ?? language;
};
